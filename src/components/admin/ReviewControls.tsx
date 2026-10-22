'use client'

import { useState } from 'react'
import { moderateReview, type ReviewModerationAction } from '@/lib/actions/reviews'
import { useAdminAction } from './useAdminAction'
import { ActionFeedback } from './ActionFeedback'
import { Button } from '@/components/ui/Button'
import { AdminTextarea as FormTextarea } from '@/components/admin/AdminField'

type Props = {
 id: string; approved: boolean; featured: boolean; status: string; version: number;
 ownerResponse: string | null; responsePublished: boolean; moderationReason: string | null
}
export function ReviewControls(props: Props) {
 const { busy, feedback, run } = useAdminAction()
 return <div className="space-y-3"><ReviewFields key={props.version} {...props} busy={busy} request={(action, reason, response, publish) => run(() => moderateReview(props.id, action, reason, response, publish, props.version), action === 'delete' ? 'تم حذف التقييم مع حفظ سجل القرار.' : 'تم حفظ قرار المراجعة.')} /><ActionFeedback feedback={feedback} /></div>
}
function ReviewFields({ featured, status, ownerResponse, responsePublished, moderationReason, busy, request }: Props & {
 busy: boolean; request: (action: ReviewModerationAction, reason: string, response: string, publish: boolean) => Promise<boolean>
}) {
 const [reason, setReason] = useState(moderationReason ?? '')
 const [response, setResponse] = useState(ownerResponse ?? '')
 const [publish, setPublish] = useState(responsePublished)
 const [confirm, setConfirm] = useState<'archive' | 'delete' | null>(null)
 async function moderate(action: ReviewModerationAction) {
  const ok = await request(action, reason, response, publish)
  if (ok) setConfirm(null)
 }
 return <div className="space-y-3">
  <fieldset disabled={busy} className="space-y-3">
   <legend className="sr-only">إدارة التقييم</legend>
   <div className="flex flex-wrap gap-2">
    {status !== 'archived' && status !== 'approved' && <Button size="sm" onClick={() => moderate('approve')}>اعتماد</Button>}
    {status !== 'archived' && status !== 'rejected' && <Button size="sm" variant="secondary" onClick={() => moderate('reject')}>رفض</Button>}
    {status === 'archived' ? <><Button size="sm" variant="secondary" onClick={() => moderate('restore')}>استعادة للمراجعة</Button><Button size="sm" variant="burgundy" onClick={() => setConfirm('delete')}>حذف نهائي</Button></> : <Button size="sm" variant="secondary" onClick={() => setConfirm('archive')}>أرشفة</Button>}
    {status === 'approved' && <Button size="sm" variant="gold" onClick={() => moderate(featured ? 'unfeature' : 'feature')}>{featured ? 'إزالة التمييز' : 'تمييز'}</Button>}
   </div>
   {status !== 'archived' && <FormTextarea name="reason" label="سبب الرفض الداخلي" value={reason} onChange={e => setReason(e.target.value)} rows={2} maxLength={500} hint="مطلوب عند الرفض، ولا يظهر للزائرات." />}
   {status === 'approved' && <div className="space-y-2 rounded-xl border border-line p-3">
    <FormTextarea name="response" label="رد المالكة" value={response} onChange={e => setResponse(e.target.value)} rows={3} maxLength={2000} />
    <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={publish} onChange={e => setPublish(e.target.checked)} />نشر الرد مع التقييم</label>
    <Button size="sm" variant="secondary" onClick={() => moderate('respond')}>حفظ الرد</Button>
   </div>}
   {confirm && <div role="group" aria-label="تأكيد القرار" className="space-y-2 rounded-xl border border-burgundy/30 p-3">
    <p className="text-sm">{confirm === 'delete' ? 'سيُحذف التقييم والرد نهائيًا؛ يبقى سجل القرار الإداري. لا يمكن التراجع.' : 'سيختفي التقييم والرد من الموقع، ويمكن استعادة التقييم للمراجعة لاحقًا.'}</p>
    <div className="flex gap-2"><Button variant="burgundy" size="sm" onClick={() => moderate(confirm)}>تأكيد {confirm === 'delete' ? 'الحذف النهائي' : 'الأرشفة'}</Button><Button variant="ghost" size="sm" onClick={() => setConfirm(null)}>إلغاء</Button></div>
   </div>}
  </fieldset>
 </div>
}
