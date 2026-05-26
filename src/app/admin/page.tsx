'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import { formatArabicDateTime, formatEGP, formatNumber } from '@/lib/utils/formatters'
import type { Booking, Book, Course, Order, Review, User, AdminLog } from '@/types'
import {
  buildOperationalAlerts,
  getAmount,
  getCustomerName,
  getOperationalHealth,
  getProductTitle,
  isConfirmedBooking,
  isPaidOrder,
  isPublishedProduct,
  isToday,
  orderStatusMeta,
  bookingStatusMeta,
  reviewStatusMeta,
  toMillis,
} from '@/lib/admin/operations'
import { ActionLink, AdminPageHeader, AdminPanel, EmptyState, MetricCard, StatusBadge, ToneBadge } from '@/components/admin/OperationsUI'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'

interface MessageItem {
  id: string
  name?: string
  email?: string
  message?: string
  status?: string
  source?: string
  createdAt?: unknown
}

interface DashboardData {
  orders: Order[]
  bookings: Booking[]
  courses: Course[]
  books: Book[]
  reviews: Review[]
  users: User[]
  protectedItems: Array<Record<string, unknown>>
  messages: MessageItem[]
  logs: AdminLog[]
}

const initialData: DashboardData = {
  orders: [],
  bookings: [],
  courses: [],
  books: [],
  reviews: [],
  users: [],
  protectedItems: [],
  messages: [],
  logs: [],
}

function mapDocs<T>(snap: Awaited<ReturnType<typeof getDocs>>) {
  return snap.docs.map((docItem) => ({ id: docItem.id, ...(docItem.data() as Record<string, unknown>) })) as T[]
}

async function safeGetCollection<T>(name: string) {
  try {
    const snap = await getDocs(collection(db, name))
    return mapDocs<T>(snap)
  } catch (error) {
    console.warn(`Failed to load ${name}`, error)
    return [] as T[]
  }
}

