import type { FirestoreDate } from '@/types'

export function formatEGP(amount: number) {
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatArabicDate(value: FirestoreDate | string | Date | undefined) {
  if (!value) return 'غير محدد'

  let date: Date

  if (typeof value === 'string') {
    date = new Date(value)
  } else if (value instanceof Date) {
    date = value
  } else if ('toDate' in value) {
    date = value.toDate()
  } else {
    return 'غير محدد'
  }

  if (Number.isNaN(date.getTime())) return 'غير محدد'

  return new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

export function getTodayDateString() {
  return new Date().toISOString().slice(0, 10)
}

export function getOrderStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: 'بانتظار التأكيد',
    payment_submitted: 'تم إرسال بيانات الدفع',
    paid: 'مدفوع',
    failed: 'فشل الدفع',
    refunded: 'مسترد',
    cancelled: 'ملغي',
  }

  return labels[status] || status
}

export function getOrderStatusClass(status: string) {
  const classes: Record<string, string> = {
    pending: 'border-gold/20 bg-gold/10 text-gold',
    payment_submitted: 'border-petrol/20 bg-petrol/10 text-petrol',
    paid: 'border-olive/20 bg-olive/10 text-olive',
    failed: 'border-burgundy/20 bg-burgundy/10 text-burgundy',
    refunded: 'border-sand bg-cream text-warm-gray',
    cancelled: 'border-burgundy/20 bg-burgundy/10 text-burgundy',
  }

  return classes[status] || 'border-sand bg-cream text-warm-gray'
}
