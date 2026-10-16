'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  accountDeletionStatusLabel,
  isActiveAccountDeletionStatus,
} from '@/lib/account-deletion/status'
import type { MyAccountDeletionRequest } from '@/lib/data/account-deletion'
import { cancelAccountDeletion, requestAccountDeletion } from '@/lib/actions/account-deletion'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

const dateFormat = new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })

export function AccountDeletionRequestControl({ request }: { request: MyAccountDeletionRequest | null }) {
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState<'request' | 'cancel' | null>(null)
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null)
  const router = useRouter()
  const active = request ? isActiveAccountDeletionStatus(request.status) : false

  async function submit(kind: 'request' | 'cancel') {
    setBusy(kind); setFeedback(null)
    const result = kind === 'request' ? await requestAccountDeletion() : await cancelAccountDeletion()
    setFeedback(result.ok
      ? { ok: true, text: kind === 'request' ? 'تم تسجيل الطلب للمراجعة، ولم يُحذف الحساب بعد.' : 'أُلغي الطلب وبقي حسابك نشطًا.' }
      : { ok: false, text: result.error })
    setBusy(null)
    if (result.ok) router.refresh()
  }

  return (
    <div className="space-y-4">
      <p className="leading-relaxed text-text-soft">
        يمكنك تسجيل طلب منظم للمراجعة. الإرسال لا يحذف الحساب فورًا؛ تتحقق الإدارة أولًا من الهوية والطلبات أو المدفوعات ومتطلبات الاحتفاظ النظامية، وستظهر الحالة هنا بوضوح.
      </p>
      {request && (
        <div className="space-y-2 rounded-xl border border-line bg-surface-muted p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge tone={active ? 'pending' : request.status === 'declined' ? 'danger' : 'teal'}>
              {accountDeletionStatusLabel[request.status]}
            </Badge>
            <time className="text-xs text-taupe">طُلب في {dateFormat.format(new Date(request.requestedAt))}</time>
          </div>
          {request.status === 'approved_for_execution' && (
            <p className="font-medium text-burgundy">الطلب معتمد، لكن حذف الهوية والبيانات المؤهلة لم يُسجّل كمكتمل بعد.</p>
          )}
          {request.reviewNote && <p className="whitespace-pre-wrap text-text-soft">ملاحظة المراجعة: {request.reviewNote}</p>}
        </div>
      )}
      {active ? (
        <Button variant="secondary" disabled={busy !== null} onClick={() => submit('cancel')}>
          {busy === 'cancel' ? 'جارٍ الإلغاء…' : 'إلغاء طلب الحذف'}
        </Button>
      ) : (
        <div className="space-y-3">
          <label className="flex items-start gap-3 text-sm text-text-soft">
            <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 size-4 accent-burgundy" />
            <span>أفهم أن هذا طلب مراجعة، وأن الحساب لن يُحذف قبل التحقق والتنفيذ الفعلي.</span>
          </label>
          <Button variant="burgundy" disabled={!confirmed || busy !== null} onClick={() => submit('request')}>
            {busy === 'request' ? 'جارٍ التسجيل…' : 'تسجيل طلب حذف الحساب'}
          </Button>
        </div>
      )}
      {feedback && (
        <p role={feedback.ok ? 'status' : 'alert'} className={`rounded-xl px-4 py-3 text-sm font-semibold ${feedback.ok ? 'bg-deep-teal/10 text-deep-teal' : 'bg-burgundy/10 text-burgundy'}`}>
          {feedback.text}
        </p>
      )}
    </div>
  )
}
