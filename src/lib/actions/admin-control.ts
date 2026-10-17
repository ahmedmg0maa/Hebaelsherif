'use server'

import { revalidatePath } from 'next/cache'
import { getServiceClient, hasSupabaseServerSecret } from '@/lib/supabase/server'
import { FRESH_ADMIN_ASSURANCE_ERROR, requireFreshAdminAssurance, requirePermission, type Permission } from '@/lib/auth/permissions'
import { parseCairoLocalDateTime } from '@/lib/booking/cairo-time'
import { catalogEditorPayload, type CatalogKind } from '@/lib/catalog/editor'
import { catalogMutationError, revalidateCatalogMutation } from '@/lib/catalog/mutation'
import { commerceEditorPayload, commerceMutationError, type CommerceEditorKind } from '@/lib/admin/commerce-editor'
import { catalogPublicationReadiness } from '@/lib/catalog/publication-readiness'
import {uploadSizeAllowed,uploadLimitLabel} from '@/lib/uploads/limits.mjs'

export type AdminActionResult = { ok: true; id?: string } | { ok: false; error: string }

async function requireAdminUser(permission: Permission) {
  if (!hasSupabaseServerSecret()) return null
  const context = await requirePermission(permission)
  return context?.userId ? { id: context.userId, role: context.role } : null
}

function message(error: { code?: string; message?: string } | null) {
  if (error?.code === '23505') return 'هذا الرابط أو السجل مستخدم بالفعل.'
  if (error?.code === '23503') return 'لا يمكن الحذف لأن السجل مرتبط بطلبات أو بيانات مستخدمات.'
  if (error?.code === '23P01') return 'الموعد يتعارض مع حجز قائم.'
  return error?.message ? `تعذّر الحفظ: ${error.message}` : 'تعذّر إتمام العملية الآن.'
}

async function audit(actorId: string, action: string, entityType: string, entityId: string, meta: object = {}) {
  await getServiceClient().from('audit_logs').insert({ actor_id: actorId, action, entity_type: entityType, entity_id: entityId, meta })
}

const text = (form: FormData, key: string) => String(form.get(key) ?? '').trim()
const number = (form: FormData, key: string, fallback = 0) => {
  const value = Number(form.get(key))
  return Number.isFinite(value) ? value : fallback
}
const optionalDate = (form: FormData, key: string) => {
  const raw = text(form, key)
  if (!raw) return null
  return parseCairoLocalDateTime(raw)?.toISOString() ?? null
}

export async function saveCatalogItem(kind: CatalogKind, id: string | null, form: FormData): Promise<AdminActionResult> {
  const admin = await requireAdminUser('catalog.manage')
  if (!admin) return { ok: false, error: 'هذه العملية تتطلب صلاحية إدارية.' }
  const parsed = catalogEditorPayload(kind, form)
  if (!parsed.ok) return parsed
  const payload = parsed.value
  const service = getServiceClient()
  if (payload.cover_asset_id) {
    const { data: asset, error } = await service.from('media_assets').select('path,bucket,visibility,kind,archived_at').eq('id', payload.cover_asset_id).maybeSingle()
    if (error || !asset || asset.archived_at || asset.bucket !== 'public-media' || asset.visibility !== 'public' || asset.kind !== 'image') return { ok: false, error: 'اختاري صورة عامة نشطة من المكتبة.' }
    payload.cover_url = service.storage.from('public-media').getPublicUrl(asset.path).data.publicUrl
  }
  if (payload.is_published) {
    const readiness = await catalogPublicationReadiness(kind, id, {
      title: String(payload.title), slug: String(payload.slug), subtitle: String(payload.subtitle), description: String(payload.description),
      price: Number(payload.price), currency: String(payload.currency), coverAssetId: String(payload.cover_asset_id ?? ''),
      durationMinutes: payload.duration_minutes == null ? undefined : Number(payload.duration_minutes),
      pagesCount: payload.pages_count == null ? null : Number(payload.pages_count),
      startsAt: typeof payload.starts_at === 'string' ? payload.starts_at : null, endsAt: typeof payload.ends_at === 'string' ? payload.ends_at : null,
      seatsTotal: Number(payload.seats_total ?? 0), locationKind: String(payload.location_kind ?? ''), locationText: String(payload.location_text ?? ''), bookingPaymentMode: String(payload.booking_payment_mode ?? ''),
    })
    if (!readiness.ready) return { ok: false, error: `لا يمكن النشر: ${readiness.issues.join(' ')}` }
  }
  const { data, error } = await service.rpc('manage_catalog_item', { p_actor_id: admin.id, p_kind: kind, p_id: id, p_action: 'save', p_content: payload })
  if (error || !data?.id) return { ok: false, error: catalogMutationError(error) }
  revalidateCatalogMutation(kind, data)
  return { ok: true, id: String(data.id) }
}