async function safeRecentLogs() {
  try {
    const snap = await getDocs(query(collection(db, 'admin_logs'), orderBy('createdAt', 'desc'), limit(8)))
    return mapDocs<AdminLog>(snap)
  } catch (error) {
    console.warn('Failed to load admin logs', error)
    return [] as AdminLog[]
  }
}

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DashboardData>(initialData)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')

      try {
        const [orders, bookings, courses, books, reviews, users, protectedItems, contactMessages, leads, subscribers, logs] = await Promise.all([
          safeGetCollection<Order>('orders'),
          safeGetCollection<Booking>('bookings'),
          safeGetCollection<Course>('courses'),
          safeGetCollection<Book>('books'),
          safeGetCollection<Review>('reviews'),
          safeGetCollection<User>('users'),
          safeGetCollection<Record<string, unknown>>('protected_content'),
          safeGetCollection<MessageItem>('contact_messages'),
          safeGetCollection<MessageItem>('leads'),
          safeGetCollection<MessageItem>('newsletter_subscribers'),
          safeRecentLogs(),
        ])

        if (!cancelled) {
          setData({
            orders,
            bookings,
            courses,
            books,
            reviews,
            users,
            protectedItems,
            messages: [...contactMessages, ...leads, ...subscribers],
            logs,
          })
        }
      } catch (loadError) {
        console.error('Admin dashboard load error:', loadError)
        if (!cancelled) setError('تعذر تحميل بيانات لوحة التشغيل. راجع اتصال Firebase وصلاحيات الأدمن.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [])

  const summary = useMemo(() => {
    const paidOrders = data.orders.filter(isPaidOrder)
    const revenue = paidOrders.reduce((sum, order) => sum + getAmount(order), 0)
    const sessionRevenue = data.bookings
      .filter((booking) => booking.paymentStatus === 'confirmed' || booking.status === 'completed')
      .reduce((sum, booking) => sum + getAmount(booking), 0)
    const alerts = buildOperationalAlerts(data)
    const health = getOperationalHealth(alerts)
    const actionQueue = [
      ...data.orders
        .filter((order) => ['payment_submitted', 'paid', 'pending'].includes(String(order.status)))
        .map((order) => ({
          id: `order-${order.id}`,
          href: '/admin/orders',
          title: getProductTitle(order),
          description: `طلب من ${getCustomerName(order)} بقيمة ${formatEGP(getAmount(order))}`,
          status: orderStatusMeta[String(order.status)] || orderStatusMeta.pending,
          date: order.createdAt,
        })),
      ...data.bookings
        .filter((booking) => ['pending', 'payment_submitted', 'confirmed'].includes(String(booking.status)) && !(booking.status === 'confirmed' && booking.meetingUrl))
        .map((booking) => ({
          id: `booking-${booking.id}`,
          href: '/admin/bookings',
          title: booking.sessionType || 'جلسة فردية',
          description: `${getCustomerName(booking)} - ${booking.date || 'موعد غير محدد'} ${booking.time || ''}`,
          status: bookingStatusMeta[String(booking.status)] || bookingStatusMeta.pending,
          date: booking.createdAt,
        })),
      ...data.reviews
        .filter((review) => review.status === 'pending')
        .map((review) => ({
          id: `review-${review.id}`,
          href: '/admin/reviews',
          title: 'تقييم يحتاج اعتماد',
          description: review.userName || review.userId || 'عميلة غير محددة',
          status: reviewStatusMeta.pending,
          date: review.createdAt,
        })),
    ]
      .sort((a, b) => toMillis(b.date as never) - toMillis(a.date as never))
      .slice(0, 8)

    return {
      revenue: revenue + sessionRevenue,
      paidOrders: paidOrders.length,
      paymentSubmitted: data.orders.filter((order) => order.status === 'payment_submitted').length,
      pendingBookings: data.bookings.filter((booking) => booking.status === 'pending' || booking.status === 'payment_submitted').length,
      confirmedToday: data.bookings.filter((booking) => isToday(booking.date) && isConfirmedBooking(booking)).length,
      publishedCourses: data.courses.filter(isPublishedProduct).length,
      publishedBooks: data.books.filter(isPublishedProduct).length,
      newMessages: data.messages.filter((message) => !message.status || message.status === 'new').length,
      users: data.users.length,
      alerts,
      health,
      actionQueue,
    }
  }, [data])

  const recentOrders = useMemo(() => [...data.orders].sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt)).slice(0, 5), [data.orders])
  const recentBookings = useMemo(() => [...data.bookings].sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt)).slice(0, 5), [data.bookings])
  const recentMessages = useMemo(() => [...data.messages].sort((a, b) => toMillis(b.createdAt as never) - toMillis(a.createdAt as never)).slice(0, 5), [data.messages])

  if (loading) {
    return (
      <div className="space-y-6">
        <PremiumSkeleton className="h-56" />
        <div className="grid gap-4 md:grid-cols-4">
          <PremiumSkeleton className="h-32" />
          <PremiumSkeleton className="h-32" />
          <PremiumSkeleton className="h-32" />
          <PremiumSkeleton className="h-32" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="لوحة التشغيل اليومية"
        description="ملخص حقيقي لما يحتاج متابعة اليوم: الطلبات، الحجوزات، الرسائل، المحتوى المحمي، وصحة التشغيل."
        actions={
          <>
            <ActionLink href="/admin/orders">مراجعة الطلبات</ActionLink>
            <ActionLink href="/admin/bookings">مراجعة الحجوزات</ActionLink>
          </>
        }
      />

      {error ? <div className="rounded-2xl border border-burgundy/30 bg-burgundy/10 p-4 text-sm font-black text-burgundy dark:text-ivory">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="صحة التشغيل" value={summary.health.label} hint={summary.health.description} tone={summary.health.tone} />
        <MetricCard label="إيرادات مؤكدة" value={formatEGP(summary.revenue)} hint={`${formatNumber(summary.paidOrders)} طلبات مدفوعة أو جلسات مؤكدة`} tone="gold" />
        <MetricCard label="إثباتات تحتاج مراجعة" value={formatNumber(summary.paymentSubmitted)} hint="طلبات دفع مرسلة بانتظار القرار" tone="warning" />
        <MetricCard label="حجوزات تحتاج إجراء" value={formatNumber(summary.pendingBookings)} hint={`${formatNumber(summary.confirmedToday)} جلسات مؤكدة اليوم`} tone="petrol" />
        <MetricCard label="كورسات منشورة" value={formatNumber(summary.publishedCourses)} hint="تأكد من ربط المحتوى المحمي" tone="olive" />
        <MetricCard label="كتب منشورة" value={formatNumber(summary.publishedBooks)} hint="لا تعرض ملفات خاصة في public data" tone="olive" />
        <MetricCard label="رسائل جديدة" value={formatNumber(summary.newMessages)} hint="قنوات التواصل وقائمة الانتظار" tone="gold" />
        <MetricCard label="العملاء" value={formatNumber(summary.users)} hint="مستخدمون مسجلون في المنصة" tone="muted" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <AdminPanel title="قائمة المتابعة" description="كل ما يحتاج إجراء فعلي بدل البحث داخل صفحات كثيرة.">
          {summary.actionQueue.length > 0 ? (
            <div className="space-y-3">
              {summary.actionQueue.map((item) => (
                <Link key={item.id} href={item.href} className="block rounded-2xl border border-sand bg-cream/80 p-4 transition hover:-translate-y-0.5 hover:border-gold dark:border-gold/25 dark:bg-white/10">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h4 className="font-black text-charcoal dark:text-ivory">{item.title}</h4>
                      <p className="mt-1 text-sm font-bold text-warm-gray dark:text-cream">{item.description}</p>
                    </div>
                    <StatusBadge meta={item.status} />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState title="لا توجد إجراءات عاجلة" description="قائمة المتابعة خالية الآن. عند وصول طلب دفع أو حجز أو رسالة جديدة ستظهر هنا فورًا." />
          )}
        </AdminPanel>

        <AdminPanel title="تنبيهات النظام" description="تنبيهات تمنع مشاكل التشغيل قبل أن تظهر للعميلات.">
          {summary.alerts.length > 0 ? (
            <div className="space-y-3">
              {summary.alerts.map((alert) => (
                <Link key={`${alert.href}-${alert.title}`} href={alert.href} className="block rounded-2xl border border-sand bg-cream/80 p-4 transition hover:border-gold dark:border-gold/25 dark:bg-white/10">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h4 className="font-black text-charcoal dark:text-ivory">{alert.title}</h4>
                    <ToneBadge tone={alert.tone}>مراجعة</ToneBadge>
                  </div>
                  <p className="text-sm font-bold leading-6 text-warm-gray dark:text-cream">{alert.description}</p>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState title="التشغيل مستقر" description="لا توجد تنبيهات حماية أو متابعة عاجلة في الوقت الحالي." />
          )}
        </AdminPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <AdminPanel title="آخر الطلبات" description="أحدث طلبات الشراء والدفع." action={<ActionLink href="/admin/orders">كل الطلبات</ActionLink>}>
          {recentOrders.length ? (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div key={order.id} className="rounded-2xl border border-sand bg-cream/70 p-4 dark:border-gold/25 dark:bg-white/10">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="font-black text-charcoal dark:text-ivory">{getProductTitle(order)}</p>
                    <StatusBadge meta={orderStatusMeta[String(order.status)]} fallback={String(order.status)} />
                  </div>
                  <p className="text-xs font-bold text-warm-gray dark:text-cream">{getCustomerName(order)} · {formatEGP(getAmount(order))}</p>
                </div>
              ))}
            </div>
          ) : <EmptyState title="لا توجد طلبات" description="عند إنشاء أول طلب شراء سيظهر هنا للمراجعة." />}
        </AdminPanel>

        <AdminPanel title="آخر الحجوزات" description="طلبات الجلسات والتأكيدات." action={<ActionLink href="/admin/bookings">كل الحجوزات</ActionLink>}>
          {recentBookings.length ? (
            <div className="space-y-3">
              {recentBookings.map((booking) => (
                <div key={booking.id} className="rounded-2xl border border-sand bg-cream/70 p-4 dark:border-gold/25 dark:bg-white/10">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="font-black text-charcoal dark:text-ivory">{getCustomerName(booking)}</p>
                    <StatusBadge meta={bookingStatusMeta[String(booking.status)]} fallback={String(booking.status)} />
                  </div>
                  <p className="text-xs font-bold text-warm-gray dark:text-cream">{booking.date || 'موعد غير محدد'} · {booking.time || ''}</p>
                </div>
              ))}
            </div>
          ) : <EmptyState title="لا توجد حجوزات" description="طلبات الجلسات ستظهر هنا فور إنشائها من الموقع." />}
        </AdminPanel>

        <AdminPanel title="آخر الرسائل" description="رسائل التواصل وقائمة الانتظار." action={<ActionLink href="/admin/messages">كل الرسائل</ActionLink>}>
          {recentMessages.length ? (
            <div className="space-y-3">
              {recentMessages.map((message) => (
                <div key={message.id} className="rounded-2xl border border-sand bg-cream/70 p-4 dark:border-gold/25 dark:bg-white/10">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="font-black text-charcoal dark:text-ivory">{message.name || message.email || 'رسالة جديدة'}</p>
                    <ToneBadge tone={!message.status || message.status === 'new' ? 'warning' : 'muted'}>{message.status || 'new'}</ToneBadge>
                  </div>
                  <p className="line-clamp-2 text-xs font-bold leading-5 text-warm-gray dark:text-cream">{message.message || message.source || formatArabicDateTime(message.createdAt as never)}</p>
                </div>
              ))}
            </div>
          ) : <EmptyState title="لا توجد رسائل" description="رسائل التواصل والانتظار ستظهر هنا للمراجعة والمتابعة." />}
        </AdminPanel>
      </div>

      <AdminPanel title="آخر إجراءات الأدمن" description="سجل مختصر لأحدث الإجراءات التشغيلية.">
        {data.logs.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {data.logs.map((log) => (
              <div key={log.id} className="rounded-2xl border border-sand bg-cream/70 p-4 dark:border-gold/25 dark:bg-white/10">
                <p className="font-black text-charcoal dark:text-ivory">{log.action}</p>
                <p className="mt-1 text-xs font-bold text-warm-gray dark:text-cream">{log.targetType || 'system'} · {formatArabicDateTime(log.createdAt)}</p>
              </div>
            ))}
          </div>
        ) : <EmptyState title="لا يوجد سجل بعد" description="كل إجراء حساس داخل الأدمن سيظهر هنا بعد تنفيذه." />}
      </AdminPanel>
    </div>
  )
}
