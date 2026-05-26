'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import type { Booking, Order, User } from '@/types'
import { formatEGP, formatNumber } from '@/lib/utils/formatters'
import { getAmount, isPaidOrder, toMillis } from '@/lib/admin/operations'
import { AdminPageHeader, AdminPanel, EmptyState, Field, inputClass, MetricCard, ToneBadge } from '@/components/admin/OperationsUI'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'

interface MessageItem { id: string; status?: string; source?: string; createdAt?: unknown }

type Range = 'today' | '7d' | '30d' | 'all'

function mapDocs<T>(snapshot: Awaited<ReturnType<typeof getDocs>>) {
  return snapshot.docs.map((docItem) => ({ id: docItem.id, ...(docItem.data() as Record<string, unknown>) })) as T[]
}

function inRange(value: unknown, range: Range) {
  if (range === 'all') return true
  const time = toMillis(value as never)
  if (!time) return false
  const now = Date.now()
  const days = range === 'today' ? 1 : range === '7d' ? 7 : 30
  return now - time <= days * 24 * 60 * 60 * 1000
}

export default function AdminAnalyticsPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<Range>('30d')
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [ordersSnap, bookingsSnap, usersSnap, contactSnap, leadsSnap, newsSnap] = await Promise.all([
          getDocs(collection(db, 'orders')),
          getDocs(collection(db, 'bookings')),
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'contact_messages')),
          getDocs(collection(db, 'leads')),
          getDocs(collection(db, 'newsletter_subscribers')),
        ])
        setOrders(mapDocs<Order>(ordersSnap))
        setBookings(mapDocs<Booking>(bookingsSnap))
        setUsers(mapDocs<User>(usersSnap))
        setMessages([...mapDocs<MessageItem>(contactSnap), ...mapDocs<MessageItem>(leadsSnap), ...mapDocs<MessageItem>(newsSnap)])
      } catch (loadError) {
        console.error('Analytics load error:', loadError)
        setError('تعذر تحميل التحليلات.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const analytics = useMemo(() => {
    const rangeOrders = orders.filter((order) => inRange(order.createdAt, range))
    const rangeBookings = bookings.filter((booking) => inRange(booking.createdAt, range))
    const rangeUsers = users.filter((user) => inRange(user.createdAt, range))
    const rangeMessages = messages.filter((message) => inRange(message.createdAt, range))
    const paidOrders = rangeOrders.filter(isPaidOrder)
    const orderRevenue = paidOrders.reduce((sum, order) => sum + getAmount(order), 0)
    const sessionRevenue = rangeBookings.filter((booking) => booking.paymentStatus === 'confirmed' || booking.status === 'completed').reduce((sum, booking) => sum + getAmount(booking), 0)
    const topProductMap = new Map<string, number>()
    rangeOrders.forEach((order) => {
      const key = order.productId || order.productType || 'غير محدد'
      topProductMap.set(key, (topProductMap.get(key) || 0) + 1)
    })
    const topProduct = [...topProductMap.entries()].sort((a, b) => b[1] - a[1])[0]
    const insights: string[] = []
    if (rangeOrders.filter((order) => order.status === 'payment_submitted').length > 0) insights.push('يوجد إثباتات دفع تحتاج مراجعة قبل فتح المحتوى.')
    if (rangeBookings.filter((booking) => booking.status === 'pending').length > 0) insights.push('يوجد حجوزات جديدة تحتاج تأكيد موعد أو متابعة دفع.')
    if (rangeMessages.filter((message) => !message.status || message.status === 'new').length > 0) insights.push('هناك رسائل أو leads جديدة يمكن تحويلها لمبيعات أو جلسات.')
    if (paidOrders.length === 0 && rangeOrders.length > 0) insights.push('يوجد طلبات خلال الفترة لكن لا توجد مدفوعات مؤكدة بعد.')
    if (insights.length === 0) insights.push('لا توجد مؤشرات عاجلة في الفترة المختارة.')

    return {
      orders: rangeOrders.length,
      paidOrders: paidOrders.length,
      revenue: orderRevenue + sessionRevenue,
      bookings: rangeBookings.length,
      confirmedBookings: rangeBookings.filter((booking) => booking.status === 'confirmed' || booking.status === 'completed').length,
      users: rangeUsers.length,
      messages: rangeMessages.length,
      conversionRate: rangeOrders.length ? Math.round((paidOrders.length / rangeOrders.length) * 100) : 0,
      topProduct: topProduct ? `${topProduct[0]} (${topProduct[1]})` : 'لا توجد بيانات كافية',
      insights,
    }
  }, [bookings, messages, orders, range, users])

  if (loading) return <PremiumSkeleton className="h-[28rem]" />

  return (
    <div className="space-y-8">
      <AdminPageHeader title="تحليلات وملخصات صادقة" description="لا توجد أرقام وهمية أو Charts شكلية. كل رقم هنا محسوب من بيانات Firestore الموجودة فعليًا." />
      {error ? <div className="rounded-2xl border border-burgundy/25 bg-burgundy/10 p-4 text-sm font-black text-burgundy dark:text-ivory">{error}</div> : null}

      <AdminPanel title="الفترة الزمنية" description="اختاري الفترة التي تريدين مراجعتها.">
        <Field label="الفترة">
          <select className={inputClass} value={range} onChange={(event) => setRange(event.target.value as Range)}>
            <option value="today">اليوم</option>
            <option value="7d">آخر 7 أيام</option>
            <option value="30d">آخر 30 يوم</option>
            <option value="all">كل الوقت</option>
          </select>
        </Field>
      </AdminPanel>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="الإيرادات المؤكدة" value={formatEGP(analytics.revenue)} tone="gold" />
        <MetricCard label="الطلبات" value={formatNumber(analytics.orders)} hint={`${formatNumber(analytics.paidOrders)} مدفوعة`} tone="petrol" />
        <MetricCard label="نسبة الدفع" value={`${analytics.conversionRate}%`} hint="من الطلبات إلى دفع مؤكد" tone="success" />
        <MetricCard label="الحجوزات" value={formatNumber(analytics.bookings)} hint={`${formatNumber(analytics.confirmedBookings)} مؤكدة أو مكتملة`} tone="olive" />
        <MetricCard label="عملاء جدد" value={formatNumber(analytics.users)} tone="muted" />
        <MetricCard label="رسائل/Leads" value={formatNumber(analytics.messages)} tone="warning" />
        <MetricCard label="أكثر منتج طلبًا" value={analytics.topProduct} tone="gold" />
        <MetricCard label="مصدر البيانات" value="Firestore" hint="بدون بيانات افتراضية" tone="muted" />
      </div>

      <AdminPanel title="Insights تشغيلية" description="استنتاجات بسيطة من البيانات تساعدك تعرفي ماذا تراجعين الآن.">
        {analytics.insights.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {analytics.insights.map((insight) => (
              <div key={insight} className="rounded-2xl border border-sand bg-cream/80 p-4 dark:border-gold/25 dark:bg-white/10">
                <ToneBadge tone={insight.includes('عاجلة') ? 'success' : 'warning'}>Insight</ToneBadge>
                <p className="mt-3 text-sm font-bold leading-7 text-charcoal dark:text-ivory">{insight}</p>
              </div>
            ))}
          </div>
        ) : <EmptyState title="لا توجد بيانات كافية" description="عند وصول طلبات وحجوزات ورسائل أكثر ستظهر الاستنتاجات هنا." />}
      </AdminPanel>
    </div>
  )
}