async function mutateCommerce(kind: CommerceEditorKind, id: string | null, action: 'save' | 'delete' | 'archive' | 'restore', form?: FormData, parentId: string | null = null): Promise<AdminActionResult> {
  const permission = kind === 'plan' ? 'packages.manage' : action === 'delete' ? 'catalog.delete' : 'catalog.manage'
  const admin = await requireAdminUser(permission)
  if (!admin) return { ok: false, error: 'لا تملكين صلاحية هذا الإجراء.' }
  const parsed = form ? commerceEditorPayload(kind, form) : { ok: true as const, value: {} as Record<string, unknown> }
  if (!parsed.ok) return parsed
  const service = getServiceClient(), payload = parsed.value
  if (kind === 'program' && payload.cover_asset_id) {
    const { data: asset, error } = await service.from('media_assets').select('path,bucket,visibility,kind,archived_at').eq('id', String(payload.cover_asset_id)).maybeSingle()
    if (error || !asset || asset.archived_at || asset.bucket !== 'public-media' || asset.visibility !== 'public' || asset.kind !== 'image') return { ok: false, error: 'اختاري صورة عامة نشطة من المكتبة.' }
    payload.cover_url = service.storage.from('public-media').getPublicUrl(asset.path).data.publicUrl
  }
  const { data, error } = await service.rpc('manage_commerce_record', { p_actor_id: admin.id, p_kind: kind, p_id: id, p_action: action, p_content: payload, p_parent_id: parentId })
  if (error || !data?.id) return { ok: false, error: commerceMutationError(error) }
  for (const path of ['/admin/products', '/admin/memberships', '/programs', '/services', '/booking', '/search', '/sitemap.xml', '/']) revalidatePath(path)
  revalidatePath('/checkout', 'layout')
  revalidatePath('/programs/[slug]', 'page')
  return { ok: true, id: String(data.id) }
}

export async function saveProductRecord(productId: string | null, form: FormData): Promise<AdminActionResult> {
  return mutateCommerce('program', productId, 'save', form)
}

export async function setProgramProductPublication(productId: string, publish: boolean): Promise<AdminActionResult> {
  const admin = await requireAdminUser('catalog.publish')
  if (!admin) return { ok: false, error: 'لا تملكين صلاحية نشر البرامج والباقات.' }
  const { error } = await getServiceClient().rpc('set_program_product_publication', { p_product_id: productId, p_publish: publish, p_actor_id: admin.id })
  if (error) return { ok: false, error: error.message.includes('program_product_not_ready') ? 'لا يمكن النشر: أكملي الوصف والسعر/العملة وحقوق الغلاف، ثم تكوين الحزمة المنشور أو باقة VIP المرتبطة والمتطابقة أو المورد المجاني المنشور.' : message(error) }
  revalidatePath('/admin/products'); revalidatePath('/programs'); revalidatePath('/search'); revalidatePath('/sitemap.xml'); revalidatePath('/')
  return { ok: true, id: productId }
}

export async function deleteProductRecord(productId: string): Promise<AdminActionResult> {
  return mutateCommerce('program', productId, 'delete')
}

export async function saveProductVariant(productId: string, variantId: string | null, form: FormData): Promise<AdminActionResult> {
  return mutateCommerce('variant', variantId, 'save', form, productId)
}

export async function deleteProductVariant(productId: string, variantId: string): Promise<AdminActionResult> {
  return mutateCommerce('variant', variantId, 'delete', undefined, productId)
}

export async function saveBundleChildren(bundleProductId: string, form: FormData): Promise<AdminActionResult> {
  const admin = await requireAdminUser('catalog.manage')
  if (!admin) return { ok: false, error: 'لا تملكين صلاحية إدارة الكتالوج.' }
  const children = [...new Set(form.getAll('children').map(String).filter((id) => id && id !== bundleProductId))].slice(0, 50)
  if (children.length === 0) return { ok: false, error: 'اختاري منتجًا واحدًا على الأقل داخل الحزمة.' }
  const { error } = await getServiceClient().rpc('set_program_bundle_children', { p_bundle_product_id: bundleProductId, p_child_ids: children, p_actor_id: admin.id })
  if (error) return { ok: false, error: error.message.includes('bundle_pending_orders') ? 'توجد طلبات لهذه الحزمة بانتظار الدفع أو المراجعة. عالجيها قبل تغيير محتوياتها.' : error.message.includes('published_bundle_not_ready') ? 'تعذّر التعديل: الحزمة المنشورة لا تقبل عنصرًا غير منشور أو غير جاهز.' : error.message.includes('invalid_bundle_child') ? 'الحزمة تقبل دورة أو كتابًا أو ورشة أو جلسة فقط، ولا تقبل حزمة متداخلة أو برنامج VIP.' : message(error) }
  revalidatePath('/admin/products'); revalidatePath('/programs'); revalidatePath('/search'); return { ok: true, id: bundleProductId }
}

