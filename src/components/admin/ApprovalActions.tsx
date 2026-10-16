'use client'

import { useState } from 'react'
import { ActionFeedback } from '@/components/admin/ActionFeedback'
import { useAdminAction } from '@/components/admin/useAdminAction'
import { approvePayment, rejectPayment, getProofUrl } from '@/lib/actions/admin'
import { Button } from '@/components/ui/Button'

export function ApprovalActions({ paymentId, hasProof, canApprove, canReject }: { paymentId: string; hasProof: boolean; canApprove: boolean; canReject: boolean }) {
  const { busy, feedback, run } = useAdminAction()
  const [proofUrl, setProofUrl] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [reviewed, setReviewed] = useState(false)

  async function onViewProof() {
    await run(async () => {
      const result = await getProofUrl(paymentId)
      if (result.ok) setProofUrl(result.data.url)
      return result
    }, 'الإيصال جاهز. افتحيه وراجعيه قبل الاعتماد.')
  }

  async function onApprove() {
    await run(() => approvePayment(paymentId), 'تم اعتماد الدفعة وتفعيل الاستحقاقات مرة واحدة.')
  }

  async function onReject() {
    if (await run(() => rejectPayment(paymentId, reason), 'تم رفض الإيصال وإبلاغ العميلة بإمكانية إعادة الرفع.')) setRejecting(false)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {(canApprove || canReject) && <a className="text-sm font-bold text-deep-teal underline underline-offset-4" href="/auth/admin/confirm?reauth=1&redirect=/admin/payments">تأكيد أمني حديث</a>}
        {hasProof && (
          <Button variant="ghost" size="sm" disabled={busy} onClick={onViewProof}>
            {proofUrl ? 'تجديد رابط الإيصال' : 'تجهيز الإيصال'}
          </Button>
        )}
        {proofUrl && <a href={proofUrl} target="_blank" rel="noopener noreferrer" onClick={() => setReviewed(true)} className="inline-flex min-h-12 items-center rounded-full border border-deep-teal/30 px-4 text-sm font-bold text-deep-teal underline underline-offset-4">فتح الإيصال في نافذة جديدة</a>}
        {canApprove && <Button size="sm" disabled={busy || !hasProof || !reviewed} onClick={onApprove}>
          اعتماد
        </Button>}
        {canReject && <Button variant="burgundy" size="sm" disabled={busy} onClick={() => setRejecting((v) => !v)}>
          رفض
        </Button>}
      </div>
      {canApprove && !hasProof && <p className="text-sm font-semibold text-burgundy">لا يمكن الاعتماد قبل وجود إيصال.</p>}
      {canApprove && hasProof && !reviewed && <p className="text-sm font-semibold text-taupe">افتحي الإيصال وراجعيه لتفعيل زر الاعتماد لمدة 30 دقيقة.</p>}
      {canReject && rejecting && (
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor={`reason-${paymentId}`} className="sr-only">
            سبب الرفض
          </label>
          <input
            id={`reason-${paymentId}`}
            value={reason}
            maxLength={500}
            disabled={busy}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-12 w-full max-w-sm rounded-lg border border-line bg-surface-raised px-3 py-2 text-base"
          />
          <Button variant="burgundy" size="sm" disabled={busy || reason.trim().length < 3} onClick={onReject}>
            تأكيد الرفض
          </Button>
        </div>
      )}
      <ActionFeedback feedback={feedback} />
    </div>
  )
}
