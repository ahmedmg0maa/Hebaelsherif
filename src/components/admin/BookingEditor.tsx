'use client'

import { formatCairoLocalDateTime } from '@/lib/booking/cairo-time'
import { AdminEditorDialog } from '@/components/admin/AdminEditorDialog'
import { ActionFeedback } from '@/components/admin/ActionFeedback'
import { useAdminAction } from '@/components/admin/useAdminAction'
import { saveBookingAdmin } from '@/lib/actions/admin-control'
import { Button } from '@/components/ui/Button'

export type BookingAdminItem = {
  id: string; startsAt: string; status: string; meetingUrl: string | null;
  customerNotes: string | null; adminNotes: string
}

const statusLabels: Record<string, string> = {
  pending: 'بانتظار التأكيد',
  confirmed: 'مؤكد',
  completed: 'مكتمل',
  cancelled: 'ملغي',
  no_show: 'تغيّب',
}

function allowedStatuses(current: string) {
  if (current === 'pending') return ['pending', 'confirmed', 'cancelled']
  if (current === 'confirmed') return ['confirmed', 'completed', 'cancelled', 'no_show']
  return [current]
}

export function BookingEditor({ booking }: { booking: BookingAdminItem }) {
  const { busy, feedback, run } = useAdminAction()
  const scheduleEditable = booking.status === 'pending' || booking.status === 'confirmed'
  const input = 'min-h-12 w-full rounded-xl border border-line bg-surface-raised px-3 py-2 text-base text-ink'
  return <AdminEditorDialog title="إدارة الحجز" triggerLabel="تعديل كامل"><form className="grid gap-3 border-t border-line p-4" onSubmit={async (event) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    await run(() => saveBookingAdmin(booking.id, data), 'تم تحديث الحجز وتسجيل العملية.')
  }} aria-busy={busy}>
    <fieldset disabled={busy} className="grid gap-5">
    <label className="text-sm font-bold text-deep-teal">البداية بتوقيت القاهرة<input name="starts_at" type="datetime-local" defaultValue={formatCairoLocalDateTime(booking.startsAt) ?? ''} className={input} readOnly={!scheduleEditable} required /></label>
    <p className="rounded-lg bg-aqua/8 px-3 py-2 text-sm text-text-soft">تُحسب نهاية الجلسة تلقائيًا من مدة الخدمة المعتمدة.</p>
    {!scheduleEditable && <p className="text-sm font-semibold text-taupe">الحجز منتهٍ؛ يمكن تحديث الرابط أو الملاحظة الداخلية فقط.</p>}
    <label className="text-sm font-bold text-deep-teal">الحالة<select name="status" defaultValue={booking.status} className={input}>{allowedStatuses(booking.status).map((status) => <option key={status} value={status}>{statusLabels[status] ?? status}</option>)}</select></label>
    <label className="text-sm font-bold text-deep-teal">رابط اللقاء الآمن<input name="meeting_url" type="url" pattern="https://.*" maxLength={500} defaultValue={booking.meetingUrl ?? ''} className={input} dir="ltr" placeholder="https://…" /></label>
    <div className="rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm"><p className="font-bold text-deep-teal">ملاحظات العميلة — للقراءة فقط</p><p className="mt-1 whitespace-pre-wrap text-text-soft">{booking.customerNotes || 'لا توجد ملاحظات.'}</p></div>
    <label className="text-sm font-bold text-deep-teal">ملاحظات داخلية<textarea name="admin_notes" defaultValue={booking.adminNotes} maxLength={4000} className={input} rows={2} /></label>
    </fieldset>
    <ActionFeedback feedback={feedback} />
    <Button type="submit" size="sm" disabled={busy}>{busy ? 'جاري الحفظ…' : 'حفظ كل التعديلات'}</Button>
  </form></AdminEditorDialog>
}
