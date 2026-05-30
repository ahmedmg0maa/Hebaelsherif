'use client'

export const dynamic = 'force-dynamic'
import { FormEvent, useEffect, useMemo, useState } from 'react'
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

interface BookingWithProof extends Booking {
  paymentProofUrl?: string
  paymentNote?: string
}

interface ProofDraft {
  paymentReference: string
  paymentProofUrl: string
  note: string
  status?: 'idle' | 'loading' | 'success' | 'error'
  message?: string
}

const proofableStatuses = new Set(['pending', 'awaiting_payment', 'rejected'])

export default function DashboardSessionsPage() {
  const { user, firebaseUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [bookings, setBookings] = useState<BookingWithProof[]>([])
  const [proofDrafts, setProofDrafts] = useState<Record<string, ProofDraft>>({})

  useEffect(() => {
    const userId = user?.uid
    if (!userId) return

    async function loadBookings() {
      setLoading(true)
      const bookingsSnap = await getDocs(query(collection(db, 'bookings'), where('userId', '==', userId)))
      const userBookings = bookingsSnap.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })) as BookingWithProof[]
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
      paymentReview: bookings.filter((booking) => booking.paymentStatus === 'submitted' || booking.status === 'payment_submitted').length,
    }
  }, [bookings])

  function getDraft(bookingId: string): ProofDraft {
    return proofDrafts[bookingId] || { paymentReference: '', paymentProofUrl: '', note: '', status: 'idle' }
  }

  function updateDraft(bookingId: string, patch: Partial<ProofDraft>) {
    setProofDrafts((current) => ({
      ...current,
      [bookingId]: { ...getDraft(bookingId), ...patch },
    }))
  }

  async function submitProof(event: FormEvent<HTMLFormElement>, bookingId: string) {
    event.preventDefault()
    const draft = getDraft(bookingId)

    if (!firebaseUser) {
      updateDraft(bookingId, { status: 'error', message: 'يجب تسجيل الدخول مرة أخرى.' })
      return
    }

    if (!draft.paymentReference.trim() && !draft.paymentProofUrl.trim()) {
      updateDraft(bookingId, { status: 'error', message: 'أضيفي رقم العملية أو رابط إثبات الدفع.' })
      return
    }

    updateDraft(bookingId, { status: 'loading', message: '' })

    try {
      const token = await firebaseUser.getIdToken()
      const response = await fetch('/api/bookings/proof', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bookingId,
          paymentReference: draft.paymentReference,
          paymentProofUrl: draft.paymentProofUrl,
          note: draft.note,
        }),
      })
      const data = (await response.json()) as { success?: boolean; error?: string }

      if (!response.ok || !data.success) {
        updateDraft(bookingId, { status: 'error', message: data.error || 'لم نتمكن من إرسال إثبات الدفع.' })
        return
      }

      setBookings((current) =>
        current.map((booking) =>
          booking.id === bookingId
            ? {
                ...booking,
                status: 'payment_submitted',
                paymentStatus: 'submitted',
                paymentReference: draft.paymentReference,
                paymentProofUrl: draft.paymentProofUrl,
                paymentNote: draft.note,
              }
            : booking,
        ),
      )

      updateDraft(bookingId, {
        paymentReference: '',
        paymentProofUrl: '',
        note: '',
        status: 'success',
        message: 'تم إرسال إثبات الدفع. سيتم مراجعته قبل تأكيد الجلسة.',
      })
    } catch (error) {
      console.error('Booking proof submit error:', error)
      updateDraft(bookingId, { status: 'error', message: 'لم نتمكن من إرسال إثبات الدفع الآن.' })
    }
  }

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
        description="بعد إرسال طلب حجز جلسة، ستظهر حالته هنا مع تفاصيل الموعد والدفع والخطوة التالية."
        actionLabel="احجزي جلسة"
        actionHref="/booking"
      />
    )
  }

  return (
    <div className="space-y-8">
      <section className="premium-glow-border rounded-[2.5rem] border border-sand bg-ivory/90 p-6 shadow-premium backdrop-blur-sm lg:p-8 dark:bg-deep-teal/55">
        <BrandOrnament className="mb-5" />
        <div className="grid gap-6 lg:grid-cols-[1fr_520px] lg:items-end">
          <div>
            <p className="mini-label mb-3">جلساتي</p>
            <h2 className="text-4xl font-black leading-tight text-petrol md:text-5xl dark:text-gold">مساحة المواعيد الخاصة</h2>
            <p className="mt-4 max-w-2xl text-sm leading-8 text-warm-gray dark:text-cream">
              تابعي كل جلسة، حالة التأكيد، بيانات الدفع، رابط اللقاء، والخطوة التالية في مكان واحد.
            </p>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <SummaryPill label="قادمة" value={summary.upcoming} />
            <SummaryPill label="مؤكدة" value={summary.confirmed} />
            <SummaryPill label="مكتملة" value={summary.completed} />
            <SummaryPill label="قيد الدفع" value={summary.paymentReview} />
          </div>
        </div>
      </section>

      <div className="space-y-4">
        {bookings.map((booking) => {
          const draft = getDraft(booking.id)
          const canSubmitProof = proofableStatuses.has(booking.status) || booking.paymentStatus === 'pending' || !booking.paymentReference

          return (
            <article key={booking.id} className="rounded-[2rem] border border-sand bg-ivory/90 p-6 shadow-soft backdrop-blur-sm dark:border-gold/25 dark:bg-white/10">
              <div className="grid gap-6 lg:grid-cols-[1fr_280px] lg:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${BOOKING_STATUS_STYLES[booking.status]}`}>
                      {BOOKING_STATUS_LABELS[booking.status]}
                    </span>
                    <span className="rounded-full border border-petrol/15 bg-petrol/10 px-3 py-1 text-xs font-black text-petrol dark:text-ivory">
                      {booking.sessionType || 'جلسة فردية'}
                    </span>
                    {booking.paymentStatus ? (
                      <span className="rounded-full border border-gold/20 bg-gold/10 px-3 py-1 text-xs font-black text-gold">
                        الدفع: {booking.paymentStatus === 'confirmed' ? 'مؤكد' : booking.paymentStatus === 'submitted' ? 'قيد المراجعة' : 'بانتظار الإرسال'}
                      </span>
                    ) : null}
                  </div>

                  <h3 className="mt-4 text-2xl font-black text-charcoal dark:text-ivory">
                    {booking.date} · {formatTime12h(booking.time)}
                  </h3>

                  <p className="mt-2 text-sm leading-7 text-warm-gray dark:text-cream">
                    المدة: <span className="latin-numerals">{booking.duration}</span> دقيقة · التواصل: {booking.phone}
                  </p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {booking.finalAmount ? <DetailItem label="الإجمالي" value={formatEGP(booking.finalAmount)} /> : null}
                    {booking.paymentReference ? <DetailItem label="مرجع الدفع" value={booking.paymentReference} /> : null}
                    {booking.paymentProofUrl ? <DetailItem label="إثبات الدفع" value="تم إرساله للمراجعة" /> : null}
                  </div>

                  {booking.notes ? (
                    <p className="mt-4 rounded-2xl border border-sand bg-cream/70 p-4 text-sm leading-7 text-warm-gray dark:border-gold/25 dark:bg-white/10 dark:text-cream">{booking.notes}</p>
                  ) : null}

                  {canSubmitProof && booking.status !== 'cancelled' ? (
                    <form onSubmit={(event) => submitProof(event, booking.id)} className="mt-5 rounded-[1.5rem] border border-gold/25 bg-gold/10 p-4">
                      <p className="text-sm font-black text-deepTeal dark:text-gold">إرسال إثبات الدفع</p>
                      <p className="mt-1 text-xs font-bold leading-6 text-warm-gray dark:text-cream">أضيفي رقم العملية أو رابط صورة الإيصال ليتم تأكيد الدفع والجلسة من الإدارة.</p>
                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <input
                          className="premium-input"
                          value={draft.paymentReference}
                          onChange={(event) => updateDraft(booking.id, { paymentReference: event.target.value })}
                          placeholder="رقم العملية"
                        />
                        <input
                          className="premium-input"
                          value={draft.paymentProofUrl}
                          onChange={(event) => updateDraft(booking.id, { paymentProofUrl: event.target.value })}
                          placeholder="رابط إثبات الدفع"
                        />
                        <input
                          className="premium-input"
                          value={draft.note}
                          onChange={(event) => updateDraft(booking.id, { note: event.target.value })}
                          placeholder="ملاحظة اختيارية"
                        />
                      </div>
                      <PremiumButton type="submit" size="sm" className="mt-4" disabled={draft.status === 'loading'}>
                        {draft.status === 'loading' ? 'جاري الإرسال...' : 'إرسال الإثبات'}
                      </PremiumButton>
                      {draft.message ? (
                        <p className={`mt-3 text-xs font-bold leading-6 ${draft.status === 'error' ? 'text-burgundy' : 'text-olive dark:text-gold'}`}>{draft.message}</p>
                      ) : null}
                    </form>
                  ) : null}
                </div>

                <div className="rounded-[1.5rem] border border-sand bg-cream/70 p-5 text-center dark:border-gold/25 dark:bg-white/10">
                  <p className="text-xs font-black text-warm-gray dark:text-cream">حالة اللقاء</p>
                  <p className="mt-3 text-lg font-black text-petrol dark:text-gold">{BOOKING_STATUS_LABELS[booking.status]}</p>
                  {booking.meetingUrl ? (
                    <PremiumButton href={booking.meetingUrl} className="mt-4 w-full" size="sm">
                      فتح رابط الجلسة
                    </PremiumButton>
                  ) : booking.status === 'confirmed' ? (
                    <p className="mt-4 rounded-2xl border border-gold/20 bg-gold/10 p-3 text-xs font-bold leading-6 text-deepTeal dark:text-ivory">سيظهر رابط الجلسة هنا فور إضافته من الإدارة.</p>
                  ) : (
                    <PremiumButton href="/booking" variant="outline" className="mt-4 w-full" size="sm">
                      حجز موعد جديد
                    </PremiumButton>
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

function SummaryPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.5rem] border border-sand bg-cream/70 p-4 text-center dark:border-gold/25 dark:bg-white/10">
      <strong className="block text-3xl font-black text-petrol latin-numerals dark:text-gold">{value}</strong>
      <span className="mt-1 block text-xs font-black text-warm-gray dark:text-cream">{label}</span>
    </div>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-sand bg-cream/70 px-4 py-3 dark:border-gold/25 dark:bg-white/10">
      <p className="text-xs font-black text-warm-gray dark:text-cream">{label}</p>
      <p className="mt-1 break-words text-sm font-black text-petrol latin-numerals dark:text-gold">{value}</p>
    </div>
  )
}
