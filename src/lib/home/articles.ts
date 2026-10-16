export function selectedArticleSlugs(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.filter((slug): slug is string => typeof slug === 'string' && slug.length >= 3 && slug.length <= 80 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)))].slice(0, 3) : []
}
export function articleSelectionFromForm(form: FormData): string[] | null {
  const raw = [0, 1, 2].map(i => String(form.get(`article_slug_${i}`) ?? '').trim()).filter(Boolean)
  const selected = selectedArticleSlugs(raw)
  return selected.length === raw.length ? selected : null
}
