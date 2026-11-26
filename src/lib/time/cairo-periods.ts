import { parseCairoLocalDateTime } from '@/lib/booking/cairo-time'

const cairoCalendar = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Africa/Cairo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function cairoDateKey(instant: Date) {
  return cairoCalendar.format(instant)
}

function shiftedDateKey(reference: Date, years: number, months: number, days: number) {
  const [year, month, day] = cairoDateKey(reference).split('-').map(Number)
  const shifted = new Date(Date.UTC(year + years, month - 1 + months, day + days, 12))
  return shifted.toISOString().slice(0, 10)
}

export function shiftedCairoDateKey(reference = new Date(), dayOffset = 0) {
  return shiftedDateKey(reference, 0, 0, dayOffset)
}

function cairoMidnight(dateKey: string) {
  const value = parseCairoLocalDateTime(`${dateKey}T00:00`)
  if (!value) throw new Error('CAIRO_CALENDAR_BOUNDARY_INVALID')
  return value
}

export function cairoDayRange(reference = new Date(), dayOffset = 0) {
  const startKey = shiftedDateKey(reference, 0, 0, dayOffset)
  const endKey = shiftedDateKey(reference, 0, 0, dayOffset + 1)
  return { start: cairoMidnight(startKey), end: cairoMidnight(endKey), key: startKey }
}

export function cairoMonthRange(reference = new Date(), monthOffset = 0) {
  const [year, month] = cairoDateKey(reference).split('-').map(Number)
  const startCalendar = new Date(Date.UTC(year, month - 1 + monthOffset, 1, 12))
  const endCalendar = new Date(Date.UTC(year, month + monthOffset, 1, 12))
  const startKey = startCalendar.toISOString().slice(0, 10)
  const endKey = endCalendar.toISOString().slice(0, 10)
  return { start: cairoMidnight(startKey), end: cairoMidnight(endKey), key: startKey }
}

export function parseOptionalCairoLocalDateTime(value: FormDataEntryValue | null) {
  const raw = typeof value === 'string' ? value.trim() : ''
  if (!raw) return { ok: true as const, value: null }
  const instant = parseCairoLocalDateTime(raw)
  return instant
    ? { ok: true as const, value: instant }
    : { ok: false as const, error: 'أدخلي تاريخًا ووقتًا صحيحين بتوقيت القاهرة.' }
}
