'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'
import { formatEGP } from '@/lib/utils/formatters'
import type { Booking, Book, Course, Order, Review, User } from '@/types'

interface AnalyticsState {
  users: number
  revenue: number
  orders: number
  pendingOrders: number
  bookings: number
  confirmedBookings: number
  courses: number
  books: number
  reviews: number
}

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<AnalyticsState | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [usersSnap, ordersSnap, bookingsSnap, coursesSnap, booksSnap, reviewsSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'orders')),
        getDocs(collection(db, 'bookings')),
        getDocs(collection(db, 'courses')),
        getDocs(collection(db, 'books')),
        getDocs(collection(db, 'reviews')),
      ])

      const users = usersSnap.docs.map((docItem) => docItem.data() as User)
      const orders = ordersSnap.docs.map((docItem) => docItem.data() as Order)
      const bookings = bookingsSnap.docs.map((docItem) => docItem.data() as Booking)
      const courses = coursesSnap.docs.map((docItem) => docItem.data() as Course)
      const books = booksSnap.docs.map((docItem) => docItem.data() as Book)
      const reviews = reviewsSnap.docs.map((docItem) => docItem.data() as Review)

      setStats({
        users: users.length,
        revenue: orders.filter((order) => order.status === 'paid').reduce((sum, order) => sum + Number(order.amount || 0), 0),
        orders: orders.length,
        pendingOrders: orders.filter((order) => order.status === 'pending').length,
        bookings: bookings.length,
        confirmedBookings: bookings.filter((booking) => booking.status === 'confirmed').length,
        courses: courses.filter((course) => course.status === 'published').length,
        books: books.filter((book) => book.status === 'published').length,
        reviews: reviews.filter((review) => review.status === 'published').length,
      })
      setLoading(false)
    }

    load().catch((error) => {
      console.error('Admin analytics error:', error)
      setLoading(false)
    })
  }, [])

  if (loading || !stats) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <PremiumSkeleton className="h-36" />
        <PremiumSkeleton className="h-36" />
        <PremiumSkeleton className="h-36" />
      </div>
    )
  }

  const cards = [
    ['الإيرادات المؤكدة', formatEGP(stats.revenue), 100],
    ['المستخدمون', stats.users, Math.min(stats.users * 8, 100)],
    ['الطلبات', stats.orders, Math.min(stats.orders * 12, 100)],
    ['طلبات معلقة', stats.pendingOrders, Math.min(stats.pendingOrders * 18, 100)],
    ['الحجوزات', stats.bookings, Math.min(stats.bookings * 14, 100)],
    ['حجوزات مؤكدة', stats.confirmedBookings, Math.min(stats.confirmedBookings * 18, 100)],
    ['كورسات منشورة', stats.courses, Math.min(stats.courses * 25, 100)],
    ['كتب منشور', stats.books, Math.min(stats.books * 25, 100)],
    ['تقييمات منشور', stats.reviews, Math.min(stats.reviews * 18, 100)],
  ] as const

  return (
    <div>
      <div className="mb-8">
        <p className="mini-label">Analytics</p>
        <h2 className="mt-3 text-3xl font-black text-charcoal">لوحة نمو البراند</h2>
        <p className="mt-3 max-w-2xl text-sm leading-8 text-warm-gray">مؤشرات تشغيلية مهمة للإيرادات والحجوزات والمنتجات.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map(([label, value, percent]) => (
          <div key={label} className="rounded-[2rem] border border-sand bg-ivory/90 p-6 shadow-soft backdrop-blur-sm">
            <p className="text-sm font-black text-warm-gray">{label}</p>
            <strong className="mt-3 block text-3xl font-black text-burgundy">{value}</strong>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-sand">
              <span className="block h-full rounded-full bg-burgundy" style={{ width: `${percent}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
