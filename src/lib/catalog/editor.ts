import { parseCairoLocalDateTime } from '../booking/cairo-time'

export const CATALOG_KINDS = ['course', 'book', 'workshop', 'service'] as const
export type CatalogKind = typeof CATALOG_KINDS[number]
export type CatalogPayload = Record<string, string | number | boolean | null>
export function catalogEditorPayload(kind: CatalogKind, form: FormData): { ok: true; value: CatalogPayload } | { ok: false; error: string } {
  try {
    if (!CATALOG_KINDS.includes(kind)) throw new Error()
    const str = (key: string, max: number, fallback = '') => {
      const entry = form.get(key)
      if (entry !== null && typeof entry !== 'string') throw new Error()
      const value = String(entry ?? fallback).trim()
      if (value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw new Error()
      return value
    }
    const num = (key: string, min: number, max: number, fallback: number | null, integer = true) => {
      const raw = str(key, 30)
      if (!raw) return fallback
      if (!/^\d+(\.\d{1,2})?$/.test(raw)) throw new Error()
      const value = Number(raw)
      if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) throw new Error()
      return value
    }
    const title = str('title', 180), slug = str('slug', 80).toLowerCase(), currency = str('currency', 3, 'EGP').toUpperCase()
    if (title.length < 2 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length < 3 || !/^[A-Z]{3}$/.test(currency)) throw new Error()
    const coverAsset = str('cover_asset_id', 36)
    if (coverAsset && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(coverAsset)) throw new Error()
    const value: CatalogPayload = {
      title, slug, currency, subtitle: str('subtitle', 240), description: str('description', 30000),
      price: num('price', 0, 99999999.99, 0, false), compare_at_price: num('compare_at_price', 0, 99999999.99, null, false),
      sort: num('sort', 0, 100000, 0), cover_asset_id: coverAsset || null,
      cover_url: str('cover_url', 1000) || null, is_published: form.get('is_published') === 'on',
    }
    if (value.cover_url && !/^https:\/\/[^\s]+$/.test(String(value.cover_url))) throw new Error()
    if (kind === 'course') {
      value.level = str('level', 20, 'all')
      if (!['all', 'beginner', 'intermediate', 'advanced'].includes(String(value.level))) throw new Error()
      value.duration_minutes = num('duration_minutes', 0, 100000, 0)
    } else if (kind === 'book') {
      value.author = str('author', 180, 'هبة الشريف'); value.pages_count = num('pages_count', 1, 100000, null)
    } else if (kind === 'workshop') {
      const start = parseCairoLocalDateTime(str('starts_at', 16)), end = parseCairoLocalDateTime(str('ends_at', 16))
      if (!start || !end || end <= start) return { ok: false, error: 'حددي بداية ونهاية صحيحتين للورشة بتوقيت القاهرة.' }
      value.starts_at = start.toISOString(); value.ends_at = end.toISOString()
      value.seats_total = num('seats_total', 0, 100000, 0)
      value.location_kind = str('location_kind', 20, 'online'); value.location_text = str('location_text', 1000)
      value.meeting_url = str('meeting_url', 500) || null
      if (!['online', 'in_person', 'hybrid'].includes(String(value.location_kind)) || (value.meeting_url && !/^https:\/\/[^\s]+$/.test(String(value.meeting_url)))) throw new Error()
    } else {
      value.duration_minutes = num('duration_minutes', 15, 1440, 60)
      value.booking_payment_mode = str('booking_payment_mode', 30, 'payment_required')
      if (!['payment_required', 'free'].includes(String(value.booking_payment_mode))) throw new Error()
      for (const key of ['buffer_before_minutes', 'buffer_after_minutes', 'minimum_notice_minutes', 'cancellation_notice_hours', 'reschedule_notice_hours']) value[key] = num(key, 0, 525600, null)
      value.booking_window_days = num('booking_window_days', 1, 365, null)
      value.hold_minutes = num('hold_minutes', 2, 30, 10)
      value.max_reschedules = num('max_reschedules', 0, 12, 2)
      value.booking_policy_note = str('booking_policy_note', 4000)
    }
    return { ok: true, value }
  } catch { return { ok: false, error: 'راجعي الحقول: النصوص وحدودها، الأرقام الموجبة، الرابط والعملة والغلاف.' } }
}
