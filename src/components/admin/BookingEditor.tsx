'use client'

import { formatCairoLocalDateTime } from '@/lib/booking/cairo-time'
import { AdminEditorDialog } from '@/components/admin/AdminEditorDialog'
import { ActionFeedback } from '@/components/admin/ActionFeedback'
import { useAdminAction } from '@/components/admin/useAdminAction'
import { saveBookingAdmin } from '@/lib/actions/admin-control'
import { Button } from '@/components/ui/Button'
import { AdminField,AdminSelect,AdminTextarea } from './AdminField'

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
  return <AdminEditorDialog title="إدارة الحجز" triggerLabel="تعديل كامل"><form className="grid gap-3 border-t border-line p-4" onSubmit={async (event) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    await run(() => saveBookingAdmin(booking.id, data), 'تم تحديث الحجز وتسجيل العملية.')
  }} aria-busy={busy}>
    <fieldset disabled={busy} className="grid gap-5">
    <AdminField label="البداية بتوقيت القاهرة" name="starts_at" type="datetime-local" defaultValue={formatCairoLocalDateTime(booking.startsAt) ?? ''} readOnly={!scheduleEditable} required hint="تغيير البداية ينقل الحجز بعد فحص ساعات العمل والراحة وتعارض جميع الخدمات، ويُحرر الوقت السابق ويُشعر العميلة."/>
    <p className="rounded-lg bg-aqua/8 px-3 py-2 text-sm text-text-soft">تُحسب نهاية الجلسة تلقائيًا من مدة الخدمة المعتمدة.</p>
    {!scheduleEditable && <p className="text-sm font-semibold text-taupe">الحجز منتهٍ؛ يمكن تحديث الرابط أو الملاحظة الداخلية فقط.</p>}
    <AdminSelect label="الحالة" name="status" hint="حالة الحجز بعد مراجعتك. التأكيد يثبت الموعد والإلغاء يُحرر وقته؛ لا تُنفّذ هذه الخانة استردادًا ماليًا." example="مؤكد بعد مراجعة التفاصيل" required defaultValue={booking.status} options={allowedStatuses(booking.status).map(status=>({value:status,label:status==='cancelled'&&booking.status==='pending'?'رفض الحجز وإلغاؤه':statusLabels[status]??status}))}/>
    <p className="rounded-xl border border-line p-4 text-sm leading-7 text-text-soft">التأكيد يثبت الموعد ويُشعر العميلة. الرفض أو الإلغاء يُحرر الوقت ويُشعرها مع الاحتفاظ بالسجل. تغيير الحالة أو الموعد لا ينفّذ خصمًا أو رد مبلغ؛ راجعي الدفع منفصلًا عند الحاجة.</p>
    <AdminField label="رابط اللقاء الآمن" name="meeting_url" type="url" pattern="https://.*" maxLength={500} defaultValue={booking.meetingUrl ?? ''} dir="ltr"/>
    <div className="rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm"><p className="font-bold text-deep-teal">ملاحظات العميلة — للقراءة فقط</p><p className="mt-1 whitespace-pre-wrap text-text-soft">{booking.customerNotes || 'لا توجد ملاحظات.'}</p></div>
    <AdminTextarea label="ملاحظات داخلية" name="admin_notes" defaultValue={booking.adminNotes} maxLength={4000} rows={2}/>
    </fieldset>
    <ActionFeedback feedback={feedback} />
    <Button type="submit" size="sm" disabled={busy}>{busy ? 'جاري الحفظ…' : 'حفظ كل التعديلات'}</Button>
  </form></AdminEditorDialog>
}
