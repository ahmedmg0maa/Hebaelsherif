'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'
import { formatEGP } from '@/lib/utils/formatters'
import type { Booking, Book, Course, Order } from '@/types'

interface AdminDashboardStats {
  revenue: number
  paidOrders: number
  pendingOrders: number
  pendingBookings: number
  confirmedBookings: number
  publishedCourses: number
  publishedBooks: number
}

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<AdminDashboardStats>({
    revenue: 0,
    paidOrders: 0,
    pendingOrders: 0,
    pendingBookings: 0,
    confirmedBookings: 0,
    publishedCourses: 0,
    publishedBooks: 0,
  })

  useEffect(() => {
    async function loadStats() {
      setLoading(true)

      const [ordersSnap, bookingsSnap, coursesSnap, booksSnap] = await Promise.all([
        getDocs(collection(db, 'orders')),
        getDocs(collection(db, 'bookings')),
        getDocs(collection(db, 'courses')),
        getDocs(collection(db, 'books')),
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

      const paidOrders = orders.filter((order) => order.status === 'paid')
      const pendingOrders = orders.filter((order) => order.status === 'pending')

      setStats({
        revenue: paidOrders.reduce((sum, order) => sum + Number(order.amount || 0), 0),
        paidOrders: paidOrders.length,
        pendingOrders: pendingOrders.length,
        pendingBookings: bookings.filter((booking) => booking.status === 'pending').length,
        confirmedBookings: bookings.filter((booking) => booking.status === 'confirmed').length,
        publishedCourses: courses.filter((course) => course.status === 'published').length,
        publishedBooks: books.filter((book) => book.status === 'published').length,
      })

      setLoading(false)
    }

    loadStats().catch((error) => {
      console.error('Admin dashboard stats error:', error)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div>
        <PremiumSkeleton className="mb-8 h-10 w-72" />
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
    <div>
      <div className="mb-8">
        <p className="mb-2 text-sm font-bold text-gold">نظرة عامة</p>
        <h2 className="text-3xl font-black text-charcoal">إحصائيات المنصة</h2>
        <p className="mt-3 max-w-2xl text-sm leading-8 text-warm-gray">
          متابعة سريعة للإيرادات، الطلبات، الحجوزات، والمحتوى المنشور.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          label="إجمالي الإيرادات"
          value={formatEGP(stats.revenue)}
          href="/admin/orders"
        />

        <AdminStatCard
          label="طلبات مدفوعة"
          value={stats.paidOrders}
          href="/admin/orders"
        />

        <AdminStatCard
          label="طلبات بانتظار التأكيد"
          value={stats.pendingOrders}
          href="/admin/orders"
          tone="gold"
        />

        <AdminStatCard
          label="حجوزات بانتظار التأكيد"
          value={stats.pendingBookings}
          href="/admin/bookings"
          tone="gold"
        />

        <AdminStatCard
          label="حجوزات مؤكدة"
          value={stats.confirmedBookings}
          href="/admin/bookings"
          tone="olive"
        />

        <AdminStatCard
          label="كورسات منشورة"
          value={stats.publishedCourses}
          href="/admin/courses"
        />

        <AdminStatCard
          label="كتب منشور"
          value={stats.publishedBooks}
          href="/admin/books"
        />
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        <QuickActionCard
          title="إدارة الطلبات"
          description="راجعي طلبات الشراء، أكدي المدفوعات، أو ألغِ الطلبات غير المكتملة."
          href="/admin/orders"
          action="فتح الطلبات"
        />

        <QuickActionCard
          title="إدارة الحجوزات"
          description="راجعي طلبات الجلسات، أكدي المواعيد، أو حددي الجلسات المكتملة."
          href="/admin/bookings"
          action="فتح الحجوزات"
        />
      </div>
    </div>
  )
}

function AdminStatCard({
  label,
  value,
  href,
  tone = 'petrol',
}: {
  label: string
  value: string | number
  href: string
  tone?: 'petrol' | 'gold' | 'olive'
}) {
  const valueColor = {
    petrol: 'text-petrol',
    gold: 'text-gold',
    olive: 'text-olive',
  }[tone]

  return (
    <Link
      href={href}
      className="rounded-3xl border border-sand bg-ivory p-6 shadow-soft transition hover:-translate-y-1 hover:shadow-premium"
    >
      <p className="text-sm font-bold text-warm-gray">{label}</p>
      <strong className={`mt-3 block text-3xl font-black ${valueColor}`}>{value}</strong>
      <span className="mt-4 block text-xs font-bold text-gold">عرض التفاصيل</span>
    </Link>
  )
}

function QuickActionCard({
  title,
  description,
  href,
  action,
}: {
  title: string
  description: string
  href: string
  action: string
}) {
  return (
    <Link
      href={href}
      className="rounded-3xl border border-sand bg-ivory p-7 shadow-soft transition hover:-translate-y-1 hover:shadow-premium"
    >
      <h3 className="text-xl font-black text-charcoal">{title}</h3>
      <p className="mt-3 text-sm leading-8 text-warm-gray">{description}</p>
      <span className="mt-5 inline-block rounded-full bg-petrol px-5 py-2 text-xs font-bold text-cream">
        {action}
      </span>
    </Link>
  )
}