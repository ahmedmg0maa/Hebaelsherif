import { resolveHomeMedia } from './home-media'
import { defaultOwnerProfile, normalizeOwnerProfile, type OwnerProfile } from '@/lib/owner/profile'
import { getServerClient, getServiceClient, hasSupabaseServerSecret } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/auth/permissions'
import { hasSupabasePublicConfig } from '@/lib/supabase/public-key'
import { getBookingExperience, type BookingExperience } from './booking'
import { normalizePaymentSettings } from '@/lib/payments/settings'
import { defaultHomeSections, normalizeHomeSections, type HomeSection } from '@/lib/home/sections'
import { defaultHomeCopy, normalizeHomeCopy, type HomeCopy } from '@/lib/home/hero'
export { defaultHomeCopy, type HomeCopy } from '@/lib/home/hero'

const hasEnv = hasSupabasePublicConfig

export type FeatureFlags = Record<string, boolean>
export type MediaOption = { id: string; title: string; alt: string; kind: string; url: string }
export type PublicNavigationItem={menu:string;label:string;href:string;sort:number}

export type PublishedCmsPage = {
  seoTitle?:string|null
  seoDescription?:string|null
  canonicalUrl?:string|null
  ogImageUrl?:string|null
  title: string
  updatedAt: string
  legalVersion: string | null
  effectiveAt: string | null
  sections: { id: string; kind: string; sort: number; is_visible:boolean; content: unknown }[]
}

export async function getPublishedCmsPage(slug: string): Promise<PublishedCmsPage | null> {
  if (!hasEnv()) return null
  try {
    const supabase = await getServerClient()
    const { data } = await supabase.from('pages')
      .select('seo_title,seo_description,canonical_url,og_image_url,title, updated_at, legal_review_status, legal_version, effective_at, page_sections(id, kind, sort, is_visible, content)')
      .eq('slug', slug)
      .eq('status', 'published')
      .eq('is_published', true)
      .maybeSingle()
    if (!data) return null
    if (['privacy','terms','refund','disclaimer','session-policy'].includes(slug) && (data.legal_review_status !== 'approved' || !data.legal_version || !data.effective_at)) return null
    return {seoTitle:data.seo_title,seoDescription:data.seo_description,canonicalUrl:data.canonical_url,ogImageUrl:data.og_image_url, title: data.title, updatedAt: data.updated_at, legalVersion: data.legal_version, effectiveAt: data.effective_at, sections: [...(data.page_sections ?? [])].filter(section=>section.is_visible===true).sort((a, b) => a.sort - b.sort) }
  } catch { return null }
}

export async function getPublicNavigation():Promise<PublicNavigationItem[]>{if(!hasEnv())return[];try{const supabase=await getServerClient(),{data}=await supabase.from('navigation_items').select('menu,label,href,sort').eq('is_visible',true).order('sort',{ascending:true});return data??[]}catch{return[]}}

export async function getHomeCopy(): Promise<HomeCopy> {
  if (!hasEnv()) return defaultHomeCopy
  try {
    const supabase = await getServerClient()
    const { data } = await supabase.from('site_settings').select('value').eq('key', 'home_copy').maybeSingle()
    return normalizeHomeCopy(data?.value)
  } catch { return defaultHomeCopy }
}

export async function getPublishedHomeSections(): Promise<HomeSection[]> {
  if (!hasEnv()) return defaultHomeSections()
  try {
    const supabase = await getServerClient()
    const { data, error } = await supabase.from('pages')
      .select('page_sections(id,name,kind,sort,is_visible,content)')
      .eq('slug', 'home')
      .eq('status', 'published')
      .eq('is_published', true)
      .maybeSingle()
    if (error || !data) return defaultHomeSections()
    return resolveHomeMedia(normalizeHomeSections(data.page_sections ?? []))
  } catch { return defaultHomeSections() }
}
export { defaultOwnerProfile, type OwnerProfile } from '@/lib/owner/profile'
export async function getOwnerProfile(): Promise<OwnerProfile> {
  if (!hasEnv()) return defaultOwnerProfile
  try {
    const supabase = await getServerClient()
    const { data, error } = await supabase.from('site_settings').select('value').eq('key', 'owner_profile').eq('is_public', true).maybeSingle()
    if (error) return defaultOwnerProfile
    return normalizeOwnerProfile(data?.value)
  } catch { return defaultOwnerProfile }
}

const disabledFlags: FeatureFlags = { workshops: false, vip_program: false, certificates: false }
export type FeatureFlagSnapshot = { state: 'ready' | 'unconfigured' | 'unavailable'; flags: FeatureFlags }

