'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { restoreContentRevision } from '@/lib/actions/revisions'

export function RevisionRestoreButton({ id }: { id: string }) {
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  if (!confirm) return <Button size="sm" variant="secondary" onClick={() => setConfirm(true)}>استعادة كمسودة</Button>
  return <div className="min-w-52 space-y-2 rounded-xl border border-antique-gold/35 bg-antique-gold/8 p-3">
    <p className="text-xs leading-loose text-deep-teal">لن تُنشر النسخة تلقائيًا؛ الصفحة/المقال يصبح Draft والقسم يصبح مخفيًا للمراجعة.</p>
    <div className="flex gap-2"><Button size="sm" disabled={busy} onClick={async () => { setBusy(true); const result = await restoreContentRevision(id); setMessage(result.ok ? 'تمت الاستعادة كمسودة مع نقطة رجوع جديدة.' : result.error); setBusy(false) }}>تأكيد</Button><Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirm(false)}>إلغاء</Button></div>
    {message && <p role="status" className="text-xs font-semibold text-deep-teal">{message}{message.includes('تحقق') && <> <Link href="/auth/admin/confirm?next=/admin/revisions&amp;reauth=1" className="text-burgundy underline">أعيدي التحقق</Link></>}</p>}
  </div>
}

