import { BOOKING_RULES } from '@/constants/booking'

const CAIRO_TIME_ZONE = BOOKING_RULES.timezone
const ISO_DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/
const TIME_FORMAT = /^\d{2}:\d{2}$/

export function isIsoDate(value: string) {
  return ISO_DATE_FORMAT.test(value)
}

export function isTime(value: string) {
  return TIME_FORMAT.test(value)
}

export function getCairoParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CAIRO_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
    hour: Number(lookup.hour),
    minute: Number(lookup.minute),
    second: Number(lookup.second),
  }
}

export function todayInCairo() {
  const { year, month, day } = getCairoParts()
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function cairoDateAfterDays(days: number) {
  const today = new Date(`${todayInCairo()}T12:00:00Z`)
  today.setUTCDate(today.getUTCDate() + days)
  return today.toISOString().slice(0, 10)
}

export function cairoDateToWeekday(dateValue: string) {
  const date = new Date(`${dateValue}T12:00:00+02:00`)
  return Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: CAIRO_TIME_ZONE,
      weekday: 'short',
    })
      .format(date)
      .replace('Sun', '0')
      .replace('Mon', '1')
      .replace('Tue', '2')
      .replace('Wed', '3')
      .replace('Thu', '4')
      .replace('Fri', '5')
      .replace('Sat', '6'),
  )
}

export function isBlockedBookingDay(dateValue: string) {
  return BOOKING_RULES.blockedDays.includes(cairoDateToWeekday(dateValue) as never)
}

export function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export function minutesToTime(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

export function combineCairoDateTime(date: string, time: string) {
  // Cairo is UTC+2/+3 depending on DST. Postgres will normalize timezone accurately when using timezone names.
  // This ISO is used as a stable transport value; database functions remain the source of truth.
  return `${date}T${time}:00`
}