export async function saveOperationalSettings(form: FormData): Promise<AdminActionResult> {
  const context = await requireFreshAdminAssurance('settings.manage')
  const admin = context?.userId ? { id: context.userId, role: context.role } : null
  if (!admin) return { ok: false, error: FRESH_ADMIN_ASSURANCE_ERROR }
  const expiryHours = Math.round(number(form, 'expiry_hours', 72))
  if (expiryHours < 1 || expiryHours > 168) return { ok: false, error: 'مهلة الطلب يجب أن تكون بين ساعة و168 ساعة.' }
  const bookingPolicy = {
    timezone: 'Africa/Cairo',
    slot_interval_minutes: Math.round(number(form, 'slot_interval', 30)),
    buffer_before_minutes: Math.round(number(form, 'buffer_before', 0)),
    buffer_after_minutes: Math.round(number(form, 'buffer_after', 0)),
    minimum_notice_minutes: Math.round(number(form, 'minimum_notice', 30)),
    booking_horizon_days: Math.round(number(form, 'horizon_days', 30)),
    max_bookings_per_day: Math.round(number(form, 'max_per_day', 20)),
    customer_cancel_notice_hours: Math.round(number(form, 'cancel_notice_hours', 24)),
  }
  if (bookingPolicy.slot_interval_minutes < 5 || bookingPolicy.slot_interval_minutes > 120 || bookingPolicy.buffer_before_minutes < 0 || bookingPolicy.buffer_before_minutes > 180 || bookingPolicy.buffer_after_minutes < 0 || bookingPolicy.buffer_after_minutes > 180 || bookingPolicy.minimum_notice_minutes < 0 || bookingPolicy.minimum_notice_minutes > 10080 || bookingPolicy.booking_horizon_days < 1 || bookingPolicy.booking_horizon_days > 30 || bookingPolicy.max_bookings_per_day < 1 || bookingPolicy.max_bookings_per_day > 100 || bookingPolicy.customer_cancel_notice_hours < 0 || bookingPolicy.customer_cancel_notice_hours > 720) return { ok: false, error: 'راجعي حدود سياسة المواعيد.' }
  const instapayHandle = text(form, 'instapay_handle')
  const instapayName = text(form, 'instapay_name')
  const walletNumber = text(form, 'wallet_number')
  const walletProvider = text(form, 'wallet_provider')
  const bankName = text(form, 'bank_name')
  const bankIban = text(form, 'bank_iban').replace(/\s+/g, '').toUpperCase()
  const bankOwner = text(form, 'bank_owner')
  const emailEnabled = form.get('email_enabled') === 'on'
  if (instapayHandle && (instapayHandle.length < 3 || !instapayName)) return { ok: false, error: 'أكملي عنوان InstaPay واسم صاحبة الحساب.' }
  if (walletNumber && (!/^\+?[0-9]{8,18}$/.test(walletNumber.replace(/[\s-]/g, '')) || !walletProvider)) return { ok: false, error: 'راجعي رقم المحفظة واسم مقدم الخدمة.' }
  if (bankIban && (!/^[A-Z]{2}[A-Z0-9]{13,32}$/.test(bankIban) || !bankName || !bankOwner)) return { ok: false, error: 'راجعي اسم البنك وIBAN واسم صاحبة الحساب.' }
  if (emailEnabled && (!process.env.RESEND_API_KEY?.trim() || !process.env.RESEND_FROM_EMAIL?.trim())) return { ok: false, error: 'أكملي اسمي إعدادات Resend في بيئة الاستضافة قبل تفعيل الإرسال.' }
  const { error } = await getServiceClient().rpc('save_operational_settings', {
    p_actor_id: admin.id,
    p_expiry_hours: expiryHours,
    p_booking_policy: bookingPolicy,
    p_instapay: instapayHandle ? { handle: instapayHandle, name: instapayName } : null,
    p_wallet: walletNumber ? { number: walletNumber, provider: walletProvider } : null,
    p_bank: bankIban ? { bank: bankName, iban: bankIban, name: bankOwner } : null,
    p_email_enabled: emailEnabled,
  })
  if (error) return { ok: false, error: error.code === 'PGRST202' ? 'يلزم تطبيق تحديث إعدادات التشغيل على Staging أولًا.' : message(error) }
  revalidatePath('/admin/settings'); revalidatePath('/checkout'); revalidatePath('/booking'); return { ok: true }
}

