'use client'

import { useEffect, useMemo, useState } from 'react'
import { collection, doc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_STYLES,
} from '@/constants/booking'
import PremiumButton from '@/components/ui/PremiumButton'
import PremiumEmptyState from '@/components/ui/PremiumEmptyState'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'
import { formatArabicDate } from '@/lib/utils/formatters'
import type { Booking, BookingStatus } from '@/types'

const statusOptions: { label: string; value: 'all' | BookingStatus }[] = [
  { label: 'كل الحجوزات', value: 'all' },
  { label: 'بانتظار التأكيد', value: 'pending' },
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

  const filteredBookings = useMemo(() => {
    if (activeStatus === 'all') return bookings
    return bookings.filter((booking) => booking.status === activeStatus)
  }, [activeStatus, bookings])

  async function updateBookingStatus(bookingId: string, status: BookingStatus) {
    setUpdatingId(bookingId)

    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status,
        updatedAt: serverTimestamp(),
      })

      setBookings((current) =>
        current.map((booking) =>
          booking.id === bookingId
            ? {
                ...booking,
                status,
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
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-sm font-bold text-gold">إدارة الحجوزات</p>
          <h2 className="text-3xl font-black text-charcoal">طلبات حجز الجلسات</h2>
          <p className="mt-3 max-w-2xl text-sm leading-8 text-warm-gray">
            من هنا يتم تأكيد الجلسات، إلغاؤها، أو تحديدها كمكتملة.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setActiveStatus(option.value)}
              className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                activeStatus === option.value
                  ? 'bg-petrol text-cream'
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
              className="rounded-3xl border border-sand bg-ivory p-6 shadow-soft"
            >
              <div className="grid gap-6 xl:grid-cols-[1fr_260px] xl:items-center">
                <div>
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
                      BOOKING_STATUS_STYLES[booking.status]
                    }`}
                  >
                    {BOOKING_STATUS_LABELS[booking.status]}
                  </span>

                  <h3 className="mt-4 text-xl font-black text-charcoal">جلسة فردية</h3>

                  <div className="mt-3 grid gap-2 text-sm leading-7 text-warm-gray md:grid-cols-2">
                    <p>
                      العميل: <strong className="text-charcoal">{booking.name}</strong>
                    </p>

                    <p>
                      الهاتف: <strong className="text-charcoal">{booking.phone}</strong>
                    </p>

                    <p>
                      البريد: <strong className="text-charcoal">{booking.email}</strong>
                    </p>

                    <p>
                      التاريخ: <strong className="text-charcoal">{booking.date}</strong>
                    </p>

                    <p>
                      الوقت: <strong className="text-charcoal">{booking.time}</strong>
                    </p>

                    <p>
                      المدة:{' '}
                      <strong className="text-charcoal">{booking.duration} دقيقة</strong>
                    </p>

                    <p>
                      تاريخ الطلب:{' '}
                      <strong className="text-charcoal">
                        {formatArabicDate(booking.createdAt)}
                      </strong>
                    </p>
                  </div>

                  {booking.notes ? (
                    <div className="mt-4 rounded-2xl border border-sand bg-cream px-4 py-3">
                      <p className="text-xs font-bold text-warm-gray">ملاحظات العميل</p>
                      <p className="mt-2 text-sm leading-7 text-charcoal">{booking.notes}</p>
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
                    disabled={updatingId === booking.id || booking.status === 'pending'}
                    onClick={() => updateBookingStatus(booking.id, 'pending')}
                  >
                    إرجاع لانتظار التأكيد
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
    </div>
  )
}