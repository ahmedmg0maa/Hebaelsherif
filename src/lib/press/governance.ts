export const PRESS_KINDS = ['article', 'interview', 'podcast', 'video', 'event'] as const
export const PRESS_CLASSIFICATIONS = ['independent_editorial', 'partner', 'owned_channel', 'event'] as const
export const PRESS_STATUSES = ['draft', 'scheduled', 'published', 'archived'] as const

export type PressKind = (typeof PRESS_KINDS)[number]
export type PressClassification = (typeof PRESS_CLASSIFICATIONS)[number]
export type PressStatus = (typeof PRESS_STATUSES)[number]

export const PRESS_KIND_LABELS: Record<PressKind, string> = { article: 'مقال', interview: 'حوار', podcast: 'بودكاست', video: 'فيديو', event: 'فعالية' }
export const PRESS_CLASSIFICATION_LABELS: Record<PressClassification, string> = {
  independent_editorial: 'مصدر تحريري مستقل', partner: 'شريك/تعاون', owned_channel: 'قناة مملوكة', event: 'جهة فعالية',
}

export type NormalizedPressInput = {
  id: string | null
  outlet: string
  title: string
  kind: PressKind
  sourceClassification: PressClassification
  originalUrl: string
  publishedOn: string
  excerpt: string
  imageMediaId: string | null
  status: PressStatus
  publishAt: string | null
  isFeatured: boolean
  sort: number
}

export type PressValidation = { ok: true; value: NormalizedPressInput } | { ok: false; error: string }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function normalizePressInput(formData: FormData, now = new Date()): PressValidation {
  const idValue = String(formData.get('id') ?? '').trim()
  const imageValue = String(formData.get('image_media_id') ?? '').trim()
  const outlet = String(formData.get('outlet') ?? '').trim()
  const title = String(formData.get('title') ?? '').trim()
  const kind = String(formData.get('kind') ?? '')
  const sourceClassification = String(formData.get('source_classification') ?? '')
  const originalUrl = String(formData.get('original_url') ?? '').trim()
  const publishedOn = String(formData.get('published_on') ?? '')
  const excerpt = String(formData.get('excerpt') ?? '').trim()
  const status = String(formData.get('status') ?? 'draft')
  const publishRaw = String(formData.get('publish_at') ?? '').trim()
  const sort = Number(formData.get('sort') ?? 100)
  if ((idValue && !UUID.test(idValue)) || (imageValue && !UUID.test(imageValue))) return { ok: false, error: 'مرجع السجل أو الصورة غير صالح.' }
  if (outlet.length < 2 || outlet.length > 160 || title.length < 4 || title.length > 240) return { ok: false, error: 'راجعي اسم الجهة والعنوان.' }
  if (!PRESS_KINDS.includes(kind as PressKind) || !PRESS_CLASSIFICATIONS.includes(sourceClassification as PressClassification)) return { ok: false, error: 'نوع الظهور أو تصنيف المصدر غير صالح.' }
  try { const url = new URL(originalUrl); if (url.protocol !== 'https:') throw new Error() } catch { return { ok: false, error: 'الرابط الأصلي يجب أن يكون HTTPS صالحًا.' } }
  const publishedDate = new Date(`${publishedOn}T00:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(publishedOn) || Number.isNaN(publishedDate.valueOf()) || publishedDate > now) return { ok: false, error: 'تاريخ الظهور غير صالح أو مستقبلي.' }
  if (excerpt.length > 500) return { ok: false, error: 'المقتطف يتجاوز ٥٠٠ حرف.' }
  if (!PRESS_STATUSES.includes(status as PressStatus) || !Number.isInteger(sort) || sort < 0 || sort > 10000) return { ok: false, error: 'حالة النشر أو الترتيب غير صالح.' }
  const publishAt = publishRaw ? parseCairoLocalDateTime(publishRaw) : null
  if (status === 'scheduled' && (!publishAt || Number.isNaN(publishAt.valueOf()) || publishAt <= now)) return { ok: false, error: 'اختاري موعد نشر مستقبليًا.' }
  if (status === 'published' && sourceClassification === 'independent_editorial' && kind === 'event') return { ok: false, error: 'لا يمكن تصنيف الفعالية كصحافة مستقلة.' }
  return { ok: true, value: {
    id: idValue || null, outlet, title, kind: kind as PressKind, sourceClassification: sourceClassification as PressClassification,
    originalUrl, publishedOn, excerpt, imageMediaId: imageValue || null, status: status as PressStatus,
    publishAt: publishAt?.toISOString() ?? null, isFeatured: formData.get('is_featured') === 'on', sort,
  } }
}
import { parseCairoLocalDateTime } from '../booking/cairo-time.ts'
