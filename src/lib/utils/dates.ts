export const CAIRO_TIME_ZONE = 'Africa/Cairo'

export function toDate(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value === 'object' && value && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate()
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }
  return null
}

export function cairoDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: CAIRO_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function formatCairoDate(value: unknown, options?: Intl.DateTimeFormatOptions) {
  const date = toDate(value)
  if (!date) return '—'
  return new Intl.DateTimeFormat('ar-EG', {
    timeZone: CAIRO_TIME_ZONE,
    dateStyle: 'medium',
    ...options,
  }).format(date)
}

export function formatCairoDateTime(value: unknown) {
  const date = toDate(value)
  if (!date) return '—'
  return new Intl.DateTimeFormat('ar-EG', {
    timeZone: CAIRO_TIME_ZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}
