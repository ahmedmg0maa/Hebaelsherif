'use client'

import { useRef, useState } from 'react'
import { cancelMyBooking, requestMyBookingReschedule } from '@/lib/actions/booking-customer'
import { Button } from '@/components/ui/Button'

export function CustomerBookingActions({ bookingId }: { bookingId: string }) {
  const [open, setOpen] = useState<'cancel'|'reschedule'|null>(null)
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const input = 'min-h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-sm text-ink'
  async function submit(form: FormData) {
    if (!open || lock.current) return
    lock.current=true
    setBusy(true); setMessage(null)
    try {
    const result = open === 'cancel'
      ? await cancelMyBooking(bookingId, String(form.get('reason') ?? ''))
      : await requestMyBookingReschedule(bookingId, String(form.get('proposed') ?? ''), String(form.get('reason') ?? ''))
    setMessage({ ok: result.ok, text: result.ok ? result.message : result.error }); setBusy(false)
    if (result.ok) setOpen(null)
    } catch { setMessage({ok:false,text:'تعذّر تأكيد نتيجة الطلب. راجعي حالة الحجز أو أعيدي المحاولة؛ احتفظنا بالبيانات هنا.'}) }
    finally { lock.current=false; setBusy(false) }
  }
  return <div className="space-y-3 md:max-w-sm">
    <div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" disabled={busy} aria-expanded={open==='reschedule'} aria-controls={`reschedule-${bookingId}`} onClick={()=>{setMessage(null);setOpen(open==='reschedule'?null:'reschedule')}}>طلب تغيير الموعد</Button><Button size="sm" variant="ghost" disabled={busy} aria-expanded={open==='cancel'} aria-controls={`cancel-${bookingId}`} onClick={()=>{setMessage(null);setOpen(open==='cancel'?null:'cancel')}}>إلغاء الحجز</Button></div>
    {open&&<form id={`${open}-${bookingId}`} onSubmit={(event)=>{event.preventDefault();void submit(new FormData(event.currentTarget))}} className="space-y-2 rounded-xl border border-line bg-ivory/60 p-3">
      {open==='reschedule'&&<label className="block text-xs font-bold text-deep-teal">الموعد المقترح بتوقيت القاهرة<input name="proposed" disabled={busy} type="datetime-local" step={1800} className={`mt-1 ${input}`} required /></label>}
      <label className="block text-xs font-bold text-deep-teal">ملاحظة اختيارية<textarea name="reason" disabled={busy} rows={2} maxLength={1000} className={`mt-1 py-2 ${input}`} /></label>
      {open==='cancel'&&<p className="text-xs leading-relaxed text-text-soft">راجعي الموعد قبل التأكيد؛ تُطبّق مهلة الإلغاء المحفوظة للخدمة، ويُعاد رصيد الباقة تلقائيًا فقط إذا أثبت النظام استخدامه.</p>}
      <Button type="submit" size="sm" disabled={busy}>{busy?'جارٍ الإرسال…':open==='cancel'?'تأكيد الإلغاء':'إرسال الطلب'}</Button>
    </form>}
    {message&&<p role={message.ok?'status':'alert'} className={`text-xs font-semibold ${message.ok?'text-deep-teal':'text-burgundy'}`}>{message.text}</p>}
  </div>
}