export async function getFeatureFlagSnapshot(): Promise<FeatureFlagSnapshot> {
  if (!hasEnv()) return { state: 'unconfigured', flags: disabledFlags }
  try {
    const supabase = await getServerClient()
    const { data, error } = await supabase.from('feature_flags').select('key, is_enabled')
    if (error) return { state: 'unavailable', flags: disabledFlags }
    return { state: 'ready', flags: { ...disabledFlags, ...Object.fromEntries((data ?? []).map((flag) => [flag.key, flag.is_enabled])) } }
  } catch {
    return { state: 'unavailable', flags: disabledFlags }
  }
}

export async function getFeatureFlags(): Promise<FeatureFlags> {
  return (await getFeatureFlagSnapshot()).flags
}

export type AdminListResult<T> = { state: 'ready' | 'unconfigured' | 'unavailable'; rows: T[] }

export async function adminListResult<T>(
  table: string,
  columns: string,
  opts: { orderBy?: string; ascending?: boolean; limit?: number } = {},
): Promise<AdminListResult<T>> {
  if (!hasEnv()) return { state: 'unconfigured', rows: [] }
  try {
    const supabase = await getServerClient()
    let query = supabase.from(table).select(columns).limit(opts.limit ?? 100)
    if (opts.orderBy) query = query.order(opts.orderBy, { ascending: opts.ascending ?? false })
    const { data, error } = await query
    if (error) return { state: 'unavailable', rows: [] }
    return { state: 'ready', rows: (data ?? []) as T[] }
  } catch {
    return { state: 'unavailable', rows: [] }
  }
}

// Generic guarded list fetch for Admin pages. In a configured environment a
// failed query throws a sanitized boundary error instead of becoming fake emptiness.
export async function adminList<T>(
  table: string,
  columns: string,
  opts: { orderBy?: string; ascending?: boolean; limit?: number } = {},
): Promise<T[]> {
  const result = await adminListResult<T>(table, columns, opts)
  if (result.state === 'unavailable') throw new Error('ADMIN_DATA_READ_UNAVAILABLE')
  return result.rows
}

export async function getPublicMediaOptions(limit = 80, verifiedOnly = false): Promise<MediaOption[]> {
  if (!hasEnv()) return []
  try {
    const supabase = await getServerClient()
    let query = supabase.from('media_assets')
      .select('id, title, alt, kind, bucket, path')
      .eq('visibility', 'public')
      .eq('bucket', 'public-media')
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (verifiedOnly) query = query.eq('kind', 'image').in('rights_status', ['owned', 'licensed', 'public_domain']).neq('rights_reference', '')
    const { data, error } = await query
    if (error) throw new Error('ADMIN_PUBLIC_MEDIA_OPTIONS_UNAVAILABLE')
    return (data ?? []).map((asset) => ({
      id: asset.id,
      title: asset.title || asset.alt || asset.path.split('/').at(-1) || 'وسيط',
      alt: asset.alt,
      kind: asset.kind,
      url: supabase.storage.from(asset.bucket).getPublicUrl(asset.path).data.publicUrl,
    }))
  } catch { throw new Error('ADMIN_PUBLIC_MEDIA_OPTIONS_READ_UNAVAILABLE') }
}

export type ContentReadinessStatus = 'ready' | 'needs-content' | 'blocked' | 'unconfigured' | 'unknown'
export type LaunchReadinessLevel = 'ready' | 'warning' | 'blocker'

export type ContentReadinessItem = {
  id: string
  title: string
  detail: string
  status: ContentReadinessStatus
  href: string
}

export function launchLevelForStatus(status: ContentReadinessStatus): LaunchReadinessLevel {
  if (status === 'ready') return 'ready'
  if (status === 'needs-content') return 'warning'
  return 'blocker'
}

type CountResult = { count: number | null; error: { message: string } | null }

function readinessForCount(
  id: string,
  title: string,
  count: CountResult,
  href: string,
  readyDetail: (count: number) => string,
  missingDetail: string,
): ContentReadinessItem {
  if (count.error) return { id, title, detail: 'تعذّر التحقق من هذا المصدر؛ راجعي الصلاحيات والترحيلات بعد ربط مشروع الإنتاج الصحيح.', status: 'unknown', href }
  if ((count.count ?? 0) > 0) return { id, title, detail: readyDetail(count.count ?? 0), status: 'ready', href }
  return { id, title, detail: missingDetail, status: 'needs-content', href }
}

async function readLaunchContract() {
  try {
    if (!hasSupabaseServerSecret() || !await requirePermission('system.view')) return { data: null, error: { message: 'RUNTIME_READ_NOT_AUTHORIZED' } }
    // This RPC is service-role-only; read it only for a permissioned admin.
    return await getServiceClient().rpc('launch_runtime_contract')
  } catch { return { data: null, error: { message: 'RUNTIME_READ_UNAVAILABLE' } } }
}

