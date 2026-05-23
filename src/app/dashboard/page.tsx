'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import { useAuth } from '@/hooks/useAuth'
import PremiumEmptyState from '@/components/ui/PremiumEmptyState'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'
import { getTodayDateString } from '@/lib/utils/formatters'
import type { Booking, Order } from '@/types'

interface DashboardStats {
  paidCourses: number
  paidBooks: number
  upcomingSessions: number
  pendingOrders: number
}

export default function DashboardHomePage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({ paidCourses: 0, paidBooks: 0, upcomingSessions: 0, pendingOrders: 0 })

  useEffect(() => {
    const userId = user?.uid
    if (!userId) return

    async function loadDashboardStats() {
      setLoading(true)
      const [ordersSnap, bookingsSnap] = await Promise.all([
        getDocs(query(collection(db, 'orders'), where('userId', '==', userId))),
        getDocs(query(collection(db, 'bookings'), where('userId', '==', userId))),
      ])

      const orders = ordersSnap.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })) as Order[]
      const bookings = bookingsSnap.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })) as Booking[]
      const today = getTodayDateString()

      setStats({
        paidCourses: orders.filter((order) => order.productType === 'course' && order.status === 'paid').length,
        paidBooks: orders.filter((order) => order.productType === 'book' && order.status === 'paid').length,
        upcomingSessions: bookings.filter((booking) => booking.status !== 'cancelled' && booking.date >= today).length,
        pendingOrders: orders.filter((order) => order.status === 'pending').length,
      })
      setLoading(false)
    }

    loadDashboardStats().catch((error) => {
      console.error('Dashboard stats error:', error)
      setLoading(false)
    })
  }, [user?.uid])

  if (loading) {
    return (
      <div>
        <PremiumSkeleton className="mb-6 h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          <PremiumSkeleton className="h-32" /><PremiumSkeleton className="h-32" /><PremiumSkeleton className="h-32" /><PremiumSkeleton className="h-32" />
        </div>
      </div>
    )
  }

  const hasAnyActivity = stats.paidCourses > 0 || stats.paidBooks > 0 || stats.upcomingSessions > 0 || stats.pendingOrders > 0

  return (
    <div>
      <div className="mb-8">
        <p className="mini-label mb-2">لوحة رحلتك</p>
        <h2 className="text-3xl font-black text-charcoal md:text-4xl">كل ما يخصك في مكان واحد</h2>
        <p className="mt-3 max-w-2xl text-sm leading-8 text-warm-gray">تابعي الدورات والكتب والجلسات والطلبات الخاصة بكِ من هنا.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <DashboardStatCard label="دوراتي" value={stats.paidCourses} href="/dashboard/courses" />
        <DashboardStatCard label="كتبي" value={stats.paidBooks} href="/dashboard/books" />
        <DashboardStatCard label="جلساتي القادمة" value={stats.upcomingSessions} href="/dashboard/sessions" />
        <DashboardStatCard label="طلبات بانتظار التأكيد" value={stats.pendingOrders} href="/dashboard/orders" />
      </div>

      {!hasAnyActivity ? (
        <div className="mt-8">
          <PremiumEmptyState icon="✦" title="رحلتك لم تبدأ بعد" description="عند شراء دورة أو كتاب أو حجز جلسة، سيظهر كل شيء هنا تلقائياً." actionLabel="استكشفي الدورات" actionHref="/courses" />
        </div>
      ) : null}
    </div>
  )
}

function DashboardStatCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="premium-glow-border rounded-[2rem] border border-sand bg-ivory/90 p-6 shadow-soft backdrop-blur-sm transition hover:-translate-y-1 hover:shadow-premium">
      <p className="text-sm font-black text-warm-gray">{label}</p>
      <strong className="mt-3 block text-4xl font-black text-burgundy">{value}</strong>
      <span className="mt-4 block text-xs font-black text-gold">عرض التفاصيل</span>
    </Link>
  )
}
