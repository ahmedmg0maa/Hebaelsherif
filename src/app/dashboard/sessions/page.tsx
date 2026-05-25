'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useMemo, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import BrandOrnament from '@/components/brand/BrandOrnament'
import PremiumButton from '@/components/ui/PremiumButton'
import PremiumEmptyState from '@/components/ui/PremiumEmptyState'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_STYLES } from '@/constants/booking'
import { db } from '@/lib/firebase/client'
import { useAuth } from '@/hooks/useAuth'
import { formatEGP, formatTime12h, getTodayDateString } from '@/lib/utils/formatters'
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
      const bookingsSnap = await getDocs(query(collection(db, 'bookings'), where('userId', '==', userId)))
      const userBookings = bookingsSnap.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })) as Booking[]
      userBookings.sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`))
      setBookings(userBookings)
      setLoading(false)
    }

    loadBookings().catch((error) => {
      console.error('Dashboard sessions error:', error)
      setLoading(false)
    })
  }, [user?.uid])

  const summary = useMemo(() => {
    const today = getTodayDateString()
    return {
      upcoming: bookings.filter((booking) => booking.status !== 'cancelled' && booking.date >= today).length,
      confirmed: bookings.filter((booking) => booking.status === 'confirmed').length,
      completed: bookings.filter((booking) => booking.status === 'completed').length,
    }
  }, [bookings])

  if (loading) {
    return (
      <div className="space-y-4">
        <PremiumSkeleton className="h-56" />
        <PremiumSkeleton className="h-32" />
        <PremiumSkeleton className="h-32" />
      </div>
    )
  }

  if (bookings.length === 0) {
    return (
      <PremiumEmptyState
        icon="◌"
        title="لا توجد جلسات بعد"
        description="بعد إرسال طلب حجز جلسة، ستظهر حالته هنا مع تفاصيل الموعد والدفع."
        actionLabel="احجزي جلسة"
        actionHref="/booking"
      />
    )
  }

  return (
    <div className="space-y-8">
      <section className="premium-glow-border rounded-[2.5rem] border border-sand bg-ivory/90 p-6 shadow-premium backdrop-blur-sm lg:p-8">
        <BrandOrnament className="mb-5" />
        <div className="grid gap-6 lg:grid-cols-[1fr_420px] lg:items-end">
          <div>
            <p className="mini-label mb-3">جلساتي</p>
            <h2 className="text-4xl font-black leading-tight text-petrol md:text-5xl">مساحة المواعيد الخاصة</h2>
            <p className="mt-4 max-w-2xl text-sm leading-8 text-warm-gray">
              تابعي كل جلسة، حالة التأكيد، بيانات الدفع، وملاحظاتك قبل اللقاء في مكان واحد.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <SummaryPill label="قادمة" value={summary.upcoming} />
            <SummaryPill label="مؤكدة" value={summary.confirmed} />
            <SummaryPill label="مكتملة" value={summary.completed} />
          </div>
        </div>
      </section>

      <div className="space-y-4">
        {bookings.map((booking) => (
          <article key={booking.id} className="rounded-[2rem] border border-sand bg-ivory/90 p-6 shadow-soft backdrop-blur-sm">
            <div className="grid gap-6 lg:grid-cols-[1fr_260px] lg:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${BOOKING_STATUS_STYLES[booking.status]}`}>
                    {BOOKING_STATUS_LABELS[booking.status]}
                  </span>
                  <span className="rounded-full border border-petrol/15 bg-petrol/10 px-3 py-1 text-xs font-black text-petrol">
                    {booking.sessionType || 'جلسة فردية'}
                  </span>
                </div>

                <h3 className="mt-4 text-2xl font-black text-charcoal">
                  {booking.date} · {formatTime12h(booking.time)}
                </h3>

                <p className="mt-2 text-sm leading-7 text-warm-gray">
                  المدة: <span className="latin-numerals">{booking.duration}</span> دقيقة · التواصل: {booking.phone}
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {booking.finalAmount ? <DetailItem label="الإجمالي" value={formatEGP(booking.finalAmount)} /> : null}
                  {booking.paymentReference ? <DetailItem label="مرجع الدفع" value={booking.paymentReference} /> : null}
                </div>

                {booking.notes ? (
                  <p className="mt-4 rounded-2xl border border-sand bg-cream/70 p-4 text-sm leading-7 text-warm-gray">{booking.notes}</p>
                ) : null}
              </div>

              <div className="rounded-[1.5rem] border border-sand bg-cream/70 p-5 text-center">
                <p className="text-xs font-black text-warm-gray">حالة اللقاء</p>
                <p className="mt-3 text-lg font-black text-petrol">{BOOKING_STATUS_LABELS[booking.status]}</p>
                {booking.meetingUrl ? (
                  <PremiumButton href={booking.meetingUrl} className="mt-4 w-full" size="sm">
                    فتح رابط الجلسة
                  </PremiumButton>
                ) : (
                  <PremiumButton href="/booking" variant="outline" className="mt-4 w-full" size="sm">
                    حجز موعد جديد
                  </PremiumButton>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

function SummaryPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.5rem] border border-sand bg-cream/70 p-4 text-center">
      <strong className="block text-3xl font-black text-petrol latin-numerals">{value}</strong>
      <span className="mt-1 block text-xs font-black text-warm-gray">{label}</span>
    </div>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-sand bg-cream/70 px-4 py-3">
      <p className="text-xs font-black text-warm-gray">{label}</p>
      <p className="mt-1 break-words text-sm font-black text-petrol latin-numerals">{value}</p>
    </div>
  )
}
