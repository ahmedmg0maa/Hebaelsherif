/** Plain-text articles: this is an estimate, not a promise of reading speed. */
export function readingMinutes(content: string): number {
  return Math.max(1, Math.ceil(content.trim().split(/\s+/u).filter(Boolean).length / 180))
}

export function publicArticleCover(value: unknown): string | null {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password
      && url.hostname.endsWith('.supabase.co')
      && url.pathname.startsWith('/storage/v1/object/public/public-media/') ? url.href : null
  } catch { return null }
}

export function articleDate(value: string | null): string | null {
  if (!value || !Number.isFinite(Date.parse(value))) return null
  return new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Cairo' }).format(new Date(value))
}
