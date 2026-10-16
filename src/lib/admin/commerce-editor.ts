import { catalogEditorPayload } from '../catalog/editor'
import { parseCairoLocalDateTime } from '../booking/cairo-time'

export type CommerceEditorKind = 'program' | 'variant' | 'plan' | 'coupon' | 'offer'
export type CommercePayload = Record<string, unknown>
const productTypes = ['course', 'book', 'workshop', 'session', 'bundle', 'vip', 'free_resource']
export function commerceEditorPayload(kind: CommerceEditorKind, form: FormData): { ok: true; value: CommercePayload } | { ok: false; error: string } {
  try {
    const str = (key: string, max = 180, fallback = '') => {
      const raw = form.get(key)
      if (raw !== null && typeof raw !== 'string') throw new Error()
      const value = String(raw ?? fallback).trim()
      if (value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw new Error()
      return value
    }
    const num = (key: string, min = 0, max = 100000, fallback: number | null = 0, money = false) => {
      const raw = str(key, 30)
      if (!raw) return fallback
      if (!/^\d+(\.\d{1,2})?$/.test(raw)) throw new Error()
      const value = Number(raw)
      if (!Number.isFinite(value) || value < min || value > max || (!money && !Number.isInteger(value))) throw new Error()
      return value
    }
    const uuid = (raw: string) => {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw)) throw new Error()
      return raw.toLowerCase()
    }
    const ids = (key: string) => {
      const values = [...new Set(form.getAll(key).map(value => uuid(String(value))))]
      if (values.length > 100) throw new Error()
      return values
    }
    const date = (key: string) => {
      const raw = str(key, 16)
      if (!raw) return null
      const parsed = parseCairoLocalDateTime(raw)
      if (!parsed) throw new Error()
      return parsed.toISOString()
    }
    if (kind === 'program') {
      const parsed = catalogEditorPayload('course', form)
      if (!parsed.ok) return parsed
      const value: CommercePayload = { ...parsed.value, type: str('type', 30), is_published: false }
      delete value.level; delete value.duration_minutes
      if (!['bundle', 'vip', 'free_resource'].includes(String(value.type)) || (value.type === 'free_resource' && value.price !== 0)) throw new Error()
      return { ok: true, value }
    }
    if (kind === 'variant') {
      const name = str('name')
      if (name.length < 2) throw new Error()
      return { ok: true, value: { name, price: num('price', 0, 99999999.99, 0, true), is_active: form.get('is_active') === 'on' } }
    }
    const starts_at = date('starts_at'), ends_at = date('ends_at')
    if (starts_at && ends_at && ends_at <= starts_at) throw new Error()
    let value: CommercePayload
    if (kind === 'plan') {
      const title = str('title'), slug = str('slug', 80).toLowerCase(), currency = str('currency', 3, 'EGP').toUpperCase()
      const billing_interval = str('billing_interval', 20, 'month'), product = str('product_id', 36)
      if (title.length < 2 || slug.length < 3 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || !/^[A-Z]{3}$/.test(currency) || !['month', 'quarter', 'year', 'one_time'].includes(billing_interval)) throw new Error()
      const features = str('features', 10000).split('\n').map(s => s.trim()).filter(Boolean)
      if (features.length > 50 || features.some(s => s.length > 300)) throw new Error()
      value = { title, slug, currency, billing_interval, description: str('description', 30000), price: num('price', 0, 99999999.99, 0, true), product_id: product ? uuid(product) : null,
        duration_days: num('duration_days', 1, 3650, 30), sessions_included: num('sessions_included'), max_subscribers: num('max_subscribers', 1, 1000000, null), sort: num('sort'),
        features, eligible_service_ids: ids('eligible_service_ids'), is_active: form.get('is_active') === 'on', is_published: form.get('is_published') === 'on' }
    } else if (kind === 'coupon') {
      const code = str('code', 24).toUpperCase(), discountKind = str('kind', 20, 'percent'), discountValue = num('value', 0.01, 99999999.99, null, true)
      if (!/^[A-Z0-9_-]{3,24}$/.test(code) || !['percent', 'fixed'].includes(discountKind) || discountValue === null || (discountKind === 'percent' && discountValue > 100)) throw new Error()
      value = { code, kind: discountKind, value: discountValue, max_uses: num('max_uses', 1, 1000000, null), max_uses_per_user: num('max_uses_per_user', 1, 1000000, 1) }
    } else if (kind === 'offer') {
      const title = str('title'), campaign = str('kind', 30, 'flash_sale'), discount_kind = str('discount_kind', 20, 'percent'), discount_value = num('discount_value', 0.01, 99999999.99, null, true)
      if (title.length < 3 || !['flash_sale', 'coupon_campaign', 'bundle', 'limited_seats', 'countdown', 'seasonal'].includes(campaign) || !['percent', 'fixed'].includes(discount_kind) || discount_value === null || (discount_kind === 'percent' && discount_value > 100)) throw new Error()
      // Preserve every legacy target field; checkout matches product ID or product type.
      const raw = str('targets', 20000, '[]')
      const targets: unknown = JSON.parse(raw)
      if (!Array.isArray(targets) || targets.length > 100) throw new Error()
      const normalized = targets.map(t => {
        if (!t || typeof t !== 'object' || Array.isArray(t) || Object.keys(t).some(k => !['product_id', 'product_type', 'category'].includes(k))) throw new Error()
        const product_id = t.product_id == null || t.product_id === '' ? null : uuid(String(t.product_id))
        const product_type = t.product_type || null, category = t.category || null
        if ((product_type !== null && !productTypes.includes(product_type)) || (category !== null && (typeof category !== 'string' || !category.trim() || category.length > 180)) || (!product_id && !product_type && !category)) throw new Error()
        return { product_id, product_type, category }
      })
      value = { title, kind: campaign, description: str('description', 10000), badge_text: str('badge_text', 100) || null, discount_kind, discount_value, usage_limit: num('usage_limit', 1, 1000000, null), targets: normalized }
    } else throw new Error()
    return { ok: true, value: { ...value, starts_at, ends_at } }
  } catch { return { ok: false, error: 'راجعي الحقول والأرقام والحدود ومواعيد البداية والنهاية بتوقيت القاهرة.' } }
}

