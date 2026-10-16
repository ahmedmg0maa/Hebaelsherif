// Locale/format helpers — safe for both server and client components.
export function formatPrice(value: number, currency = 'ج.م') {
  const label = currency === 'EGP' ? 'ج.م' : currency
  return `${value.toLocaleString('ar-EG')} ${label}`
}

export function arabicDigits(value: string) {
  const digits = '٠١٢٣٤٥٦٧٨٩'
  return value.replace(/\d/g, (digit) => digits[Number(digit)])
}

export function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m.toLocaleString('ar-EG')} دقيقة`
  if (m === 0) return `${h.toLocaleString('ar-EG')} ساعات`
  return `${h.toLocaleString('ar-EG')} س ${m.toLocaleString('ar-EG')} د`
}

export const weekdayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

// Arabic count pluralization for lessons (١ درس، ٢ درسان، ٣–١٠ دروس، ١١+ درسًا)
export function lessonsLabel(n: number) {
  const num = n.toLocaleString('ar-EG')
  if (n === 1) return 'درس واحد'
  if (n === 2) return 'درسان'
  if (n >= 3 && n <= 10) return `${num} دروس`
  return `${num} درسًا`
}

// Time comparisons kept out of component bodies (react compiler purity rule).
export function isPast(iso: string | null | undefined): boolean {
  return Boolean(iso) && new Date(iso as string).getTime() < Date.now()
}

export function isFuture(iso: string | null | undefined): boolean {
  return Boolean(iso) && new Date(iso as string).getTime() > Date.now()
}