export async function deleteCatalogItem(kind: CatalogKind, id: string): Promise<AdminActionResult> {
  const admin = await requireAdminUser('catalog.delete')
  if (!admin) return { ok: false, error: 'هذه العملية تتطلب صلاحية إدارية.' }
  const { data, error } = await getServiceClient().rpc('manage_catalog_item', { p_actor_id: admin.id, p_kind: kind, p_id: id, p_action: 'delete', p_content: {} })
  if (error || !data?.id) return { ok: false, error: catalogMutationError(error) }
  revalidateCatalogMutation(kind, data)
  return { ok: true }
}

export async function saveSubscriptionPlan(id: string | null, form: FormData): Promise<AdminActionResult> {
  return mutateCommerce('plan', id, 'save', form)
}

export async function deleteSubscriptionPlan(id: string): Promise<AdminActionResult> {
  return mutateCommerce('plan', id, 'archive')
}

export async function restoreSubscriptionPlan(id: string): Promise<AdminActionResult> {
  return mutateCommerce('plan', id, 'restore')
}

export async function removeUnusedSubscriptionPlan(id: string): Promise<AdminActionResult> {
  return mutateCommerce('plan', id, 'delete')
}

export async function updateSubscriptionStatus(id: string, status: string): Promise<AdminActionResult> {
  const admin = await requireAdminUser('packages.manage')
  if (!admin) return { ok: false, error: 'هذه العملية تتطلب صلاحية إدارية.' }
  if (!['pending','active','paused','cancelled','expired'].includes(status)) return { ok: false, error: 'حالة غير صحيحة.' }
  const { error } = await getServiceClient().rpc('set_subscription_status', {
    p_subscription_id: id,
    p_status: status,
    p_actor_id: admin.id,
  })
  if (error) return { ok: false, error: message(error) }
  await audit(admin.id, `subscription.${status}`, 'subscription', id)
  revalidatePath('/admin/memberships')
  return { ok: true }
}

export async function createSubscription(form: FormData): Promise<AdminActionResult> {
  const admin = await requireAdminUser('packages.manage'); if (!admin) return { ok:false,error:'هذه العملية تتطلب صلاحية إدارية.' }
  const userId=text(form,'user_id'), planId=text(form,'plan_id'), status=text(form,'status')||'active'
  const service=getServiceClient(); const {data:plan}=await service.from('subscription_plans').select('duration_days').eq('id',planId).is('archived_at',null).maybeSingle()
  if(!userId||!plan)return{ok:false,error:'اختاري العميلة والباقة.'}
  const parsedStart = optionalDate(form, 'starts_at'), parsedEnd = optionalDate(form, 'ends_at')
  if ((text(form, 'starts_at') && !parsedStart) || (text(form, 'ends_at') && !parsedEnd))
    return { ok: false, error: 'راجعي موعد الاشتراك بتوقيت القاهرة.' }
  const starts = parsedStart ?? new Date().toISOString()
  const ends = parsedEnd ?? new Date(new Date(starts).getTime() + plan.duration_days * 86400000).toISOString()
  if (ends <= starts) return { ok: false, error: 'نهاية الاشتراك يجب أن تلي بدايته.' }
  const {data,error}=await service.rpc('create_managed_subscription',{p_user_id:userId,p_plan_id:planId,p_status:status,p_starts_at:starts,p_ends_at:ends,p_admin_notes:text(form,'admin_notes'),p_actor_id:admin.id})
  if(error||!data){if(error?.message.includes('plan_capacity_reached'))return{ok:false,error:'اكتملت سعة هذه الباقة ولا يمكن تفعيل اشتراك جديد.'};return{ok:false,error:message(error)}}
  await audit(admin.id,'subscription.created','subscription',String(data),{userId,planId,status});revalidatePath('/admin/memberships');return{ok:true,id:String(data)}
}

export async function adjustSubscriptionCredit(subscriptionId:string,delta:1|-1,reason:string):Promise<AdminActionResult>{
  const admin=await requireAdminUser('packages.manage');if(!admin)return{ok:false,error:'لا تملكين صلاحية إدارة الباقات.'}
  const cleanReason=reason.trim();if(cleanReason.length<2)return{ok:false,error:'اكتبي سبب الحركة.'}
  const{data,error}=await getServiceClient().rpc('adjust_subscription_credits',{p_subscription_id:subscriptionId,p_delta:delta,p_booking_id:null,p_reason:cleanReason,p_actor_id:admin.id,p_idempotency_key:`admin:${subscriptionId}:${crypto.randomUUID()}`})
  if(error){if(error.message.includes('credit_balance_out_of_range'))return{ok:false,error:'لا يمكن أن يصبح الرصيد سالبًا أو يتجاوز رصيد الباقة.'};if(error.message.includes('subscription_inactive'))return{ok:false,error:'الاشتراك غير نشط أو خارج فترة الصلاحية.'};return{ok:false,error:message(error)}}
  revalidatePath('/admin/memberships');return{ok:true,id:String(data?.ledger_id??subscriptionId)}
}

