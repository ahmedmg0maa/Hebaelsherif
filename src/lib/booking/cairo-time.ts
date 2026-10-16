const cairoParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Africa/Cairo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

const cairoOffset = new Intl.DateTimeFormat('en', {
  timeZone: 'Africa/Cairo',
  timeZoneName: 'longOffset',
})

function offsetMilliseconds(instant: Date) {
  const label = cairoOffset.formatToParts(instant).find((part) => part.type === 'timeZoneName')?.value
  const match = /^GMT([+-])(\d{2}):(\d{2})$/.exec(label ?? '')
  if (!match) return null
  const direction = match[1] === '+' ? 1 : -1
  return direction * (Number(match[2]) * 60 + Number(match[3])) * 60_000
}

function localValue(instant: Date) {
  const parts = Object.fromEntries(
    cairoParts.formatToParts(instant).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]),
  )
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

export function formatCairoLocalDateTime(value: string | Date) {
  const instant = value instanceof Date ? value : new Date(value)
  return Number.isNaN(instant.getTime()) ? null : localValue(instant)
}

export function parseCairoLocalDateTime(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value)
  if (!match) return null
  const [, year, month, day, hour, minute] = match
  const fields = [year, month, day, hour, minute].map(Number)
  const naive = Date.UTC(fields[0], fields[1] - 1, fields[2], fields[3], fields[4])
  const calendarCheck = new Date(naive)
  if (
    calendarCheck.getUTCFullYear() !== fields[0]
    || calendarCheck.getUTCMonth() !== fields[1] - 1
    || calendarCheck.getUTCDate() !== fields[2]
    || calendarCheck.getUTCHours() !== fields[3]
    || calendarCheck.getUTCMinutes() !== fields[4]
  ) return null

  let utc = naive
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const offset = offsetMilliseconds(new Date(utc))
    if (offset === null) return null
    const adjusted = naive - offset
    if (adjusted === utc) break
    utc = adjusted
  }
  const instant = new Date(utc)
  return localValue(instant) === value ? instant : null
}

// Calendar arithmetic uses Cairo's civil date, never a moving 12-hour offset.
export function bookingCalendarDates(now: Date, days: number) {
  const today = formatCairoLocalDateTime(now)?.slice(0,10)
  if (!today || !Number.isInteger(days) || days<1 || days>30) return []
  const anchor = new Date(`${today}T12:00:00Z`).getTime()
  return Array.from({length:days},(_,offset)=>new Date(anchor+offset*86_400_000).toISOString().slice(0,10))
}
