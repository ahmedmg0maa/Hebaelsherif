export type HomeMediaRef = { assetId: string; alt: string; x: number; y: number }
export type HomeMediaMap = Record<string, HomeMediaRef>
export type ResolvedHomeMedia = HomeMediaRef & { url: string }
export const mediaSlots = (kind: string, count = 3): string[] => kind === 'pathways' ? Array.from({ length: count === 4 ? 4 : 3 }, (_, i) => `portal${i}`) : ['hero', 'manifesto', 'editorial_feature', 'cta'].includes(kind) ? ['main'] : []
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export function normalizeHomeMedia(value: unknown): HomeMediaMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const output: HomeMediaMap = {}
  for (const [key, item] of Object.entries(value)) {
    if (!/^(main|portal[0-3])$/.test(key) || !item || typeof item !== 'object' || Array.isArray(item)) continue
    const v = item as Record<string, unknown>
    if (typeof v.assetId !== 'string' || !uuid.test(v.assetId) || typeof v.alt !== 'string' || v.alt.trim().length < 2 || v.alt.length > 240 || /[<>\u0000-\u001f\u007f]/u.test(v.alt)) continue
    if (typeof v.x !== 'number' || typeof v.y !== 'number' || !Number.isFinite(v.x) || !Number.isFinite(v.y) || v.x < 0 || v.x > 100 || v.y < 0 || v.y > 100) continue
    output[key] = { assetId: v.assetId, alt: v.alt.trim(), x: v.x, y: v.y }
  }
  return output
}
export function homeMediaFromForm(kind: string, form: FormData): HomeMediaMap | null {
  const candidate: Record<string, unknown> = {}
  for (const slot of mediaSlots(kind, Number(form.get('item_count') ?? 3))) {
    const assetId = String(form.get(`media_${slot}_id`) ?? '').trim()
    if (!assetId) continue
    candidate[slot] = { assetId, alt: String(form.get(`media_${slot}_alt`) ?? '').trim(), x: Number(form.get(`media_${slot}_x`) ?? 50), y: Number(form.get(`media_${slot}_y`) ?? 50) }
  }
  const value = normalizeHomeMedia(candidate)
  return Object.keys(value).length === Object.keys(candidate).length ? value : null
}