export async function deleteSubscription(id:string):Promise<AdminActionResult>{
  const admin=await requireAdminUser('packages.manage');if(!admin)return{ok:false,error:'هذه العملية تتطلب صلاحية إدارية.'}
  const{error}=await getServiceClient().from('subscriptions').update({status:'cancelled',cancelled_at:new Date().toISOString(),archived_at:new Date().toISOString()}).eq('id',id);if(error)return{ok:false,error:message(error)}
  await audit(admin.id,'subscription.archived','subscription',id);revalidatePath('/admin/memberships');return{ok:true}
}

export async function saveArticle(articleId: string, form: FormData): Promise<AdminActionResult> {
  const admin = await requireAdminUser('content.manage')
  if (!admin) return { ok: false, error: 'هذه العملية تتطلب صلاحية إدارية.' }
  const title = text(form, 'title')
  const slug = text(form, 'slug').toLowerCase()
  const excerpt=text(form,'excerpt'),content=text(form,'content'),coverUrl=text(form,'cover_url'),coverAssetId=text(form,'cover_asset_id'),seoTitle=text(form,'seo_title'),seoDescription=text(form,'seo_description')
  if(title.length<3||title.length>160||slug.length<3||slug.length>80||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||excerpt.length>500||content.length>100000||seoTitle.length>70||seoDescription.length>180||coverUrl.length>500||(coverUrl&&!/^https:\/\/[^\s]+$/i.test(coverUrl)))return{ok:false,error:'راجعي حدود العنوان والرابط والمحتوى وحقول SEO والغلاف.'}
  const {data,error}=await getServiceClient().rpc('manage_article',{p_actor_id:admin.id,p_action:'content_update',p_article_id:articleId,p_title:title,p_slug:slug,p_excerpt:excerpt,p_content:content,p_cover_url:coverUrl||null,p_cover_asset_id:coverAssetId||null,p_seo_title:seoTitle||null,p_seo_description:seoDescription||null,p_status:null,p_publish_at:null})
  if(error||!data?.id)return{ok:false,error:error?.message.includes('content_publish_required')?'تعديل مقال منشور أو مجدول يتطلب صلاحية النشر.':error?.message.includes('article_publication_incomplete')?'لا يمكن إبقاء المقال منشورًا بمحتوى ناقص أو غلاف غير موثق الحقوق.':'تعذّر حفظ المقال.'}
  revalidatePath('/admin/articles'); revalidatePath('/'); revalidatePath('/search'); revalidatePath('/sitemap.xml')
  if(typeof data.previousSlug==='string')revalidatePath(`/articles/${data.previousSlug}`)
  revalidatePath(`/articles/${slug}`)
  revalidatePath('/articles')
  return { ok: true, id: articleId }
}

export async function deleteArticle(articleId: string): Promise<AdminActionResult> {
  const admin = await requireAdminUser('content.delete')
  if (!admin) return { ok: false, error: 'هذه العملية تتطلب صلاحية إدارية.' }
  const {data,error}=await getServiceClient().rpc('manage_article',{p_actor_id:admin.id,p_action:'archive',p_article_id:articleId,p_title:null,p_slug:null,p_excerpt:null,p_content:null,p_cover_url:null,p_cover_asset_id:null,p_seo_title:null,p_seo_description:null,p_status:null,p_publish_at:null})
  if(error||!data?.id)return{ok:false,error:'تعذّر أرشفة المقال.'}
  revalidatePath('/admin/articles'); revalidatePath('/'); revalidatePath('/search'); revalidatePath('/sitemap.xml')
  revalidatePath('/articles')
  if(typeof data.articleSlug==='string')revalidatePath(`/articles/${data.articleSlug}`)
  return { ok: true }
}

