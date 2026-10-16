'use client'

import { useRef, useState } from 'react'
import { sendUserNotification, notificationHistory, type NotificationHistory } from '@/lib/actions/admin-tools'
import { Button } from '@/components/ui/Button'
import { FormField, FormTextarea, FormSelect } from '@/components/ui/FormField'
import { useAdminAction } from './useAdminAction'
import { ActionFeedback } from './ActionFeedback'
import { AdminEditorDialog } from './AdminEditorDialog'

type Attempt = Parameters<typeof sendUserNotification>[0]
export function NotifyUser({ userId, userName }: { userId: string; userName: string }) {
 return <AdminEditorDialog title={`إشعارات ${userName}`} triggerLabel="إشعار وسجل الإرسال"><NotificationEditor userId={userId} /></AdminEditorDialog>
}
function NotificationEditor({ userId }: { userId: string }) {
 const { busy, feedback, run } = useAdminAction()
 const [attempt, setAttempt] = useState<Attempt | null>(null)
 const attemptRef = useRef<Attempt | null>(null)
 const formRef = useRef<HTMLFormElement>(null)
 const [history, setHistory] = useState<NotificationHistory | null>(null)
 const [page, setPage] = useState(1)
 function completed() { attemptRef.current = null; setAttempt(null); formRef.current?.reset() }
 async function historyPage(next: number) {
  await run(async () => {
   const result = await notificationHistory(userId, attemptRef.current?.requestId ?? null, next)
   if (!result.ok) return result
   setHistory(result.data); setPage(next)
   if (attemptRef.current && result.data.requestFound) { completed(); return { ok: true, notice: 'تأكد إرسال المحاولة السابقة؛ لم نرسل نسخة أخرى.' } }
   return { ok: true, notice: attemptRef.current ? 'لم يظهر تأكيد لهذه المحاولة. يمكنك إعادة المحاولة بنفس الرسالة؛ منع التكرار محفوظ.' : 'تم تحديث سجل الإشعارات.' }
  })
 }
 return <div className="space-y-6">
  <form ref={formRef} className="space-y-4" onSubmit={event => {
   event.preventDefault()
   const data = new FormData(event.currentTarget)
   void run(async () => {
    const payload = attemptRef.current ?? { userId, title: String(data.get('title') ?? ''), body: String(data.get('body') ?? ''), kind: String(data.get('kind') ?? 'info'), link: String(data.get('link') ?? '/dashboard/notifications'), requestId: crypto.randomUUID() }
    // Freeze both identity and content before any network operation.
    attemptRef.current = payload; setAttempt(payload)
    const result = await sendUserNotification(payload)
    if (result.ok) { completed(); setHistory(null) }
    else if (result.definitive) { attemptRef.current = null; setAttempt(null) }
    return result
   }, 'تم إرسال الإشعار داخل الحساب وتسجيل العملية.')
  }}>
   <p className="text-sm text-text-soft">رسالة داخل حساب العميلة. يظهر السجل وقت الإنشاء وحالة القراءة، ولا يثبت وصول بريد إلكتروني.</p>
   <fieldset disabled={busy || attempt !== null} className="space-y-3">
    <legend className="sr-only">محتوى الإشعار</legend>
    <FormField name="title" label="العنوان" required minLength={3} maxLength={120} />
    <FormTextarea name="body" label="الرسالة" rows={3} maxLength={1000} />
    <FormSelect name="kind" label="النوع" defaultValue="info" options={[{ value: 'info', label: 'معلومة' }, { value: 'success', label: 'نجاح' }, { value: 'warning', label: 'تنبيه' }, { value: 'error', label: 'إجراء مطلوب' }]} />
    <FormSelect name="link" label="الوجهة" defaultValue="/dashboard/notifications" options={[["notifications","الإشعارات"],["orders","الطلبات"],["payments","المدفوعات"],["bookings","الحجوزات"],["courses","الدورات"],["books","الكتب"],["workshops","الورش"]].map(([path,label]) => ({ value: `/dashboard/${path}`, label }))} />
   </fieldset>
   {attempt && <p className="rounded-xl bg-sand/30 p-3 text-sm">هذه المحاولة محفوظة دون تغيير حتى يتأكد الإرسال. تحققي من النتيجة أو أعيدي إرسال المحاولة نفسها.</p>}
   <div className="flex flex-wrap gap-2"><Button type="submit" disabled={busy}>{attempt ? 'إعادة المحاولة نفسها' : 'إرسال الإشعار'}</Button><Button type="button" variant="secondary" disabled={busy} onClick={() => historyPage(1)}>{attempt ? 'التحقق من نتيجة الإرسال' : 'عرض سجل الإشعارات'}</Button></div>
  </form>
  <ActionFeedback feedback={feedback} />
  {history && <section aria-label="سجل إشعارات العميلة" className="space-y-3">
   <p className="font-semibold">{history.total.toLocaleString('ar-EG')} إشعار — صفحة {page.toLocaleString('ar-EG')}</p>
   {history.items.length === 0 && <p>لا توجد إشعارات في هذه الصفحة.</p>}
   <ul className="space-y-3">{history.items.map(item => <li key={item.id} className="space-y-2 rounded-xl border border-line p-4"><h3 className="font-bold text-deep-teal">{item.title}</h3><p className="whitespace-pre-wrap break-words text-sm">{item.body}</p><p className="text-xs text-text-soft">{new Date(item.created_at).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })} · {item.read_at ? 'مقروء' : 'لم يُقرأ بعد'}</p></li>)}</ul>
   <div className="flex gap-2"><Button variant="ghost" disabled={busy || page <= 1} onClick={() => historyPage(page - 1)}>السابق</Button><Button variant="ghost" disabled={busy || page * 20 >= history.total} onClick={() => historyPage(page + 1)}>التالي</Button></div>
  </section>}
 </div>
}