// This checklist only reads the configured database. It deliberately reports
// "unconfigured" rather than inferring readiness from local fallback copy.
export async function getContentReadiness(booking?: BookingExperience): Promise<ContentReadinessItem[]> {
  if (!hasEnv()) {
    return [
      { id: 'connection', title: 'اتصال مصدر الحقيقة', detail: 'لم تُهيأ متغيرات Supabase العامة في هذه البيئة؛ لا يمكن قياس جاهزية المحتوى.', status: 'unconfigured', href: '/admin/system' },
      { id: 'catalog', title: 'منتجات منشورة', detail: 'تُفحص بعد ربط مشروع الإنتاج الصحيح؛ لا توجد بيانات بديلة محلية.', status: 'unconfigured', href: '/admin/products' },
      { id: 'booking', title: 'خدمات ومواعيد منشورة', detail: 'تُفحص بعد ربط مشروع الإنتاج الصحيح؛ لا توجد مواعيد افتراضية.', status: 'unconfigured', href: '/admin/bookings' },
      { id: 'payments', title: 'وسيلة دفع مفعّلة', detail: 'تُفحص بعد ربط مشروع الإنتاج الصحيح؛ الدفع المدفوع يحتاج بيانات تحويل معتمدة.', status: 'unconfigured', href: '/admin/settings' },
      { id: 'articles', title: 'مقال منشور', detail: 'تُفحص بعد ربط مشروع الإنتاج الصحيح.', status: 'unconfigured', href: '/admin/articles' },
      { id: 'legal', title: 'سياسات قانونية معتمدة', detail: 'تتطلب اعتماد المالكة ومراجعة قانونية؛ النصوص الحالية مسودات غير منشورة.', status: 'blocked', href: '/admin/pages' },
      { id: 'database-change', title: 'عقد تشغيل النسخة 102', detail: 'يلزم فحص عقد التشغيل الحالي في قاعدة البيانات المتصلة. لا تحدد هذه الصفحة آخر ترحيل مطبق من المحادثات القديمة.', status: 'unconfigured', href: '/admin/system' },
      { id: 'recovery', title: 'نسخة احتياطية وخطة رجوع مجرّبة', detail: 'لا توجد نقطة استعادة موثقة ولا تجربة رجوع على staging.', status: 'blocked', href: '/admin/system' },
      { id: 'auth-redirects', title: 'تأكيد البريد والاستعادة', detail: 'يلزم تجربة رسائل الحساب وعناوين العودة على النطاق الفعلي؛ لا تثبت التهيئة وحدها وصول البريد.', status: 'unknown', href: '/admin/settings' },
    ]
  }

  try {
    const supabase = await getServerClient()
    const [products, articles, paymentRows, approvedLegal, runtime, experience] = await Promise.all([
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_published', true),
      supabase.from('articles').select('id', { count: 'exact', head: true }).eq('is_published', true).eq('status', 'published'),
      supabase.from('site_settings').select('key, value').in('key', ['payment_instapay', 'payment_wallet', 'payment_bank']),
      supabase.from('pages').select('slug', { count: 'exact', head: true }).in('slug', ['privacy','terms','refund','disclaimer','session-policy']).eq('status', 'published').eq('is_published', true).eq('legal_review_status', 'approved').not('legal_version', 'is', null).not('effective_at', 'is', null),
      readLaunchContract(),
      booking ? Promise.resolve(booking) : getBookingExperience(),
    ])

    const paymentError = paymentRows.error
    const paymentValues = normalizePaymentSettings(Object.fromEntries((paymentRows.data ?? []).map((row) => [row.key, row.value])))
    const paymentReady = Boolean(paymentValues.instapay || paymentValues.wallet || paymentValues.bank)
    const connectionRead = !products.error && !articles.error && !paymentRows.error && !approvedLegal.error
    const slots = experience.services.reduce((total, service) => total + Object.values(service.availableSlots).reduce((sum, times) => sum + times.length, 0), 0)
    const runtimeCurrent = runtime.data?.revision === '102' && runtime.data?.freeOperations === '102' && runtime.data?.calendar === '097' && runtime.data?.owner === '096'

    return [
      { id: 'connection', title: 'قراءة مصادر المحتوى', detail: connectionRead ? 'نجحت استعلامات المحتوى والدفع والسياسات في هذا الطلب. هذه قراءة فعلية وليست حكمًا على تجربة الشراء.' : 'تعذر واحد أو أكثر من استعلامات المحتوى والدفع والسياسات؛ وجود إعدادات الاتصال لا يثبت نجاحها.', status: connectionRead ? 'ready' : 'unknown', href: '/admin/system' },
      readinessForCount('catalog', 'منتجات منشورة', products, '/admin/products', (count) => `${count.toLocaleString('ar-EG')} منتجًا منشورًا يمكن للواجهة العامة قراءته.`, 'انشري منتجًا حقيقيًا واحدًا على الأقل قبل فتح الشراء.'),
      experience.runtime.status === 'ready' && slots > 0
        ? { id: 'booking', title: 'خدمات ذات مواعيد قابلة للاختيار', detail: `${experience.services.length.toLocaleString('ar-EG')} خدمة منشورة لديها مواعيد متاحة في التقويم الحالي. يُعاد التحقق عند تثبيت الحجز.`, status: 'ready', href: '/admin/bookings' }
        : { id: 'booking', title: 'خدمات ذات مواعيد قابلة للاختيار', detail: experience.runtime.status === 'ready' ? 'لا توجد خدمة منشورة بموعد متاح حاليًا. راجعي النشر والتوافر والاستثناءات ونافذة الحجز.' : experience.runtime.detail, status: experience.runtime.status === 'migration-required' || experience.runtime.status === 'ready' ? 'blocked' : 'unknown', href: '/admin/bookings' },
      paymentError
        ? { id: 'payments', title: 'وسيلة دفع مفعّلة', detail: 'تعذّر التحقق من إعدادات الدفع؛ راجعي الصلاحيات والترحيلات.', status: 'unknown', href: '/admin/settings' }
        : paymentReady
          ? { id: 'payments', title: 'وسيلة دفع مفعّلة', detail: 'توجد وسيلة دفع مفعّلة واحدة على الأقل؛ لا تعرض هذه القائمة أي بيانات حساب.', status: 'ready', href: '/admin/settings' }
          : { id: 'payments', title: 'وسيلة دفع مفعّلة', detail: 'الدفع غير متاح حتى إضافة بيانات التحويل. يظل المحتوى المجاني وطلب الموعد للمراجعة متاحين عند نشرهما وتفعيلهما.', status: 'needs-content', href: '/admin/settings' },
      readinessForCount('articles', 'مقال منشور', articles, '/admin/articles', (count) => `${count.toLocaleString('ar-EG')} مقالًا منشورًا ظاهرًا في الكتالوج العام.`, 'انشري مقالًا أو اتركي قسم المقالات فارغًا بوضوح.'),
      approvedLegal.error
        ? { id: 'legal', title: 'سياسات قانونية معتمدة', detail: 'تعذّر التحقق من حالة السياسات؛ لا تُعامل كمعتمدة.', status: 'unknown', href: '/admin/pages' }
        : approvedLegal.count === 5
          ? { id: 'legal', title: 'سياسات قانونية معتمدة', detail: 'الخصوصية والشروط والاسترداد وإخلاء المسؤولية وسياسة الجلسة منشورة بإصدار وتاريخ سريان معتمدين.', status: 'ready', href: '/admin/pages' }
          : { id: 'legal', title: 'سياسات قانونية معتمدة', detail: `${(approvedLegal.count ?? 0).toLocaleString('ar-EG')} من ٥ سياسات فقط مستوفية للاعتماد والإصدار وتاريخ السريان.`, status: 'blocked', href: '/admin/pages' },
      { id: 'database-change', title: 'عقد تشغيل النسخة 102', detail: runtime.error ? 'تعذر قراءة عقد التشغيل. تحققي من الاتصال والصلاحيات والترحيلات الناقصة.' : runtimeCurrent ? 'عقد 102 الحالي قابل للقراءة. لا يثبت وحده سلامة التاريخ الكامل أو تجربة الاستعادة.' : 'عقد التشغيل لا يطابق هذه النسخة. قارني سجل الترحيلات وطبقي الناقص فقط حتى 102 بعد التجربة.', status: runtime.error ? 'unknown' : runtimeCurrent ? 'ready' : 'blocked', href: '/admin/system' },
      { id: 'recovery', title: 'نسخة احتياطية وخطة رجوع مجرّبة', detail: 'تجربة استعادة البيانات والملفات تحتاج دليلًا خارجيًا حديثًا. لا تقيسها هذه الصفحة تلقائيًا.', status: 'unknown', href: '/admin/system' },
      { id: 'auth-redirects', title: 'تأكيد البريد والاستعادة', detail: 'يلزم تأكيد حساب واستعادة كلمة المرور على النطاق الفعلي، ببريد خارج فريق المشروع. لا تقيسها هذه الصفحة تلقائيًا.', status: 'unknown', href: '/admin/settings' },
    ]
  } catch {
    return [{ id: 'connection', title: 'اتصال مصدر الحقيقة', detail: 'تعذّر الوصول إلى مصدر البيانات؛ لم يُفترض أن النظام جاهز.', status: 'unknown', href: '/admin/system' }]
  }
}
