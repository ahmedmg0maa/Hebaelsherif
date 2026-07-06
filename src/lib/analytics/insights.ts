import type { Booking, Order } from '@/types'
import { getAmount, toMillis } from '@/lib/admin/operations'

export interface AnalyticsSummaryInput {
  orders: Array<Partial<Order> & Record<string, unknown>>
  bookings: Array<Partial<Booking> & Record<string, unknown>>
  users: Array<Record<string, unknown>>
  messages: Array<Record<string, unknown>>
  events?: Array<Record<string, unknown>>
}

function inLastDays(value: unknown, days: number) {
  const millis = toMillis(value as never)
  if (!millis) return false
  return Date.now() - millis <= days * 24 * 60 * 60 * 1000
}

export function buildAnalyticsSummary(input: AnalyticsSummaryInput) {
  const paidOrders = input.orders.filter((order) => order.status === 'paid' || order.status === 'access_granted')
  const confirmedBookings = input.bookings.filter((booking) => booking.paymentStatus === 'confirmed' || booking.status === 'completed')
  const revenueOrders = paidOrders.reduce((sum, order) => sum + getAmount(order), 0)
  const revenueBookings = confirmedBookings.reduce((sum, booking) => sum + getAmount(booking), 0)
  const orders30 = input.orders.filter((order) => inLastDays(order.createdAt, 30))
  const bookings30 = input.bookings.filter((booking) => inLastDays(booking.createdAt, 30))
  const paid30 = orders30.filter((order) => order.status === 'paid' || order.status === 'access_granted')
  const confirmedBookings30 = bookings30.filter((booking) => booking.paymentStatus === 'confirmed' || booking.status === 'completed')
  const paymentSubmitted = input.orders.filter((order) => order.status === 'payment_submitted').length
  const bookingNeedsAction = input.bookings.filter((booking) => ['pending', 'payment_submitted', 'reschedule_requested'].includes(String(booking.status))).length
  const unreadMessages = input.messages.filter((message) => !message.status || message.status === 'new').length
  const orderConversion = input.orders.length ? Math.round((paidOrders.length / input.orders.length) * 100) : 0
  const bookingConversion = input.bookings.length ? Math.round((confirmedBookings.length / input.bookings.length) * 100) : 0

  const productCounts = new Map<string, number>()
  input.orders.forEach((order) => {
    const key = String(order.productTitle || order.productSlug || order.productId || 'منتج غير محدد')
    productCounts.set(key, (productCounts.get(key) || 0) + 1)
  })
  const topProducts = Array.from(productCounts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const insights: Array<{ title: string; description: string; severity: 'success' | 'warning' | 'danger' | 'info' }> = []
  if (paymentSubmitted > 0) insights.push({ title: 'مدفوعات تحتاج مراجعة', description: `يوجد ${paymentSubmitted} إثبات دفع بانتظار قرار.`, severity: 'warning' })
  if (bookingNeedsAction > 0) insights.push({ title: 'حجوزات تحتاج متابعة', description: `يوجد ${bookingNeedsAction} حجز يحتاج تأكيد أو إعادة جدولة.`, severity: 'warning' })
  if (unreadMessages > 0) insights.push({ title: 'رسائل جديدة', description: `يوجد ${unreadMessages} رسالة أو lead جديد.`, severity: 'info' })
  if (orderConversion > 0 && orderConversion < 50 && input.orders.length >= 5) insights.push({ title: 'تحسين الدفع مطلوب', description: `نسبة الطلبات المؤكدة ${orderConversion}% فقط. راجع تعليمات الدفع والتذكير.`, severity: 'danger' })
  if (insights.length === 0) insights.push({ title: 'التشغيل مستقر', description: 'لا توجد مؤشرات عاجلة تحتاج إجراء الآن.', severity: 'success' })

  return {
    revenue: revenueOrders + revenueBookings,
    revenue30: paid30.reduce((sum, order) => sum + getAmount(order), 0) + confirmedBookings30.reduce((sum, booking) => sum + getAmount(booking), 0),
    totalOrders: input.orders.length,
    paidOrders: paidOrders.length,
    totalBookings: input.bookings.length,
    confirmedBookings: confirmedBookings.length,
    users: input.users.length,
    messages: input.messages.length,
    unreadMessages,
    orderConversion,
    bookingConversion,
    paymentSubmitted,
    bookingNeedsAction,
    topProducts,
    insights,
  }
}
