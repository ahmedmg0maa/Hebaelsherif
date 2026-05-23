'use client'

import { useEffect, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_STYLES } from '@/constants/booking'
import { useAuth } from '@/hooks/useAuth'
import PremiumEmptyState from '@/components/ui/PremiumEmptyState'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'
import { formatEGP, formatTime12h } from '@/lib/utils/formatters'
import type { Booking } from '@/types'

export default function DashboardSessionsPage() {
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [bookings, setBookings] = useState<Booking[]>([])

  useEffect(() => {
    const userId = user?.uid

    if (!userId) return

    async function loadBookings() {
      setLoading(true)

      const bookingsSnap = await getDocs(
        query(collection(db, 'bookings'), where('userId', '==', userId)),
      )

      const userBookings = bookingsSnap.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data(),
      })) as Booking[]

      userBookings.sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`))

      setBookings(userBookings)
      setLoading(false)
    }

    loadBookings().catch((error) => {
      console.error('Dashboard sessions error:', error)
      setLoading(false)
    })
  }, [user?.uid])

  if (loading) {
    return (
      <div className="space-y-4">
        <PremiumSkeleton className="h-28" />
        <PremiumSkeleton className="h-28" />
        <PremiumSkeleton className="h-28" />
      </div>
    )
  }

  if (bookings.length === 0) {
    return (
      <PremiumEmptyState
        icon="📅"
        title="لا توجد جلسات بعد"
        description="بعد إرسال طلب حجز جلسة، ستظهر حالته هنا بوضوح."
        actionLabel="احجزي جلسة"
        actionHref="/booking"
      />
    )
  }

  return (
    <div>
      <div className="mb-8">
        <p className="mb-2 text-sm font-bold text-gold">جلساتي</p>
        <h2 className="text-3xl font-black text-charcoal">حجوزات الجلسات</h2>
      </div>

      <div className="space-y-4">
        {bookings.map((booking) => (
          <article
            key={booking.id}
            className="rounded-3xl border border-sand bg-ivory p-6 shadow-soft"
          >
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
                    BOOKING_STATUS_STYLES[booking.status]
                  }`}
                >
                  {BOOKING_STATUS_LABELS[booking.status]}
                </span>

                <h3 className="mt-4 text-xl font-black text-charcoal">جلسة فردية</h3>

                <p className="mt-2 text-sm leading-7 text-warm-gray">
                  التاريخ: {booking.date} · الساعة: {formatTime12h(booking.time)} · المدة: <span className="latin-numerals">{booking.duration}</span> دقيقة
                </p>

                {booking.finalAmount ? (
                  <p className="mt-2 text-sm font-black text-petrol latin-numerals">الإجمالي: {formatEGP(booking.finalAmount)}</p>
                ) : null}

                {booking.paymentReference ? (
                  <p className="mt-2 text-xs font-bold text-warm-gray">مرجع الدفع: <span className="latin-numerals">{booking.paymentReference}</span></p>
                ) : null}

                {booking.notes ? (
                  <p className="mt-3 text-sm leading-7 text-warm-gray">ملاحظاتك: {booking.notes}</p>
                ) : null}
              </div>

              <div className="rounded-2xl border border-sand bg-cream px-5 py-4 text-center">
                <p className="text-xs font-bold text-warm-gray">بيانات التواصل</p>
                <p className="mt-2 text-sm font-bold text-petrol">{booking.phone}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}