import { z } from 'zod'
import { BOOKING_RULES, getBookableTimeSlots } from '@/constants/booking'
import { cairoDateAfterDays, isBlockedBookingDay, isIsoDate, isTime } from '@/lib/booking/date'
import type { BookingDuration, PaymentMethod } from '@/types'

export const bookingDurationSchema = z.union([z.literal(60), z.literal(90)])
export const paymentMethodSchema = z.union([z.literal('instapay'), z.literal('vodafone_cash'), z.literal('bank_transfer'), z.literal('manual')])

export const createBookingSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180),
  phone: z.string().trim().min(6).max(40),
  date: z.string().trim().refine(isIsoDate, 'تاريخ الحجز غير صحيح.'),
  time: z.string().trim().refine(isTime, 'وقت الحجز غير صحيح.'),
  duration: bookingDurationSchema,
  notes: z.string().trim().max(4000).optional().default(''),
  paymentMethod: paymentMethodSchema.default('manual'),
  paymentReference: z.string().trim().max(200).optional().default(''),
  paymentNote: z.string().trim().max(1000).optional().default(''),
  couponCode: z.string().trim().max(80).optional().default(''),
})

export type CreateBookingInput = z.infer<typeof createBookingSchema>

export function validateBookingBusinessRules(input: CreateBookingInput) {
  const minDate = cairoDateAfterDays(BOOKING_RULES.minDaysAhead)
  const maxDate = cairoDateAfterDays(BOOKING_RULES.maxDaysAhead)

  if (input.date < minDate) return 'لا يمكن حجز جلسة في نفس اليوم أو في الماضي.'
  if (input.date > maxDate) return 'لا يمكن الحجز لأكثر من 30 يومًا مقدمًا.'
  if (isBlockedBookingDay(input.date)) return 'لا تتوفر حجوزات يوم الجمعة.'

  const validSlots = getBookableTimeSlots(input.duration as BookingDuration)
  if (!validSlots.includes(input.time)) return 'وقت الحجز غير متاح لهذه المدة.'

  return null
}

export function normalizePaymentMethod(value: string): PaymentMethod {
  return paymentMethodSchema.safeParse(value).success ? (value as PaymentMethod) : 'manual'
}
