import type { FirestoreDate } from '@/types'

export function toEnglishDigits(value: string | number) {
  const map: Record<string, string> = {
    '٠': '0',
    '١': '1',
    '٢': '2',
    '٣': '3',
    '٤': '4',
    '٥': '5',
    '٦': '6',
    '٧': '7',
    '٨': '8',
    '٩': '9',
    '۰': '0',
    '۱': '1',
    '۲': '2',
    '۳': '3',
    '۴': '4',
    '۵': '5',
    '۶': '6',
    '۷': '7',
    '۸': '8',
    '۹': '9',
  }

  return String(value).replace(/[٠-٩۰-۹]/g, (digit) => map[digit] || digit)
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value)
}

export function formatEGP(amount: number) {
  return `${formatNumber(Math.round(amount || 0))} ج.م`
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

  return toEnglishDigits(
    new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date),
  )
}

export function formatArabicDateTime(value: FirestoreDate | string | Date | undefined) {
  if (!value) return 'غير محدد'
  const date = typeof value === 'string' ? new Date(value) : value instanceof Date ? value : 'toDate' in value ? value.toDate() : null
  if (!date || Number.isNaN(date.getTime())) return 'غير محدد'
  return toEnglishDigits(
    new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date),
  )
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
