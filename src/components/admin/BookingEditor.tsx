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
  return <AdminEditorDialog title="إدارة الحجز" triggerLabel="تعديل كامل"><form className="grid gap-5" onSubmit={async (event) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    await run(() => saveBookingAdmin(booking.id, data), 'تم تحديث الحجز وتسجيل العملية.')
  }} aria-busy={busy}>
    <fieldset disabled={busy} className="grid gap-5">
    <fieldset className="grid gap-3 rounded-2xl border border-line p-4">
    <legend className="px-2 font-semibold text-deep-teal">١. الموعد</legend>
    <p className="text-sm leading-7 text-text-soft">ساعات العمل المعتمدة: الأحد–الخميس، 10 صباحًا–8 مساءً بتوقيت القاهرة. الجمعة والسبت إجازة. يراجع الخادم الاستثناءات والتعارضات قبل حفظ النقل.</p>
    <AdminField label="بداية الجلسة بتوقيت القاهرة" name="starts_at" type="datetime-local" defaultValue={formatCairoLocalDateTime(booking.startsAt) ?? ''} readOnly={!scheduleEditable} required hint="اختاري بداية الموعد الجديد. يفحص الخادم ساعات العمل والراحة والحجوزات عبر جميع الخدمات قبل تحرير الوقت السابق وإشعار العميلة." example="الأحد، الساعة 11 صباحًا داخل فترة عمل مفتوحة"/>
    <p className="rounded-lg bg-aqua/8 px-3 py-2 text-sm text-text-soft">تُحسب نهاية الجلسة تلقائيًا من مدة الخدمة المعتمدة.</p>
    {!scheduleEditable && <p className="text-sm font-semibold text-taupe">الحجز منتهٍ؛ يمكن تحديث الرابط أو الملاحظة الداخلية فقط.</p>}
    </fieldset>
    <fieldset className="grid gap-3 rounded-2xl border border-line p-4">
    <legend className="px-2 font-semibold text-deep-teal">٢. قرار الحجز</legend>
    <AdminSelect label="الحالة" name="status" hint="حالة الحجز بعد مراجعتك. التأكيد يثبت الموعد والإلغاء يُحرر وقته؛ لا تُنفّذ هذه الخانة استردادًا ماليًا." example="مؤكد بعد مراجعة التفاصيل" required defaultValue={booking.status} options={allowedStatuses(booking.status).map(status=>({value:status,label:status==='cancelled'&&booking.status==='pending'?'رفض الحجز وإلغاؤه':statusLabels[status]??status}))}/>
    <p className="rounded-xl border border-line p-4 text-sm leading-7 text-text-soft">التأكيد يثبت الموعد ويُشعر العميلة. الرفض أو الإلغاء يُحرر الوقت ويُشعرها مع الاحتفاظ بالسجل. تغيير الحالة أو الموعد لا ينفّذ خصمًا أو رد مبلغ؛ راجعي الدفع منفصلًا عند الحاجة.</p>
    </fieldset>
    <fieldset className="grid gap-3 rounded-2xl border border-line p-4">
    <legend className="px-2 font-semibold text-deep-teal">٣. التواصل وملاحظات المتابعة</legend>
    <AdminField label="رابط اللقاء الآمن" name="meeting_url" type="url" pattern="https://.*" maxLength={500} defaultValue={booking.meetingUrl ?? ''} dir="ltr" hint="رابط HTTPS للقاء الخاص بهذا الحجز، يظهر للعميلة صاحبة الحجز في حسابها." example="https://meet.google.com/…"/>
    <div className="rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm"><p className="font-bold text-deep-teal">ملاحظات العميلة — للقراءة فقط</p><p className="mt-1 whitespace-pre-wrap text-text-soft">{booking.customerNotes || 'لا توجد ملاحظات.'}</p></div>
    <AdminTextarea label="ملاحظات داخلية للإدارة" name="admin_notes" defaultValue={booking.adminNotes} maxLength={4000} rows={3} hint="ملاحظات المتابعة الخاصة بالإدارة، لا تظهر للعميلة. لا تضعي كلمات مرور أو معلومات حساسة غير لازمة." example="تم التواصل لتأكيد وسيلة اللقاء"/>
    </fieldset>
    </fieldset>
    <ActionFeedback feedback={feedback} />
    <Button type="submit" size="sm" disabled={busy}>{busy ? 'جاري الحفظ…' : 'حفظ كل التعديلات'}</Button>
  </form></AdminEditorDialog>
}
