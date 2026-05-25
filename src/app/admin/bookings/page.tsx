'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useMemo, useState } from 'react'
import { collection, doc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_STYLES,
} from '@/constants/booking'
import BrandDivider from '@/components/brand/BrandDivider'
import PremiumButton from '@/components/ui/PremiumButton'
import PremiumEmptyState from '@/components/ui/PremiumEmptyState'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'
import { formatArabicDate, formatEGP, formatTime12h } from '@/lib/utils/formatters'
import type { Booking, BookingStatus } from '@/types'

const statusOptions: { label: string; value: 'all' | BookingStatus }[] = [
  { label: 'كل الحجوزات', value: 'all' },
  { label: 'بانتظار التأكيد', value: 'pending' },
  { label: 'بيانات الدفع مرسلة', value: 'payment_submitted' },
  { label: 'مؤكد', value: 'confirmed' },
  { label: 'مكتمل', value: 'completed' },
  { label: 'ملغي', value: 'cancelled' },
]

export default function AdminBookingsPage() {
  const [loading, setLoading] = useState(true)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [activeStatus, setActiveStatus] = useState<'all' | BookingStatus>('all')
  const [updatingId, setUpdatingId] = useState('')

  async function loadBookings() {
    setLoading(true)

    const bookingsSnap = await getDocs(collection(db, 'bookings'))

    const loadedBookings = bookingsSnap.docs.map((docItem) => ({
      id: docItem.id,
      ...docItem.data(),
    })) as Booking[]

    loadedBookings.sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`))

    setBookings(loadedBookings)
    setLoading(false)
  }

  useEffect(() => {
    loadBookings().catch((error) => {
      console.error('Admin bookings load error:', error)
      setLoading(false)
    })
  }, [])

  const stats = useMemo(() => {
    return {
      total: bookings.length,
      submitted: bookings.filter((booking) => booking.status === 'payment_submitted').length,
      confirmed: bookings.filter((booking) => booking.status === 'confirmed').length,
      revenue: bookings
        .filter((booking) => booking.status === 'confirmed' || booking.status === 'completed')
        .reduce((sum, booking) => sum + Number(booking.finalAmount || booking.price || 0), 0),
    }
  }, [bookings])

  const upcomingBookings = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return bookings
      .filter((booking) => booking.status !== 'cancelled' && booking.date >= today)
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
      .slice(0, 5)
  }, [bookings])

  const filteredBookings = useMemo(() => {
    if (activeStatus === 'all') return bookings
    return bookings.filter((booking) => booking.status === activeStatus)
  }, [activeStatus, bookings])

  async function updateBookingStatus(bookingId: string, status: BookingStatus) {
    setUpdatingId(bookingId)

    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status,
        paymentStatus: status === 'confirmed' ? 'confirmed' : undefined,
        updatedAt: serverTimestamp(),
      })

      setBookings((current) =>
        current.map((booking) =>
          booking.id === bookingId
            ? {
                ...booking,
                status,
                paymentStatus: status === 'confirmed' ? 'confirmed' : booking.paymentStatus,
              }
            : booking,
        ),
      )
    } catch (error) {
      console.error('Update booking status error:', error)
    } finally {
      setUpdatingId('')
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <PremiumSkeleton className="h-36" />
        <PremiumSkeleton className="h-36" />
        <PremiumSkeleton className="h-36" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8 overflow-hidden rounded-[2.75rem] border border-sand bg-ivory/82 p-6 shadow-premium backdrop-blur-sm md:p-8">
        <div className="grid gap-6 xl:grid-cols-[1fr_360px] xl:items-center">
          <div>
            <p className="mini-label">إدارة الحجوزات</p>
            <h2 className="mt-3 text-4xl font-black text-charcoal">جلسات هبة الخاصة</h2>
            <p className="mt-4 max-w-2xl text-sm leading-8 text-warm-gray">
              راجعي بيانات الدفع، ثبتي المواعيد، وتابعي الجلسات القادمة من مكان واحد بنظام واضح.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <AdminStat label="إجمالي الحجوزات" value={stats.total} />
            <AdminStat label="بانتظار مراجعة الدفع" value={stats.submitted} />
          </div>
        </div>

        <BrandDivider className="my-7" />

        <div className="grid gap-4 md:grid-cols-4">
          <AdminMetric label="كل الطلبات" value={stats.total.toString()} />
          <AdminMetric label="تحتاج مراجعة" value={stats.submitted.toString()} />
          <AdminMetric label="مؤكدة" value={stats.confirmed.toString()} />
          <AdminMetric label="إيراد مؤكد" value={formatEGP(stats.revenue)} ltr />
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1fr_340px] xl:items-start">
        <section>
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setActiveStatus(option.value)}
                  className={`rounded-full px-4 py-2 text-xs font-black transition ${
                    activeStatus === option.value
                      ? 'bg-petrol text-ivory'
                      : 'border border-sand bg-ivory text-warm-gray hover:text-petrol'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {filteredBookings.length === 0 ? (
            <PremiumEmptyState
              icon="📅"
              title="لا توجد حجوزات"
              description="عندما يرسل المستخدم طلب حجز جلسة، سيظهر هنا."
            />
          ) : (
            <div className="space-y-4">
              {filteredBookings.map((booking) => (
                <article
                  key={booking.id}
                  className="rounded-[2rem] border border-sand bg-ivory/88 p-6 shadow-soft backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-premium"
                >
                  <div className="grid gap-6 2xl:grid-cols-[1fr_240px] 2xl:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${
                            BOOKING_STATUS_STYLES[booking.status]
                          }`}
                        >
                          {BOOKING_STATUS_LABELS[booking.status]}
                        </span>
                        <span className="rounded-full border border-sand bg-cream/70 px-3 py-1 text-xs font-bold text-warm-gray latin-numerals">
                          {booking.date} · {formatTime12h(booking.time)}
                        </span>
                      </div>

                      <h3 className="mt-4 text-2xl font-black text-charcoal">
                        {booking.duration === 90 ? 'جلسة عميقة 90 دقيقة' : 'جلسة فردية 60 دقيقة'}
                      </h3>

                      <div className="mt-4 grid gap-3 text-sm leading-7 text-warm-gray md:grid-cols-2 xl:grid-cols-3">
                        <Info label="العميل" value={booking.name} />
                        <Info label="الهاتف" value={booking.phone} ltr />
                        <Info label="البريد" value={booking.email} ltr />
                        <Info label="تاريخ الطلب" value={formatArabicDate(booking.createdAt)} />
                        <Info label="المدة" value={`${booking.duration} دقيقة`} ltr />
                        <Info label="الإجمالي" value={formatEGP(booking.finalAmount || booking.price || 0)} ltr accent />
                      </div>

                      <div className="mt-5 grid gap-3 rounded-2xl border border-sand bg-cream/70 p-4 text-sm md:grid-cols-3">
                        <Info label="طريقة الدفع" value={booking.paymentMethod || 'manual'} />
                        <Info label="مرجع الدفع" value={booking.paymentReference || 'غير مضاف'} ltr />
                        <Info label="كود الخصم" value={booking.couponCode || 'بدون'} />
                      </div>

                      {booking.notes || booking.paymentNote ? (
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          {booking.notes ? (
                            <NoteBox title="ملاحظات العميل" text={booking.notes} />
                          ) : null}
                          {booking.paymentNote ? (
                            <NoteBox title="ملاحظة الدفع" text={booking.paymentNote} />
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    <div className="grid gap-2">
                      <PremiumButton
                        type="button"
                        size="sm"
                        className="w-full"
                        disabled={updatingId === booking.id || booking.status === 'confirmed'}
                        onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                      >
                        تأكيد الحجز
                      </PremiumButton>

                      <PremiumButton
                        type="button"
                        size="sm"
                        variant="outline"
                        className="w-full"
                        disabled={updatingId === booking.id || booking.status === 'payment_submitted'}
                        onClick={() => updateBookingStatus(booking.id, 'payment_submitted')}
                      >
                        بانتظار مراجعة الدفع
                      </PremiumButton>

                      <PremiumButton
                        type="button"
                        size="sm"
                        variant="gold"
                        className="w-full"
                        disabled={updatingId === booking.id || booking.status === 'completed'}
                        onClick={() => updateBookingStatus(booking.id, 'completed')}
                      >
                        تحديد كمكتملة
                      </PremiumButton>

                      <PremiumButton
                        type="button"
                        size="sm"
                        variant="danger"
                        className="w-full"
                        disabled={updatingId === booking.id || booking.status === 'cancelled'}
                        onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                      >
                        إلغاء الحجز
                      </PremiumButton>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-5 xl:sticky xl:top-28">
          <div className="rounded-[2rem] border border-sand bg-ivory/88 p-5 shadow-soft backdrop-blur-sm">
            <p className="mini-label">الجلسات القادمة</p>
            <div className="mt-5 space-y-3">
              {upcomingBookings.length > 0 ? upcomingBookings.map((booking) => (
                <div key={booking.id} className="rounded-2xl border border-sand bg-cream/65 p-4">
                  <p className="text-sm font-black text-charcoal">{booking.name}</p>
                  <p className="mt-2 text-xs font-bold text-warm-gray latin-numerals">{booking.date} · {formatTime12h(booking.time)}</p>
                  <p className="mt-2 text-xs font-bold text-petrol">{BOOKING_STATUS_LABELS[booking.status]}</p>
                </div>
              )) : (
                <p className="rounded-2xl border border-sand bg-cream/65 p-4 text-sm leading-7 text-warm-gray">لا توجد جلسات قادمة حاليًا.</p>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-petrol/15 bg-petrol p-6 text-ivory shadow-botanical">
            <p className="text-sm font-black text-gold">تذكير إداري</p>
            <p className="mt-3 text-sm leading-7 text-ivory/80">
              لا تؤكدي أي حجز قبل مطابقة مرجع الدفع. بعد التأكيد تظهر الجلسة للمستخدم كموعد مثبت.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}

function AdminStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-sand bg-cream/60 p-4">
      <p className="text-xs font-bold text-warm-gray">{label}</p>
      <strong className="mt-2 block text-3xl font-black text-petrol latin-numerals">{value}</strong>
    </div>
  )
}

function AdminMetric({ label, value, ltr = false }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="rounded-[1.5rem] border border-sand bg-cream/55 p-5 text-center">
      <p className="text-xs font-bold text-warm-gray">{label}</p>
      <strong className={`mt-2 block text-2xl font-black text-charcoal ${ltr ? 'latin-numerals' : ''}`}>{value}</strong>
    </div>
  )
}

function Info({ label, value, ltr = false, accent = false }: { label: string; value: string; ltr?: boolean; accent?: boolean }) {
  return (
    <p className="font-bold text-warm-gray">
      {label}<br />
      <strong className={`${accent ? 'text-petrol' : 'text-charcoal'} ${ltr ? 'latin-numerals' : ''}`}>{value}</strong>
    </p>
  )
}

function NoteBox({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-sand bg-cream px-4 py-3">
      <p className="text-xs font-bold text-warm-gray">{title}</p>
      <p className="mt-2 text-sm leading-7 text-charcoal">{text}</p>
    </div>
  )
}