export function commerceMutationError(error: { code?: string; message?: string } | null) {
  if (error?.code === 'PGRST202') return 'هذه العملية لم تُهيّأ في قاعدة بيانات البيئة بعد.'
  if (error?.code === '42501') return 'لا تملكين صلاحية هذا الإجراء؛ تعديل منتج منشور يتطلب صلاحية النشر.'
  if (error?.message?.includes('offer_capacity')) return 'اكتملت سعة العرض؛ راجعي الحد والطلبات المرتبطة.'
  if (error?.code === '23505') return 'الكود أو الرابط أو المنتج المرتبط مستخدم بالفعل.'
  if (error?.code === '23503') return 'السجل مرتبط بطلبات أو حقوق قائمة؛ استخدمي الإيقاف أو الأرشفة بدل الحذف.'
  if (error?.message?.includes('pending_plan_orders')) return 'توجد طلبات باقة تنتظر إتمام الدفع أو المراجعة. احسميها أولًا للحفاظ على شروط الشراء.'
  if (error?.message?.includes('archived')) return 'استعيدي الباقة المؤرشفة أولًا قبل تعديلها.'
  if (error?.message?.includes('capacity')) return 'لا يمكن خفض السعة عن الاشتراكات النشطة القائمة.'
  if (error?.message?.includes('published')) return 'أوقفي نشر المنتج المرتبط قبل تغيير السعر أو الارتباط أو محتوى الباقة.'
  if (error?.message?.includes('invalid')) return 'راجعي المدخلات والخدمات والمنتجات المرتبطة والغلاف.'
  if (error?.message?.includes('not_found')) return 'لم يعد السجل موجودًا؛ حدّثي الصفحة.'
  return 'تعذّر تأكيد النتيجة. راجعي السجل قبل إعادة المحاولة؛ مدخلاتك محفوظة.'
}
