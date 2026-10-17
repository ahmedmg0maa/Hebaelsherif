'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { prepareContentRevisionRestore, restoreContentRevision } from '@/lib/actions/revisions'

export function RevisionRestoreButton({ id }: { id: string }) {
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [version, setVersion] = useState<number | null>(null)
  const [title, setTitle] = useState('المحتوى')
  if (!confirm) return <div><Button size="sm" variant="secondary" disabled={busy} onClick={async () => {
    setBusy(true);setMessage(null)
    try {const result=await prepareContentRevisionRestore(id);if(result.ok){setVersion(result.version);setTitle(result.title);setConfirm(true)}else setMessage(result.error)}
    catch {setMessage('تعذّرت قراءة النسخة الحالية؛ لم يبدأ أي تعديل.')}
    finally {setBusy(false)}
  }}>{busy?'جارٍ قراءة النسخة الحالية…':'استعادة كمسودة'}</Button>{message&&<p role="status" className="mt-2 text-sm text-burgundy">{message}</p>}</div>
  return <div className="min-w-52 space-y-2 rounded-xl border border-antique-gold/35 bg-antique-gold/8 p-3">
    <p className="text-sm leading-loose text-deep-teal">استعادة «{title}»؟ تعود الصفحة أو المقال مسودة غير منشورة، ويعود القسم مخفيًا. تُحفظ النسخة الحالية كنقطة رجوع. إذا عدّل شخص آخر المحتوى بعد فتح التأكيد تتوقف الاستعادة.</p>
    <div className="flex gap-2"><Button size="sm" disabled={busy || version === null} onClick={async () => {
      if(version===null)return;setBusy(true);setMessage(null)
      try {const result=await restoreContentRevision(id,version);setMessage(result.ok?'تمت الاستعادة كمسودة مع نقطة رجوع وسجل عملية محفوظين.':result.error);setVersion(null)}
      catch {setMessage('لم يتأكد الرد. حدّثي قائمة المراجعات قبل أي محاولة أخرى.');setVersion(null)}
      finally {setBusy(false)}
    }}>تأكيد الاستعادة</Button><Button size="sm" variant="ghost" disabled={busy} onClick={()=>{setConfirm(false);setVersion(null);setMessage(null)}}>إغلاق</Button></div>
    {message && <p role="status" className="text-xs font-semibold text-deep-teal">{message}{message.includes('تأكيد الدخول') && <> <Link href="/auth/admin/confirm?reauth=1&redirect=%2Fadmin%2Frevisions" className="text-burgundy underline">إعادة تأكيد الدخول</Link></>}</p>}
  </div>
}

