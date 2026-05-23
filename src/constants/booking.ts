import type { BookingDuration, SelectOption } from '@/types'

export const BOOKING_RULES = {
  timezone: 'Africa/Cairo',
  blockedDays: [5],
  durations: [60, 90] satisfies BookingDuration[],
  bufferMinutes: 30,
  minDaysAhead: 1,
  maxDaysAhead: 30,
  availableHours: {
    start: 10,
    end: 20,
  },
} as const

export const TIME_SLOTS = [
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
] as const

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
  confirmed: 'مؤكد',
  reschedule_requested: 'طلب تغيير موعد',
  cancelled: 'ملغي',
  completed: 'مكتمل',
} as const

export const BOOKING_STATUS_STYLES = {
  pending: 'bg-gold/10 text-gold border-gold/20',
  confirmed: 'bg-olive/10 text-olive border-olive/20',
  reschedule_requested: 'bg-petrol/10 text-petrol border-petrol/20',
  cancelled: 'bg-burgundy/10 text-burgundy border-burgundy/20',
  completed: 'bg-petrol/10 text-petrol border-petrol/20',
} as const