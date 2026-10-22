import 'server-only'
import { getServiceClient } from '@/lib/supabase/server'

export type CatalogPublicationKind = 'course' | 'book' | 'workshop' | 'service'
export type CatalogPublicationCandidate = {
  title?: string
  slug?: string
  subtitle?: string
  description?: string
  price?: number
  currency?: string
  coverAssetId?: string
  durationMinutes?: number
  pagesCount?: number | null
  startsAt?: string | null
  endsAt?: string | null
  seatsTotal?: number
  locationKind?: string
  locationText?: string
  bookingPaymentMode?: string
}

const tableFor: Record<CatalogPublicationKind, string> = { course: 'courses', book: 'books', workshop: 'workshops', service: 'services' }

export async function catalogPublicationReadiness(kind: CatalogPublicationKind, id: string | null, candidate: CatalogPublicationCandidate = {}) {
  if (!id) return { ready: false, issues: ['احفظي العنصر كمسودة أولًا، ثم أكملي محتواه وملفاته وانشريه من سجل الإدارة.'] }
  const service = getServiceClient()
  const { data: domain, error: domainError } = await service.from(tableFor[kind]).select('*').eq('id', id).maybeSingle()
  if (domainError || !domain) return { ready: false, issues: ['تعذّر التحقق من سجل العنصر.'] }
  const { data: product, error: productError } = await service.from('products').select('*').eq('id', domain.product_id).maybeSingle()
  if (productError || !product) return { ready: false, issues: ['المنتج المالي المرتبط غير موجود.'] }

  const value = <T>(key: keyof CatalogPublicationCandidate, fallback: T) => candidate[key] === undefined ? fallback : candidate[key] as T
  const title = String(value('title', domain.title ?? product.title ?? '')).trim()
  const slug = String(value('slug', domain.slug ?? product.slug ?? '')).trim()
  const subtitle = String(value('subtitle', product.subtitle ?? '')).trim()
  const description = String(value('description', domain.description ?? product.description ?? '')).trim()
  const price = Number(value('price', product.price ?? domain.price ?? -1))
  const currency = String(value('currency', product.currency ?? '')).trim().toUpperCase()
  const issues: string[] = []

  if (title.length < 3) issues.push('العنوان غير مكتمل.')
  if (!/^[a-z0-9-]{3,80}$/.test(slug)) issues.push('الرابط المختصر غير صالح.')
  if (subtitle.length < 3) issues.push('أضيفي عنوانًا فرعيًا واضحًا.')
  if (description.length < 24) issues.push('أضيفي وصفًا واقعيًا لا يقل عن 24 حرفًا.')
  if (!Number.isFinite(price) || price < 0) issues.push('السعر غير صالح.')
  if (!/^[A-Z]{3}$/.test(currency)) issues.push('العملة يجب أن تكون رمزًا من ثلاثة أحرف مثل EGP.')

  let coverAssetId = String(value('coverAssetId', '')).trim()
  if (!coverAssetId) {
    const { data: usages } = await service.from('media_usages').select('asset_id').eq('entity_type', kind).eq('entity_id', id).eq('field', 'cover_url').limit(1)
    coverAssetId = String(usages?.[0]?.asset_id ?? '')
  }
  if (!coverAssetId) issues.push('اختاري غلافًا من مكتبة الوسائط بدل رابط خارجي غير موثق.')
  else {
    const { data: asset, error } = await service.from('media_assets').select('id,bucket,visibility,rights_status,rights_reference,processing_status,archived_at').eq('id', coverAssetId).maybeSingle()
    if (error) issues.push('لا يمكن التحقق من حقوق الوسيط ودورة حياته قبل قبول migration 046 و054 على Staging.')
    else if (!asset || asset.archived_at || asset.bucket !== 'public-media' || asset.visibility !== 'public') issues.push('الغلاف ليس وسيطًا عامًا نشطًا صالحًا للنشر.')
    else if (!['original', 'ready'].includes(asset.processing_status)) issues.push('معالجة الغلاف لم تكتمل بنجاح.')
    else if (!['owned', 'licensed', 'public_domain'].includes(asset.rights_status) || !String(asset.rights_reference ?? '').trim()) issues.push('حقوق الغلاف أو مرجعها غير معتمدين.')
  }

  if (kind === 'course') {
    const duration = Number(value('durationMinutes', domain.duration_minutes ?? 0))
    if (duration < 15) issues.push('مدة الدورة يجب أن تكون 15 دقيقة على الأقل.')
    const { data: modules, error } = await service.from('course_modules').select('id,title,course_lessons(id,title,description,video_path)').eq('course_id', id)
    const lessons = (modules ?? []).flatMap((module) => module.course_lessons ?? [])
    if (error || !modules?.length || !lessons.length) issues.push('أكملي وحدة واحدة ودرسًا واحدًا على الأقل قبل النشر.')
    else if (lessons.some((lesson) => !lesson.video_path && String(lesson.description ?? '').trim().length < 24)) issues.push('كل درس يحتاج فيديو محميًا أو محتوى نصيًا فعليًا قبل النشر.')
  }
  if (kind === 'book') {
    const pages = Number(value('pagesCount', domain.pages_count ?? 0))
    if (!Number.isInteger(pages) || pages < 1) issues.push('حددي عدد صفحات صحيحًا.')
    const { count, error } = await service.from('book_files').select('id', { count: 'exact', head: true }).eq('book_id', id).is('archived_at', null)
    if (error || !count) issues.push('ارفعي إصدار PDF أو EPUB محميًا قبل النشر.')
  }
  if (kind === 'workshop') {
    const startsAt = new Date(String(value('startsAt', domain.starts_at ?? '')))
    const endsAt = new Date(String(value('endsAt', domain.ends_at ?? '')))
    const seats = Number(value('seatsTotal', domain.seats_total ?? 0))
    const locationKind = String(value('locationKind', domain.location_kind ?? ''))
    const locationText = String(value('locationText', domain.location_text ?? '')).trim()
    if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() <= Date.now()) issues.push('موعد الورشة يجب أن يكون قادمًا عند النشر.')
    if (Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) issues.push('نهاية الورشة يجب أن تلي بدايتها.')
    if (!Number.isInteger(seats) || seats < 1) issues.push('حددي سعة مقاعد موجبة.')
    if (!['online', 'in_person', 'hybrid'].includes(locationKind)) issues.push('نوع المكان غير صالح.')
    if (locationKind !== 'online' && locationText.length < 3) issues.push('أضيفي وصف المكان للحضور.')
  }
  if (kind === 'service') {
    const duration = Number(value('durationMinutes', domain.duration_minutes ?? 0))
    const paymentMode = String(value('bookingPaymentMode', domain.booking_payment_mode ?? ''))
    if (duration < 15) issues.push('مدة الجلسة يجب أن تكون 15 دقيقة على الأقل.')
    if (!['payment_required', 'free'].includes(paymentMode)) issues.push('نمط الدفع غير صالح.')
    if (paymentMode === 'free' && price !== 0) issues.push('الخدمة المجانية يجب أن يكون سعرها صفرًا.')
    if (paymentMode === 'payment_required' && price <= 0) issues.push('الخدمة المدفوعة تحتاج سعرًا موجبًا.')
    const { count, error } = await service.from('availability_rules').select('id', { count: 'exact', head: true }).eq('service_id', id)
    if (error || !count) issues.push('أضيفي قاعدة توافر واحدة على الأقل قبل تفعيل الحجز.')
  }

  return { ready: issues.length === 0, issues }
}
