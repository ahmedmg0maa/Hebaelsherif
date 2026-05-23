import type { BookingDuration, SelectOption } from '@/types'

export const BOOKING_RULES = {
  timezone: 'Africa/Cairo',
  blockedDays: [5],
  durations: [60, 90] satisfies BookingDuration[],
  bufferMinutes: 30,
  minDaysAhead: 1,
  maxDaysAhead: 30,
  availableHours: {
    start: 7,
    end: 21,
  },
} as const

function buildTimeSlots() {
  const slots: string[] = []
  const startMinutes = BOOKING_RULES.availableHours.start * 60
  const endMinutes = BOOKING_RULES.availableHours.end * 60

  for (let minutes = startMinutes; minutes <= endMinutes; minutes += 30) {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    slots.push(`${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`)
  }

  return slots
}

export const TIME_SLOTS = buildTimeSlots()

export function getBookableTimeSlots(duration: BookingDuration) {
  const endMinutes = BOOKING_RULES.availableHours.end * 60

  return TIME_SLOTS.filter((slot) => {
    const [hours, minutes] = slot.split(':').map(Number)
    return hours * 60 + minutes + duration <= endMinutes
  })
}

export const SESSION_PRICES: Record<BookingDuration, number> = {
  60: 1200,
  90: 1500,
}

export const BOOKING_DURATION_OPTIONS: SelectOption<BookingDuration>[] = [
  {
    label: 'جلسة 60 دقيقة',
    value: 60,
  },
  {
    label: 'جلسة 90 دقيقة',
    value: 90,
  },
]

export const BOOKING_STATUS_LABELS = {
  pending: 'بانتظار التأكيد',
  payment_submitted: 'تم إرسال بيانات الدفع',
  confirmed: 'مؤكد',
  reschedule_requested: 'طلب تغيير موعد',
  cancelled: 'ملغي',
  completed: 'مكتمل',
} as const

export const BOOKING_STATUS_STYLES = {
  pending: 'bg-gold/10 text-gold border-gold/20',
  payment_submitted: 'bg-petrol/10 text-petrol border-petrol/20',
  confirmed: 'bg-olive/10 text-olive border-olive/20',
  reschedule_requested: 'bg-petrol/10 text-petrol border-petrol/20',
  cancelled: 'bg-burgundy/10 text-burgundy border-burgundy/20',
  completed: 'bg-petrol/10 text-petrol border-petrol/20',
} as const