export async function saveBookingAdmin(bookingId: string, form: FormData): Promise<AdminActionResult> {
  const admin = await requireAdminUser('bookings.manage')
  if (!admin) return { ok: false, error: 'هذه العملية تتطلب صلاحية إدارية.' }
  const startsAt = optionalDate(form, 'starts_at')
  const status = text(form, 'status')
  if (!startsAt || !['pending','confirmed','completed','cancelled','no_show'].includes(status))
    return { ok: false, error: 'راجعي الموعد والحالة.' }
  const service = getServiceClient()
  const { error } = await service.rpc('admin_update_booking_governed', {
    p_actor_id: admin.id,
    p_booking_id: bookingId,
    p_starts_at: startsAt,
    p_status: status,
    p_meeting_url: text(form, 'meeting_url'),
    p_admin_notes: text(form, 'admin_notes'),
  })
  if (error) {
    if (error.code === '23P01' || error.message.toLowerCase().includes('unavailable'))
      return { ok: false, error: 'الموعد الجديد غير متاح أو يتعارض مع فترة الفصل بين الجلسات.' }
    if (error.message.toLowerCase().includes('transition_invalid'))
      return { ok: false, error: 'هذا الانتقال بين حالات الحجز غير مسموح.' }
    return { ok: false, error: message(error) }
  }
  revalidatePath('/admin/bookings')
  revalidatePath('/dashboard/bookings')
  return { ok: true, id: bookingId }
}

export async function saveHomeCopy(_form: FormData): Promise<AdminActionResult> {
  void _form // Retired compatibility endpoint: never writes the legacy setting.
  const admin = await requireAdminUser('settings.manage')
  if (!admin) return { ok: false, error: 'هذه العملية تتطلب صلاحية إدارية.' }
  return { ok: false, error: 'انتقلت نصوص الواجهة إلى قسم الواجهة الرئيسية في إدارة الصفحات. استخدمي المحرر الجديد لحفظ النص والمراجعة معًا.' }
}

type MediaUploadInput = {
  bucket: string
  name: string
  type: string
  size: number
  title?: string
  alt?: string
  tags?: string
  caption?: string
  credit?: string
  rightsStatus?: string
  rightsReference?: string
  folder?: string
  focalX?: number
  focalY?: number
}

type ValidatedMediaUpload = {
  bucket: string
  name: string
  type: string
  size: number
  title: string
  alt: string
  tags: string[]
  caption: string
  credit: string
  rightsStatus: string
  rightsReference: string
  folder: string
  focalX: number
  focalY: number
  kind: 'image' | 'video' | 'audio' | 'document'
}

type MediaUploadStart = { bucket: string; path: string; token: string; uploadUrl:string }

function validateMediaUpload(input: MediaUploadInput): ValidatedMediaUpload | { error: string } {
  const bucket = input.bucket
  const allowed = ['public-media','course-videos','course-resources','protected-books','workshop-recordings']
  if (!allowed.includes(bucket)) return { error: 'المخزن غير مسموح.' }
  if (!input.name.trim() || !Number.isFinite(input.size) || input.size <= 0) return { error: 'اختاري ملفًا.' }
  if (!uploadSizeAllowed(bucket,input.size)) return { error: `اختاري ملفًا غير فارغ لا يتجاوز ${uploadLimitLabel(bucket)}.` }
  const allowedMime: Record<string, RegExp> = {
    'public-media': /^(image\/(jpeg|png|webp|gif|svg\+xml)|application\/pdf)$/,
    'course-videos': /^video\/(mp4|webm|quicktime)$/,
    'course-resources': /^(application\/(pdf|zip|vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet|presentationml\.presentation))|image\/(jpeg|png|webp))$/,
    'protected-books': /^application\/(pdf|epub\+zip)$/,
    'workshop-recordings': /^(video\/(mp4|webm|quicktime)|audio\/(mpeg|mp4|wav))$/,
  }
  if (!input.type || !allowedMime[bucket].test(input.type)) return { error: 'نوع الملف لا يناسب المخزن المحدد.' }
  const title = input.title?.trim() || input.name.replace(/\.[^.]+$/, '')
  const alt = input.alt?.trim() ?? ''
  if (bucket === 'public-media' && input.type.startsWith('image/') && alt.length < 3) return { error: 'اكتبي نصًا بديلًا واضحًا للصورة العامة.' }
  const rightsStatus = input.rightsStatus?.trim() || 'unverified'
  const rightsReference = (input.rightsReference ?? '').trim().slice(0, 500)
  if (!['unverified','owned','licensed','public_domain'].includes(rightsStatus)) return { error: 'حالة حقوق الاستخدام غير صحيحة.' }
  if (bucket === 'public-media' && input.type.startsWith('image/') && rightsStatus === 'unverified') return { error: 'حددي مصدر حقوق استخدام الصورة العامة قبل رفعها.' }
  if (bucket === 'public-media' && input.type.startsWith('image/') && !rightsReference) return { error: 'أضيفي مرجع ملكية أو ترخيص الصورة العامة.' }
  const tags = [...new Set((input.tags ?? '').split(',').map((tag) => tag.trim().toLowerCase()).filter(Boolean))].slice(0, 20)
  const folder = (input.folder?.trim() || 'uncategorized').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'uncategorized'
  const focalX = Math.min(100, Math.max(0, Number.isFinite(input.focalX) ? Number(input.focalX) : 50))
  const focalY = Math.min(100, Math.max(0, Number.isFinite(input.focalY) ? Number(input.focalY) : 50))
  const kind = input.type.startsWith('image/') ? 'image' : input.type.startsWith('video/') ? 'video' : input.type.startsWith('audio/') ? 'audio' : 'document'
  return {
    bucket, name: input.name.trim(), type: input.type, size: input.size, title, alt, tags, kind,
    caption: (input.caption ?? '').trim().slice(0, 500), credit: (input.credit ?? '').trim().slice(0, 200),
    rightsStatus, rightsReference, folder, focalX, focalY,
  }
}

