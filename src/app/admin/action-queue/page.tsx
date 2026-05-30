'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import type { Booking, Book, Course, Order, Review } from '@/types'
import { formatArabicDateTime, formatEGP } from '@/lib/utils/formatters'
import {
  buildOperationalAlerts,
  getAmount,
  getCustomerName,
  getOperationalHealth,
  getProductTitle,
  orderStatusMeta,
  bookingStatusMeta,
  reviewStatusMeta,
  messageStatusMeta,
  toMillis,
  type StatusMeta,
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

interface QueueItem {
  id: string
  type: 'order' | 'booking' | 'review' | 'message' | 'content'
  title: string
  description: string
  href: string
  date?: unknown
  meta: StatusMeta
  priority: 1 | 2 | 3
  actionLabel: string
}

function mapDocs<T>(snapshot: Awaited<ReturnType<typeof getDocs>>) {
  return snapshot.docs.map((docItem) => ({ id: docItem.id, ...(docItem.data() as Record<string, unknown>) })) as T[]
}

async function safeLoad<T>(name: string) {
  try {
    const snap = await getDocs(collection(db, name))
    return mapDocs<T>(snap)
  } catch (error) {
    console.warn(`Failed to load ${name}`, error)
    return [] as T[]
  }
}

export default function AdminActionQueuePage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [books, setBooks] = useState<Book[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [protectedItems, setProtectedItems] = useState<Array<Record<string, unknown>>>([])
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')
      try {
        const [ordersData, bookingsData, coursesData, booksData, reviewsData, protectedData, contactData, leadsData, subscribersData] = await Promise.all([
          safeLoad<Order>('orders'),
          safeLoad<Booking>('bookings'),
          safeLoad<Course>('courses'),
          safeLoad<Book>('books'),
          safeLoad<Review>('reviews'),
          safeLoad<Record<string, unknown>>('protected_content'),
          safeLoad<MessageItem>('contact_messages'),
          safeLoad<MessageItem>('leads'),
          safeLoad<MessageItem>('newsletter_subscribers'),
        ])

        if (!cancelled) {
          setOrders(ordersData)
          setBookings(bookingsData)
          setCourses(coursesData)
          setBooks(booksData)
          setReviews(reviewsData)
          setProtectedItems(protectedData)
          setMessages([...contactData, ...leadsData, ...subscribersData])
        }
      } catch (loadError) {
        console.error('Action queue load error:', loadError)
        if (!cancelled) setError('تعذر تحميل قائمة المتابعة. راجع صلاحيات الأدمن واتصال Firebase.')
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
    const alerts = buildOperationalAlerts({ orders, bookings, courses, books, protectedItems, messages })
    const health = getOperationalHealth(alerts)

    const queue: QueueItem[] = [
      ...orders
        .filter((order) => ['pending', 'awaiting_payment', 'payment_submitted', 'paid', 'rejected'].includes(String(order.status)))
        .map((order): QueueItem => ({
          id: `order-${order.id}`,
          type: 'order',
          title: getProductTitle(order),
          description: `${getCustomerName(order)} · ${formatEGP(getAmount(order))}`,
          href: '/admin/orders',
          date: order.createdAt,
          meta: orderStatusMeta[String(order.status)] || orderStatusMeta.pending,
          priority: order.status === 'payment_submitted' || order.status === 'paid' ? 1 : 2,
          actionLabel: order.status === 'paid' ? 'فتح المحتوى' : 'مراجعة الطلب',
        })),
      ...bookings
        .filter((booking) => ['pending', 'awaiting_payment', 'payment_submitted', 'confirmed', 'reschedule_requested'].includes(String(booking.status)) && !(booking.status === 'confirmed' && booking.meetingUrl))
        .map((booking): QueueItem => ({
          id: `booking-${booking.id}`,
          type: 'booking',
          title: booking.sessionType || 'جلسة فردية',
          description: `${getCustomerName(booking)} · ${booking.date || 'تاريخ غير محدد'} ${booking.time || ''}`,
          href: '/admin/bookings',
          date: booking.createdAt,
          meta: bookingStatusMeta[String(booking.status)] || bookingStatusMeta.pending,
          priority: booking.status === 'confirmed' && !booking.meetingUrl ? 1 : 2,
          actionLabel: booking.status === 'confirmed' ? 'إضافة رابط الجلسة' : 'مراجعة الحجز',
        })),
      ...reviews
        .filter((review) => review.status === 'pending')
        .map((review): QueueItem => ({
          id: `review-${review.id}`,
          type: 'review',
          title: 'تقييم بانتظار الاعتماد',
          description: review.userName || review.userId || 'عميلة غير محددة',
          href: '/admin/reviews',
          date: review.createdAt,
          meta: reviewStatusMeta.pending,
          priority: 3,
          actionLabel: 'مراجعة التقييم',
        })),
      ...messages
        .filter((message) => !message.status || message.status === 'new' || message.status === 'important')
        .map((message): QueueItem => ({
          id: `message-${message.id}`,
          type: 'message',
          title: message.name || message.email || 'رسالة جديدة',
          description: message.message || message.source || 'تحتاج قراءة ومتابعة',
          href: '/admin/messages',
          date: message.createdAt,
          meta: message.status === 'important' ? messageStatusMeta.important : messageStatusMeta.new,
          priority: message.status === 'important' ? 1 : 3,
          actionLabel: 'فتح الرسالة',
        })),
    ]
      .sort((a, b) => a.priority - b.priority || toMillis(b.date as never) - toMillis(a.date as never))
      .slice(0, 40)

    return {
      alerts,
      health,
      queue,
      priorityOne: queue.filter((item) => item.priority === 1).length,
      payments: orders.filter((order) => order.status === 'payment_submitted').length,
      bookings: bookings.filter((booking) => booking.status === 'pending' || booking.status === 'payment_submitted').length,
      messages: messages.filter((message) => !message.status || message.status === 'new').length,
    }
  }, [bookings, books, courses, messages, orders, protectedItems, reviews])

  if (loading) {
    return (
      <div className="space-y-6">
        <PremiumSkeleton className="h-52" />
        <div className="grid gap-4 md:grid-cols-4">
          <PremiumSkeleton className="h-28" />
          <PremiumSkeleton className="h-28" />
          <PremiumSkeleton className="h-28" />
          <PremiumSkeleton className="h-28" />
        </div>
        <PremiumSkeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Global Premium Operations"
        title="قائمة المتابعة الذكية"
        description="تجمع كل ما يحتاج إجراء فعلي في مكان واحد: الدفع، الحجز، الرسائل، التقييمات، وتنبيهات حماية المحتوى."
        actions={
          <>
            <ActionLink href="/admin/orders">الطلبات</ActionLink>
            <ActionLink href="/admin/bookings">الحجوزات</ActionLink>
            <ActionLink href="/admin/messages">الرسائل</ActionLink>
          </>
        }
      />

      {error ? <div className="rounded-2xl border border-burgundy/30 bg-burgundy/10 p-4 text-sm font-black text-burgundy dark:text-ivory">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="صحة التشغيل" value={summary.health.label} hint={summary.health.description} tone={summary.health.tone} />
        <MetricCard label="أولوية عالية" value={summary.priorityOne} hint="عناصر تحتاج إجراء سريع" tone={summary.priorityOne ? 'danger' : 'success'} />
        <MetricCard label="إثباتات دفع" value={summary.payments} hint="بانتظار مراجعة الدفع" tone="warning" />
        <MetricCard label="رسائل جديدة" value={summary.messages} hint="تحتاج قراءة أو متابعة" tone="gold" />
      </div>

      {summary.alerts.length > 0 ? (
        <AdminPanel title="تنبيهات النظام" description="تحذيرات تشغيلية تمنع مشاكل الحماية أو التأخير قبل أن تظهر للعميلة.">
          <div className="grid gap-3 md:grid-cols-2">
            {summary.alerts.map((alert) => (
              <Link key={`${alert.href}-${alert.title}`} href={alert.href} className="rounded-2xl border border-sand bg-cream/70 p-4 transition hover:-translate-y-0.5 hover:border-gold dark:border-gold/25 dark:bg-white/10">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-charcoal dark:text-ivory">{alert.title}</h3>
                    <p className="mt-2 text-xs font-bold leading-6 text-warm-gray dark:text-cream">{alert.description}</p>
                  </div>
                  <ToneBadge tone={alert.tone}>تنبيه</ToneBadge>
                </div>
              </Link>
            ))}
          </div>
        </AdminPanel>
      ) : null}

      <AdminPanel title="قائمة الإجراءات" description="لا توجد أرقام أو عناصر وهمية هنا؛ كل عنصر مبني على بيانات Firestore الحالية.">
        {summary.queue.length > 0 ? (
          <div className="space-y-3">
            {summary.queue.map((item) => (
              <Link key={item.id} href={item.href} className="block rounded-2xl border border-sand bg-ivory/88 p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-gold dark:border-gold/25 dark:bg-white/10">
                <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto] lg:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge meta={item.meta} />
                      <ToneBadge tone={item.priority === 1 ? 'danger' : item.priority === 2 ? 'warning' : 'muted'}>
                        أولوية {item.priority}
                      </ToneBadge>
                    </div>
                    <h3 className="mt-3 text-lg font-black text-charcoal dark:text-ivory">{item.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm font-bold leading-7 text-warm-gray dark:text-cream">{item.description}</p>
                    {item.date ? <p className="mt-2 text-[11px] font-bold text-warm-gray dark:text-cream">{formatArabicDateTime(item.date as never)}</p> : null}
                  </div>
                  <span className="rounded-full border border-gold/35 px-4 py-2 text-center text-xs font-black text-gold">{item.actionLabel}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            title="لا توجد عناصر متابعة الآن"
            description="عند وصول طلب جديد، إثبات دفع، حجز، رسالة، أو تقييم بانتظار الاعتماد، سيظهر هنا مباشرة."
          />
        )}
      </AdminPanel>
    </div>
  )
}
