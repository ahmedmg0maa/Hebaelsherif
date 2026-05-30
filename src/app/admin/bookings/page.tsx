'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import { useAuth } from '@/hooks/useAuth'
import type { Booking } from '@/types'
import { formatEGP, formatNumber } from '@/lib/utils/formatters'
import { bookingStatusMeta, getAmount, getCustomerName, isToday, paymentStatusMeta, toMillis } from '@/lib/admin/operations'
import { AdminActionButton, AdminPageHeader, AdminPanel, EmptyState, Field, inputClass, MetricCard, StatusBadge, ToneBadge } from '@/components/admin/OperationsUI'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'

interface BookingItem extends Booking {
  userEmail?: string
  customerEmail?: string
  customerPhone?: string
  customerName?: string
  adminNotes?: string
  cancellationReason?: string
}

function mapBookings(snapshot: Awaited<ReturnType<typeof getDocs>>) {
  return snapshot.docs.map((docItem) => ({ id: docItem.id, ...(docItem.data() as Record<string, unknown>) })) as BookingItem[]
}

export default function AdminBookingsPage() {
  const { firebaseUser } = useAuth()
  const [bookings, setBookings] = useState<BookingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function loadBookings() {
    setLoading(true)
    setError('')
    try {
      const snap = await getDocs(collection(db, 'bookings'))
      setBookings(mapBookings(snap).sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt)))
    } catch (loadError) {
      console.error('Admin bookings load error:', loadError)
      setError('تعذر تحميل الحجوزات. راجع صلاحيات الأدمن واتصال Firebase.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBookings()
  }, [])

  async function runBookingAction(booking: BookingItem, action: string, payload: Record<string, unknown>, confirmMessage: string) {
    if (!firebaseUser) {
      setError('انتهت جلسة الدخول. أعد تسجيل الدخول كأدمن.')
      return
    }
    if (!window.confirm(confirmMessage)) return

    setSavingId(booking.id)
    setMessage('')
    setError('')
    try {
      const token = await firebaseUser.getIdToken()
      const response = await fetch(`/api/admin/bookings/${booking.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, ...payload }),
      })
      const data = (await response.json()) as { success?: boolean; error?: string }
      if (!response.ok || !data.success) {
        setError(data.error || 'تعذر تنفيذ الإجراء.')
        return
      }
      await loadBookings()
      setMessage('تم تنفيذ الإجراء وتسجيله وإرسال الإشعار المناسب.')
    } catch (updateError) {
      console.error('Admin booking action error:', updateError)
      setError('تعذر تنفيذ الإجراء. تأكد من الصلاحيات وحاول مرة أخرى.')
    } finally {
      setSavingId('')
    }
  }

  function addMeetingLink(booking: BookingItem) {
    const meetingUrl = window.prompt('أضيفي رابط الجلسة:', booking.meetingUrl || '')
    if (!meetingUrl) return
    runBookingAction(booking, 'add_meeting_link', { meetingUrl }, 'حفظ رابط الجلسة وإشعار العميلة؟')
  }

  function addAdminNote(booking: BookingItem) {
    const note = window.prompt('اكتب ملاحظة داخلية للحجز:', booking.adminNotes || '')
    if (!note) return
    runBookingAction(booking, 'note', { note }, 'حفظ الملاحظة؟')
  }

  function cancelBooking(booking: BookingItem) {
    const reason = window.prompt('سبب الإلغاء اختياري:') || ''
    runBookingAction(booking, 'cancel_booking', { reason }, 'إلغاء هذا الحجز؟')
  }

  const filteredBookings = useMemo(() => {
    const queryText = search.trim().toLowerCase()
    return bookings.filter((booking) => {
      const matchesStatus = statusFilter === 'all' || booking.status === statusFilter || booking.paymentStatus === statusFilter
      const haystack = [getCustomerName(booking), booking.email, booking.userEmail, booking.phone, booking.customerPhone, booking.sessionType, booking.paymentReference, booking.date].filter(Boolean).join(' ').toLowerCase()
      const matchesSearch = !queryText || haystack.includes(queryText)
      return matchesStatus && matchesSearch
    })
  }, [bookings, search, statusFilter])

  const stats = useMemo(() => {
    const confirmedRevenue = bookings.filter((booking) => booking.paymentStatus === 'confirmed' || booking.status === 'completed').reduce((sum, booking) => sum + getAmount(booking), 0)
    return {
      total: bookings.length,
      today: bookings.filter((booking) => isToday(booking.date)).length,
      pending: bookings.filter((booking) => booking.status === 'pending').length,
      paymentSubmitted: bookings.filter((booking) => booking.paymentStatus === 'submitted' || booking.status === 'payment_submitted').length,
      confirmed: bookings.filter((booking) => booking.status === 'confirmed').length,
      completed: bookings.filter((booking) => booking.status === 'completed').length,
      revenue: confirmedRevenue,
    }
  }, [bookings])

  if (loading) return <PremiumSkeleton className="h-[32rem]" />

  return (
    <div className="space-y-8">
      <AdminPageHeader title="إدارة الحجوزات والجلسات" description="تشغيل الجلسات من السيرفر: تأكيد الموعد منفصل عن تأكيد الدفع، مع رابط جلسة وملاحظات وسجل إجراءات." />

      {message ? <div className="rounded-2xl border border-olive/25 bg-olive/10 p-4 text-sm font-black text-olive dark:text-ivory">{message}</div> : null}
      {error ? <div className="rounded-2xl border border-burgundy/25 bg-burgundy/10 p-4 text-sm font-black text-burgundy dark:text-ivory">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
        <MetricCard label="كل الحجوزات" value={formatNumber(stats.total)} tone="muted" />
        <MetricCard label="اليوم" value={formatNumber(stats.today)} tone="gold" />
        <MetricCard label="بانتظار التأكيد" value={formatNumber(stats.pending)} tone="warning" />
        <MetricCard label="إثبات دفع" value={formatNumber(stats.paymentSubmitted)} tone="petrol" />
        <MetricCard label="مؤكدة" value={formatNumber(stats.confirmed)} tone="success" />
        <MetricCard label="مكتملة" value={formatNumber(stats.completed)} tone="olive" />
        <MetricCard label="إيرادات الجلسات" value={formatEGP(stats.revenue)} tone="gold" />
      </div>

      <AdminPanel title="فلترة الحجوزات" description="اعرضي حجوزات اليوم أو الحالات التي تحتاج إجراء.">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="الحالة">
            <select className={inputClass} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">كل الحالات</option>
              <option value="pending">طلبات جديدة</option>
              <option value="submitted">إثبات دفع مرسل</option>
              <option value="payment_submitted">إثبات دفع مرسل</option>
              <option value="confirmed">مؤكدة</option>
              <option value="completed">مكتملة</option>
              <option value="cancelled">ملغية</option>
            </select>
          </Field>
          <div className="md:col-span-2">
            <Field label="بحث">
              <input className={inputClass} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="اسم، هاتف، بريد، تاريخ، مرجع دفع..." />
            </Field>
          </div>
        </div>
      </AdminPanel>

      <AdminPanel title="قائمة الحجوزات" description="كل إجراء يحدث تحديثًا فعليًا ويُسجل في السجلات ويُرسل إشعارًا عند الحاجة.">
        {filteredBookings.length === 0 ? (
          <EmptyState title="لا توجد حجوزات مطابقة" description="عند وصول طلب حجز أو تغيير الفلاتر ستظهر الحجوزات هنا لإدارتها." />
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking) => (
              <article key={booking.id} className="rounded-[1.75rem] border border-sand bg-cream/80 p-5 shadow-soft dark:border-gold/25 dark:bg-white/10">
                <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-xl font-black text-charcoal dark:text-ivory">{getCustomerName(booking)}</h3>
                      <StatusBadge meta={bookingStatusMeta[String(booking.status)]} fallback={String(booking.status)} />
                      <StatusBadge meta={paymentStatusMeta[String(booking.paymentStatus || 'pending')]} fallback={String(booking.paymentStatus || 'pending')} />
                      {booking.meetingUrl ? <ToneBadge tone="success">رابط جلسة موجود</ToneBadge> : <ToneBadge tone="warning">بدون رابط جلسة</ToneBadge>}
                    </div>
                    <div className="mt-4 grid gap-3 text-sm font-bold text-warm-gray dark:text-cream md:grid-cols-2">
                      <p>البريد: <span className="text-charcoal dark:text-ivory">{booking.email || booking.userEmail || booking.customerEmail || 'غير متوفر'}</span></p>
                      <p>الهاتف: <span className="text-charcoal dark:text-ivory">{booking.phone || booking.customerPhone || 'غير متوفر'}</span></p>
                      <p>النوع: <span className="text-charcoal dark:text-ivory">{booking.sessionType || 'جلسة فردية'}</span></p>
                      <p>الموعد: <span className="text-charcoal dark:text-ivory">{booking.date || 'غير محدد'} · {booking.time || ''}</span></p>
                      <p>المدة: <span className="text-charcoal dark:text-ivory">{booking.duration || 60} دقيقة</span></p>
                      <p>المبلغ: <span className="text-charcoal dark:text-ivory">{formatEGP(getAmount(booking))}</span></p>
                      <p>طريقة الدفع: <span className="text-charcoal dark:text-ivory">{booking.paymentMethod || 'غير محددة'}</span></p>
                      <p>مرجع الدفع: <span className="text-charcoal dark:text-ivory">{booking.paymentReference || 'غير متوفر'}</span></p>
                    </div>
                    {booking.notes ? <p className="mt-4 rounded-2xl border border-gold/25 bg-gold/10 p-3 text-sm font-bold text-deepTeal dark:text-ivory">ملاحظة العميلة: {booking.notes}</p> : null}
                    {booking.adminNotes ? <p className="mt-4 rounded-2xl border border-petrol/25 bg-petrol/10 p-3 text-sm font-bold text-petrol dark:text-ivory">ملاحظة إدارية: {booking.adminNotes}</p> : null}
                    {booking.meetingUrl ? <p className="mt-4 break-all rounded-2xl border border-olive/25 bg-olive/10 p-3 text-sm font-bold text-olive dark:text-ivory">رابط الجلسة: {booking.meetingUrl}</p> : null}
                  </div>

                  <div className="rounded-[1.5rem] border border-sand bg-ivory/80 p-4 dark:border-gold/25 dark:bg-deepTeal/60">
                    <p className="mb-3 text-xs font-black text-petrol dark:text-gold">إجراءات الحجز</p>
                    <div className="flex flex-wrap gap-2">
                      <AdminActionButton disabled={savingId === booking.id} tone="success" onClick={() => runBookingAction(booking, 'confirm_booking', {}, 'تأكيد موعد الحجز؟')}>تأكيد الموعد</AdminActionButton>
                      <AdminActionButton disabled={savingId === booking.id} tone="petrol" onClick={() => runBookingAction(booking, 'confirm_payment', {}, 'تأكيد الدفع لهذا الحجز؟')}>تأكيد الدفع</AdminActionButton>
                      <AdminActionButton disabled={savingId === booking.id} tone="gold" onClick={() => addMeetingLink(booking)}>رابط الجلسة</AdminActionButton>
                      <AdminActionButton disabled={savingId === booking.id} tone="olive" onClick={() => runBookingAction(booking, 'complete_booking', {}, 'تحديد الحجز كمكتمل؟')}>مكتملة</AdminActionButton>
                      <AdminActionButton disabled={savingId === booking.id} tone="warning" onClick={() => runBookingAction(booking, 'request_reschedule', {}, 'تحديد الحجز كطلب إعادة جدولة؟')}>إعادة جدولة</AdminActionButton>
                      <AdminActionButton disabled={savingId === booking.id} tone="danger" onClick={() => cancelBooking(booking)}>إلغاء</AdminActionButton>
                      <AdminActionButton disabled={savingId === booking.id} tone="muted" onClick={() => addAdminNote(booking)}>ملاحظة</AdminActionButton>
                    </div>
                    <div className="mt-5 space-y-2 border-t border-sand pt-4 text-xs font-bold text-warm-gray dark:border-gold/25 dark:text-cream">
                      <p>1. طلب الحجز</p>
                      <p>2. مراجعة الدفع</p>
                      <p>3. تأكيد الموعد</p>
                      <p>4. رابط الجلسة</p>
                      <p>5. مكتملة</p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </AdminPanel>
    </div>
  )
}