export async function beginMediaUpload(input: MediaUploadInput): Promise<{ ok: true; data: MediaUploadStart } | { ok: false; error: string }> {
  const admin = await requireAdminUser('media.manage')
  if (!admin) return { ok: false, error: 'هذه العملية تتطلب صلاحية إدارية.' }
  const media = validateMediaUpload(input)
  if ('error' in media) return { ok: false, error: media.error }
  const safeName = media.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'asset'
  const path = `admin/${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}-${safeName}`
  const service = getServiceClient()
  const { data, error } = await service.storage.from(media.bucket).createSignedUploadUrl(path)
  if (error || !data) return { ok: false, error: message(error) }
  return { ok: true, data: { bucket: media.bucket, path, token: data.token,uploadUrl:data.signedUrl } }
}

export async function finalizeMediaUpload(input: MediaUploadInput & { path: string }): Promise<AdminActionResult> {
  const admin = await requireAdminUser('media.manage')
  if (!admin) return { ok: false, error: 'هذه العملية تتطلب صلاحية إدارية.' }
  const media = validateMediaUpload(input)
  if ('error' in media) return { ok: false, error: media.error }
  const safeName = media.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'asset'
  if (!new RegExp(`^admin/\\d{4}-\\d{2}-\\d{2}/[0-9a-f-]{36}-${safeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i').test(input.path)) return { ok: false, error: 'مسار الملف غير صحيح.' }
  const service = getServiceClient()
  const { data, error } = await service.rpc('admin_register_media',{p_actor:admin.id,p_data:{
    bucket: media.bucket, path: input.path, title: media.title, alt: media.alt, tags: media.tags, kind: media.kind, size_bytes: media.size, mime_type: media.type,
    original_name: media.name, visibility: media.bucket === 'public-media' ? 'public' : 'private', uploaded_by: admin.id,
    caption: media.caption, credit: media.credit, rights_status: media.rightsStatus, rights_reference: media.rightsReference, folder: media.folder,
    focal_x: media.focalX, focal_y: media.focalY, processing_status: 'original',
  }})
  if(error||typeof data!=='string')return {ok:false,error:'لم يتأكد تسجيل الملف. احتفظي بالمحاولة وأعيدي التحقق؛ لم يُحذف أي ملف.'}
  revalidatePath('/admin/media'); return { ok: true, id: data }
}

export async function updateMediaMetadata(id: string, form: FormData): Promise<AdminActionResult> {
  const admin = await requireAdminUser('media.manage')
  if (!admin) return { ok: false, error: 'هذه العملية تتطلب صلاحية إدارة الوسائط.' }
  const title = text(form, 'title')
  const alt = text(form, 'alt')
  const tags = [...new Set(text(form, 'tags').split(',').map((tag) => tag.trim().toLowerCase()).filter(Boolean))].slice(0, 20)
  const caption = text(form, 'caption').slice(0, 500)
  const credit = text(form, 'credit').slice(0, 200)
  const rightsStatus = text(form, 'rights_status')
  const rightsReference = text(form, 'rights_reference').slice(0, 500)
  const folder = (text(form, 'folder') || 'uncategorized').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'uncategorized'
  const focalX = Math.min(100, Math.max(0, number(form, 'focal_x', 50)))
  const focalY = Math.min(100, Math.max(0, number(form, 'focal_y', 50)))
  if (title.length < 2) return { ok: false, error: 'اسم الأصل مطلوب.' }
  if (!['unverified','owned','licensed','public_domain'].includes(rightsStatus)) return { ok: false, error: 'حالة حقوق الاستخدام غير صحيحة.' }
  const service = getServiceClient()
  const { data: previous } = await service.from('media_assets').select('id, bucket, kind, title, alt, tags, caption, credit, rights_status, rights_reference, folder, focal_x, focal_y, archived_at').eq('id', id).maybeSingle()
  if (!previous) return { ok: false, error: 'الملف غير موجود.' }
  if (previous.archived_at) return { ok: false, error: 'استعيدي الأصل من الأرشيف قبل تعديل بياناته.' }
  if (previous.bucket === 'public-media' && previous.kind === 'image' && alt.length < 3) return { ok: false, error: 'النص البديل مطلوب للصورة العامة.' }
  if (previous.bucket === 'public-media' && previous.kind === 'image' && rightsStatus === 'unverified') return { ok: false, error: 'الصورة العامة تتطلب حالة حقوق موثقة.' }
  if (previous.bucket === 'public-media' && previous.kind === 'image' && !rightsReference) return { ok: false, error: 'الصورة العامة تتطلب مرجع ملكية أو ترخيص.' }
  const next = { title, alt, tags, caption, credit, rights_status: rightsStatus, rights_reference: rightsReference, folder, focal_x: focalX, focal_y: focalY }
  const { error } = await service.from('media_assets').update(next).eq('id', id)
  if (error) return { ok: false, error: message(error) }
  const changedFields = Object.entries(next).filter(([key, value]) => value !== previous[key as keyof typeof previous]).map(([key]) => key)
  await audit(admin.id, 'media.metadata_updated', 'media_asset', id, { changedFields, rightsStatus, hasRightsReference: Boolean(rightsReference) })
  revalidatePath('/admin/media'); revalidatePath('/admin/pages'); revalidatePath('/')
  return { ok: true, id }
}

export async function manageMediaLifecycle(id: string, action: 'archive' | 'restore' | 'replace', replacementId?: string): Promise<AdminActionResult> {
  const admin = await requireAdminUser('media.manage')
  if (!admin) return { ok: false, error: 'هذه العملية تتطلب صلاحية إدارة الوسائط.' }
  const service = getServiceClient()
  let replacementUrl: string | null = null
  if (action === 'replace') {
    if (!replacementId) return { ok: false, error: 'اختاري الأصل البديل أولًا.' }
    const { data: replacement } = await service.from('media_assets').select('id, bucket, path, archived_at').eq('id', replacementId).maybeSingle()
    if (!replacement || replacement.archived_at) return { ok: false, error: 'الأصل البديل غير متاح.' }
    if (replacement.bucket === 'public-media') replacementUrl = service.storage.from(replacement.bucket).getPublicUrl(replacement.path).data.publicUrl
  }
  const { error } = await service.rpc('manage_media_asset_lifecycle', {
    p_asset_id: id,
    p_action: action,
    p_replacement_id: replacementId || null,
    p_replacement_url: replacementUrl,
    p_actor_id: admin.id,
  })
  if (error) {
    if (error.message.includes('media_in_use_requires_replacement')) return { ok: false, error: 'هذا الأصل مستخدم؛ اختاري بديلًا متوافقًا لينتقل كل استخدام بأمان.' }
    if (error.message.includes('media_replacement_incompatible')) return { ok: false, error: 'البديل يجب أن يطابق نوع الملف والمخزن وحالة الظهور.' }
    if (error.message.includes('replaced_media_cannot_restore')) return { ok: false, error: 'هذا الأصل استُبدل بالفعل؛ الأصل الجديد هو المرجع التشغيلي.' }
    return { ok: false, error: message(error) }
  }
  for (const path of ['/admin/media','/admin/pages','/','/courses','/books','/workshops','/articles','/press','/resources','/programs','/search']) revalidatePath(path)
  return { ok: true, id }
}

export async function changeCatalogLifecycle(kind:CatalogKind,id:string,action:'archive'|'restore',expectedArchivedAt:string|null):Promise<AdminActionResult> {
  const admin=await requireAdminUser('catalog.manage')
  if(!admin) return {ok:false,error:'هذه العملية تتطلب صلاحية إدارية.'}
  if(!['course','book','workshop','service'].includes(kind)||!['archive','restore'].includes(action)||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)||(expectedArchivedAt!==null&&(typeof expectedArchivedAt!=='string'||!Number.isFinite(Date.parse(expectedArchivedAt))))) return {ok:false,error:'مرجع السجل أو حالته غير صالح.'}
  const {data,error}=await getServiceClient().rpc('manage_catalog_lifecycle',{p_actor_id:admin.id,p_kind:kind,p_id:id,p_action:action,p_expected_archived_at:expectedArchivedAt})
  if(error||!data?.id) return {ok:false,error:catalogMutationError(error)}
  revalidateCatalogMutation(kind,data)
  return {ok:true,id:data.id}
}
