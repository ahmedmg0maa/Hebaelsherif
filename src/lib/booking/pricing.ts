import { SESSION_PRICES } from '@/constants/booking'
import type { BookingDuration } from '@/types'

export function getSessionPrice(duration: BookingDuration) {
  return SESSION_PRICES[duration]
}

export function calculateFinalAmount(originalAmount: number, discountAmount = 0) {
  return Math.max(0, originalAmount - Math.max(0, discountAmount))
}
