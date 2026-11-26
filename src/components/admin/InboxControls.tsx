"use client"

import {AdminField} from './AdminField'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { AdminSelect as FormSelect, AdminTextarea as FormTextarea } from '@/components/admin/AdminField'
import { createUnsubscribeLink, manageInboxMessage, manageNewsletterSubscriber, retryOutboxEmail } from '@/lib/actions/crm'
import { AdminEditorDialog } from './AdminEditorDialog'
import { useAdminAction } from './useAdminAction'
import { ActionFeedback } from './ActionFeedback'

export function SubscriberControls({ id, status }: { id: string; status: string }) {
  const action = useAdminAction()
  const [confirmErase, setConfirmErase] = useState(false)
  const [unsubscribeUrl, setUnsubscribeUrl] = useState('')
  const [copyFeedback, setCopyFeedback] = useState<{ ok: boolean; message: string } | null>(null)
  async function manage(operation: 'unsubscribe' | 'erase') {
    if (await action.run(() => manageNewsletterSubscriber(id, operation), operation === 'erase' ? 'مُحي سجل البريد مع بقاء التدقيق غير المعرّف.' : 'أُلغي الاشتراك.')) {
      setUnsubscribeUrl(''); setCopyFeedback(null); setConfirmErase(false)
    }
  }
  return <div className="space-y-3"><div className="flex flex-wrap gap-2">
    {status === 'subscribed' && <><Button type="button" size="sm" variant="secondary" disabled={action.busy} onClick={() => manage('unsubscribe')}>إلغاء الاشتراك</Button>
      <Button type="button" size="sm" variant="ghost" disabled={action.busy} onClick={() => action.run(async () => {
        // Rotation invalidates the previous link; never present it as current.
        setUnsubscribeUrl(''); setCopyFeedback(null)
        const result = await createUnsubscribeLink(id)
        if (result.ok) setUnsubscribeUrl(`${location.origin}${result.url}`)
        return result
      }, 'أُنشئ رابط جديد. يمكنك نسخه من الحقل الظاهر.')}>{unsubscribeUrl ? 'إنشاء رابط بديل' : 'تجهيز رابط الإلغاء'}</Button></>}
    {!confirmErase ? <Button type="button" size="sm" variant="burgundy" disabled={action.busy} onClick={() => setConfirmErase(true)}>محو البريد</Button> : <><Button type="button" size="sm" variant="burgundy" disabled={action.busy} onClick={() => manage('erase')}>تأكيد المحو</Button><Button type="button" size="sm" variant="ghost" disabled={action.busy} onClick={() => setConfirmErase(false)}>تراجع</Button></>}
  </div>
    {unsubscribeUrl && <div className="space-y-2"><AdminField  label={`رابط إلغاء الاشتراك`} hint="رابط خاص بهذا الاشتراك. انسخيه للمتابعة مع صاحبته عند الحاجة، ولا تنشريه للعامة." example="الرابط المُجهز لهذه المشتركة فقط" readOnly value={unsubscribeUrl} dir="ltr" onFocus={event => event.currentTarget.select()} name="href"/>
      <Button type="button" size="sm" variant="secondary" disabled={action.busy} onClick={async () => {
        try {
          if (!navigator.clipboard?.writeText) throw new Error('clipboard_unavailable')
          await navigator.clipboard.writeText(unsubscribeUrl)
          setCopyFeedback({ ok: true, message: 'نُسخ الرابط.' })
        } catch { setCopyFeedback({ ok: false, message: 'تعذّر النسخ التلقائي. حددي الرابط وانسخيه يدويًا.' }) }
      }}>نسخ الرابط</Button><ActionFeedback feedback={copyFeedback}/></div>}
    {status !== 'subscribed' && <p className="text-sm leading-7 text-text-soft">إعادة الاشتراك تتم من نموذج الموافقة العام فقط.</p>}
    <ActionFeedback feedback={action.feedback}/>
  </div>
}

export function MessageWorkspace({ message, admins }: {
  message: { id: string; status: string; priority: string; assignedTo: string | null; spam: boolean; notes: { id: string; note: string; created_at: string }[] }
  admins: { id: string; label: string }[]
}) {
  const action = useAdminAction()
  return <AdminEditorDialog title="متابعة الرسالة" triggerLabel="مساحة المتابعة"><form className="space-y-5" onSubmit={async event => {
    event.preventDefault()
    const form = event.currentTarget, data = new FormData(form)
    const saved = await action.run(() => manageInboxMessage(message.id, {
      status: String(data.get('status')), priority: String(data.get('priority')), assignedTo: String(data.get('assigned_to') || ''),
      note: String(data.get('note') || ''), spam: data.get('spam') === 'on', reply: String(data.get('reply') || ''),
    }), 'حُفظت المتابعة.')
    if (saved) for (const name of ['note', 'reply']) {
      const field = form.elements.namedItem(name)
      if (field instanceof HTMLTextAreaElement) field.value = ''
    }
  }}>
    <fieldset disabled={action.busy} className="grid gap-4 disabled:opacity-60 sm:grid-cols-2">
      <FormSelect name="status" label="حالة الرسالة" defaultValue={message.status} options={[{ value: 'new', label: 'جديدة' }, { value: 'read', label: 'مقروءة' }, { value: 'replied', label: 'تم الرد' }, { value: 'archived', label: 'مؤرشفة' }]}/>
      <FormSelect name="priority" label="الأولوية" defaultValue={message.priority} options={[{ value: 'low', label: 'منخفضة' }, { value: 'normal', label: 'عادية' }, { value: 'high', label: 'عالية' }, { value: 'urgent', label: 'عاجلة' }]}/>
      <FormSelect name="assigned_to" label="المسؤولة عن المتابعة" defaultValue={message.assignedTo ?? ''} options={[{ value: '', label: 'غير مسندة' }, ...admins.map(admin => ({ value: admin.id, label: admin.label }))]} className="sm:col-span-2"/>
      <FormTextarea name="note" label="ملاحظة داخلية" rows={3} maxLength={2000} className="sm:col-span-2"/>
      <FormTextarea name="reply" label="الرد البريدي" hint="يُرسل عند تفعيل البريد. ستظهر نتيجة الحفظ والإرسال بعد التنفيذ." rows={5} maxLength={10000} className="sm:col-span-2"/>
      <label className="flex min-h-12 items-center gap-2 text-sm"><input name="spam" type="checkbox" defaultChecked={message.spam} className="h-5 w-5 accent-deep-teal"/>بريد مزعج</label>
    </fieldset>
    {message.notes.length > 0 && <section aria-label="ملاحظات المتابعة" className="space-y-2">{message.notes.map(note => <p key={note.id} className="whitespace-pre-wrap break-words rounded-xl border border-line bg-surface-raised p-3 text-sm leading-7">{note.note}</p>)}</section>}
    <Button type="submit" disabled={action.busy}>{action.busy ? 'جارٍ الحفظ…' : 'حفظ المتابعة والرد'}</Button>
    <ActionFeedback feedback={action.feedback}/>
  </form></AdminEditorDialog>
}

export function OutboxRetryControl({ id, status }: { id: string; status: string }) {
  const action = useAdminAction()
  if (!['disabled', 'queued', 'failed'].includes(status)) return null
  return <div className="mt-2 space-y-3"><Button type="button" size="sm" variant="secondary" disabled={action.busy} onClick={() => action.run(() => retryOutboxEmail(id), 'تمت محاولة الإرسال.')}>{action.busy ? 'جارٍ الإرسال…' : 'محاولة إرسال آمنة'}</Button><ActionFeedback feedback={action.feedback}/></div>
}
