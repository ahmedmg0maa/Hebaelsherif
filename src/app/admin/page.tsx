'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import BrandDivider from '@/components/brand/BrandDivider'
import BrandMark from '@/components/brand/BrandMark'
import PremiumBadge from '@/components/ui/PremiumBadge'
import PremiumButton from '@/components/ui/PremiumButton'
import PremiumCard from '@/components/ui/PremiumCard'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'
import { formatArabicDate, formatEGP } from '@/lib/utils/formatters'
import type { Booking, Book, Course, Order, Review, User } from '@/types'

interface AdminDashboardStats {
  revenue: number
  paidOrders: number
  pendingOrders: number
  submittedPayments: number
  pendingBookings: number
  confirmedBookings: number
  publishedCourses: number
  publishedBooks: number
  pendingReviews: number
  users: number
}

interface RecentOrder extends Order {
  productTitle?: string
}

interface RecentBooking extends Booking {
  userLabel?: string
}

const launchChecklist = [
  { label: 'طلبات الدفع المعلقة', href: '/admin/orders', tone: 'gold' },
  { label: 'حجوزات تحتاج تأكيد', href: '/admin/bookings', tone: 'petrol' },
  { label: 'تقييمات بانتظار المراجعة', href: '/admin/reviews', tone: 'olive' },
  { label: 'روابط المحتوى المحمي', href: '/admin/content', tone: 'burgundy' },
] as const

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<AdminDashboardStats>({
    revenue: 0,
    paidOrders: 0,
    pendingOrders: 0,
    submittedPayments: 0,
    pendingBookings: 0,
    confirmedBookings: 0,
    publishedCourses: 0,
    publishedBooks: 0,
    pendingReviews: 0,
    users: 0,
  })
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([])

  useEffect(() => {
    async function loadStats() {
      setLoading(true)

      const [ordersSnap, bookingsSnap, coursesSnap, booksSnap, reviewsSnap, usersSnap] = await Promise.all([
        getDocs(collection(db, 'orders')),
        getDocs(collection(db, 'bookings')),
        getDocs(collection(db, 'courses')),
        getDocs(collection(db, 'books')),
        getDocs(collection(db, 'reviews')),
        getDocs(collection(db, 'users')),
      ])

      const orders = ordersSnap.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data(),
      })) as Order[]

      const bookings = bookingsSnap.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data(),
      })) as Booking[]

      const courses = coursesSnap.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data(),
      })) as Course[]

      const books = booksSnap.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data(),
      })) as Book[]

      const reviews = reviewsSnap.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data(),
      })) as Review[]

      const users = usersSnap.docs.map((docItem) => ({
        uid: docItem.id,
        ...docItem.data(),
      })) as User[]

      const paidOrders = orders.filter((order) => order.status === 'paid')
      const pendingOrders = orders.filter((order) => order.status === 'pending')
      const submittedPayments = orders.filter((order) => order.status === 'payment_submitted')
      const pendingBookings = bookings.filter((booking) => booking.status === 'pending')
      const confirmedBookings = bookings.filter((booking) => booking.status === 'confirmed')

      setStats({
        revenue: paidOrders.reduce((sum, order) => sum + Number(order.amount || 0), 0),
        paidOrders: paidOrders.length,
        pendingOrders: pendingOrders.length,
        submittedPayments: submittedPayments.length,
        pendingBookings: pendingBookings.length,
        confirmedBookings: confirmedBookings.length,
        publishedCourses: courses.filter((course) => course.status === 'published').length,
        publishedBooks: books.filter((book) => book.status === 'published').length,
        pendingReviews: reviews.filter((review) => review.status === 'pending').length,
        users: users.length,
      })

      const productTitleById = new Map<string, string>()
      courses.forEach((course) => productTitleById.set(course.id, course.title))
      books.forEach((book) => productTitleById.set(book.id, book.title))

      setRecentOrders(
        [...orders]
          .sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt))
          .slice(0, 5)
          .map((order) => ({
            ...order,
            productTitle: productTitleById.get(order.productId) || 'منتج غير محدد',
          })),
      )

      setRecentBookings(
        [...bookings]
          .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`))
          .slice(0, 5)
          .map((booking) => ({
            ...booking,
            userLabel: booking.name || booking.email,
          })),
      )

      setLoading(false)
    }

    loadStats().catch((error) => {
      console.error('Admin dashboard stats error:', error)
      setLoading(false)
    })
  }, [])

  const conversionSignal = useMemo(() => {
    const totalOrders = stats.paidOrders + stats.pendingOrders + stats.submittedPayments
    if (totalOrders === 0) return 0
    return Math.round((stats.paidOrders / totalOrders) * 100)
  }, [stats])

  if (loading) {
    return (
      <div>
        <PremiumSkeleton className="mb-8 h-44" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <PremiumSkeleton className="h-36" />
          <PremiumSkeleton className="h-36" />
          <PremiumSkeleton className="h-36" />
          <PremiumSkeleton className="h-36" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <section className="paper-texture relative overflow-hidden rounded-[2.5rem] border border-gold/18 bg-deepTeal p-7 text-ivory shadow-botanical md:p-9">
        <div className="absolute -left-16 -top-16 h-72 w-72 rounded-full bg-gold/18 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-aqua/10 blur-3xl" />
        <div className="relative grid gap-8 xl:grid-cols-[1fr_360px] xl:items-center">
          <div>
            <PremiumBadge variant="gold">Command Center</PremiumBadge>
            <h2 className="mt-5 max-w-3xl text-4xl font-black leading-tight md:text-6xl">
              لوحة قيادة البراند من المحتوى إلى التحويل.
            </h2>
            <p className="mt-5 max-w-2xl text-sm font-bold leading-8 text-ivory/70 md:text-base">
              راقبي الطلبات، الحجوزات، المحتوى، والتقييمات من مركز واحد مصمم لتشغيل براند عربي فاخر بثقة ووضوح.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <PremiumButton href="/admin/orders" variant="gold">
                مراجعة الطلبات
              </PremiumButton>
              <PremiumButton href="/admin/bookings" variant="outline" className="border-ivory/50 text-ivory hover:bg-ivory hover:text-deepTeal">
                الحجوزات القادمة
              </PremiumButton>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/8 p-5 backdrop-blur-sm">
            <BrandMark href="" size="md" className="[&_.text-charcoal]:text-ivory [&_.text-warm-gray]:text-ivory/60" />
            <BrandDivider className="mt-5" />
            <div className="mt-5 grid gap-3">
              <Signal label="نسبة تأكيد الطلبات" value={`${conversionSignal}%`} />
              <Signal label="حجوزات مؤكدة" value={stats.confirmedBookings} />
              <Signal label="مراجعات معلقة" value={stats.pendingReviews} />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="إجمالي الإيرادات" value={formatEGP(stats.revenue)} href="/admin/orders" tone="petrol" />
        <AdminStatCard label="طلبات مدفوعة" value={stats.paidOrders} href="/admin/orders" tone="olive" />
        <AdminStatCard label="مدفوعات تنتظر المراجعة" value={stats.submittedPayments} href="/admin/orders" tone="gold" />
        <AdminStatCard label="حجوزات بانتظار التأكيد" value={stats.pendingBookings} href="/admin/bookings" tone="burgundy" />
        <AdminStatCard label="حجوزات مؤكدة" value={stats.confirmedBookings} href="/admin/bookings" tone="olive" />
        <AdminStatCard label="كورسات منشورة" value={stats.publishedCourses} href="/admin/courses" tone="petrol" />
        <AdminStatCard label="كتب منشورة" value={stats.publishedBooks} href="/admin/books" tone="gold" />
        <AdminStatCard label="مستخدمون" value={stats.users} href="/admin/users" tone="petrol" />
      </div>

      <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <PremiumCard className="p-6 md:p-7">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="mini-label">أحدث الطلبات</p>
              <h3 className="brand-title mt-2 text-2xl font-black text-charcoal">مؤشر التحويل والدفع</h3>
            </div>
            <PremiumButton href="/admin/orders" variant="outline" size="sm">
              عرض الكل
            </PremiumButton>
          </div>

          <div className="space-y-3">
            {recentOrders.length > 0 ? (
              recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href="/admin/orders"
                  className="grid gap-4 rounded-[1.5rem] border border-sand bg-cream/70 p-4 transition hover:border-gold/40 hover:bg-ivory md:grid-cols-[1fr_150px_120px] md:items-center"
                >
                  <div>
                    <p className="font-black text-charcoal">{order.productTitle}</p>
                    <p className="mt-1 text-xs font-bold text-warm-gray">
                      {order.productType === 'course' ? 'كورس' : 'كتاب'} · {formatArabicDate(order.createdAt)}
                    </p>
                  </div>
                  <p className="text-sm font-black text-petrol">{formatEGP(order.amount)}</p>
                  <OrderPill status={order.status} />
                </Link>
              ))
            ) : (
              <EmptyMini title="لا توجد طلبات بعد" href="/admin/orders" />
            )}
          </div>
        </PremiumCard>

        <div className="space-y-5">
          <PremiumCard className="p-6">
            <p className="mini-label">قائمة العمل اليومي</p>
            <h3 className="brand-title mt-2 text-2xl font-black text-charcoal">أولويات الإدارة</h3>
            <div className="mt-5 grid gap-3">
              {launchChecklist.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between rounded-2xl border border-sand bg-cream/70 px-4 py-3 text-sm font-bold text-charcoal transition hover:border-gold/40 hover:text-petrol"
                >
                  <span>{item.label}</span>
                  <span className="text-gold">←</span>
                </Link>
              ))}
            </div>
          </PremiumCard>

          <PremiumCard className="p-6">
            <p className="mini-label">الجلسات القادمة</p>
            <h3 className="brand-title mt-2 text-2xl font-black text-charcoal">تقويم مختصر</h3>
            <div className="mt-5 space-y-3">
              {recentBookings.length > 0 ? (
                recentBookings.map((booking) => (
                  <Link key={booking.id} href="/admin/bookings" className="block rounded-2xl border border-sand bg-cream/70 p-4 transition hover:border-gold/40">
                    <p className="font-black text-charcoal">{booking.userLabel}</p>
                    <p className="mt-1 text-xs font-bold text-warm-gray">
                      {booking.date} · {booking.time} · {booking.duration} دقيقة
                    </p>
                  </Link>
                ))
              ) : (
                <EmptyMini title="لا توجد حجوزات قريبة" href="/admin/bookings" />
              )}
            </div>
          </PremiumCard>
        </div>
      </section>
    </div>
  )
}

function getTime(value: { toDate: () => Date } | Date | undefined) {
  if (!value) return 0
  if (value instanceof Date) return value.getTime()
  return value.toDate().getTime()
}

function Signal({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/7 px-4 py-3">
      <p className="text-[11px] font-bold text-ivory/55">{label}</p>
      <p className="mt-1 text-2xl font-black text-gold">{value}</p>
    </div>
  )
}

function AdminStatCard({
  label,
  value,
  href,
  tone,
}: {
  label: string
  value: string | number
  href: string
  tone: 'petrol' | 'gold' | 'olive' | 'burgundy'
}) {
  const toneClasses = {
    petrol: 'text-petrol bg-petrol/10 border-petrol/15',
    gold: 'text-gold bg-gold/10 border-gold/20',
    olive: 'text-olive bg-olive/10 border-olive/15',
    burgundy: 'text-burgundy bg-burgundy/10 border-burgundy/15',
  }[tone]

  return (
    <Link href={href} className="group brand-rich-card block rounded-[2rem] p-6 transition hover:-translate-y-1 hover:shadow-botanical">
      <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black ${toneClasses}`}>مباشر</span>
      <p className="mt-5 text-sm font-bold text-warm-gray">{label}</p>
      <strong className="mt-3 block text-3xl font-black text-charcoal md:text-4xl">{value}</strong>
      <span className="mt-5 inline-flex text-xs font-black text-gold transition group-hover:text-petrol">فتح التفاصيل ←</span>
    </Link>
  )
}

function OrderPill({ status }: { status: string }) {
  const label: Record<string, string> = {
    pending: 'بانتظار',
    payment_submitted: 'دفع مرسل',
    paid: 'مدفوع',
    failed: 'فشل',
    refunded: 'مسترد',
    cancelled: 'ملغي',
  }

  return (
    <span className="rounded-full border border-gold/20 bg-gold/10 px-3 py-1 text-center text-xs font-black text-gold">
      {label[status] || status}
    </span>
  )
}

function EmptyMini({ title, href }: { title: string; href: string }) {
  return (
    <Link href={href} className="block rounded-2xl border border-dashed border-sand bg-cream/60 p-5 text-center text-sm font-bold text-warm-gray transition hover:border-gold/40 hover:text-petrol">
      {title}
    </Link>
  )
}
