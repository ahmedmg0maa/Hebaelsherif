'use client'

import { useState } from 'react'
import { ActionFeedback } from '@/components/admin/ActionFeedback'
import { useAdminAction } from '@/components/admin/useAdminAction'
import { manageOrderRefund, updateOrderStatus } from '@/lib/actions/admin'
import { Button } from '@/components/ui/Button'

export function OrderActions({ orderId, status, canUpdate, canRefund }: { orderId: string; status: string; canUpdate: boolean; canRefund: boolean }) {
  const { busy, feedback, run } = useAdminAction()
  const [reason, setReason] = useState('')
  const [evidence, setEvidence] = useState('')

  async function cancel() {
    await run(() => updateOrderStatus(orderId, 'cancelled', reason), 'أُلغي الطلب وإشعار العميلة وسُجلت العملية.')
  }

  async function refund(action: 'initiate' | 'complete' | 'fail') {
    if (action === 'complete' && !window.confirm('هل أُعيد المبلغ فعلًا؟ سيؤدي التأكيد إلى سحب الاستحقاقات المرتبطة بالطلب.')) return
    await run(() => manageOrderRefund(orderId, action, { reason, evidenceReference: evidence }),
      action === 'initiate' ? 'بدأت معالجة الاسترداد دون سحب الوصول.' : action === 'complete' ? 'اكتمل الاسترداد وسُحبت الاستحقاقات.' : 'سُجل فشل الاسترداد وبقي وصول العميلة فعالًا.')
  }

  const showCancel = canUpdate && (status === 'pending_payment' || status === 'awaiting_review')
  const showRefundStart = canRefund && status === 'paid'
  const showRefundResolution = canRefund && status === 'refund_pending'
  if (!showCancel && !showRefundStart && !showRefundResolution) return <span className="text-sm text-taupe">—</span>

  return (
    <div className="space-y-1">
      <div className="grid min-w-64 gap-2">
        {(showRefundStart || showRefundResolution) && <a className="text-sm font-bold text-deep-teal underline underline-offset-4" href="/auth/admin/confirm?reauth=1&redirect=/admin/orders">تأكيد أمني حديث قبل الاسترداد</a>}
        {(showCancel || showRefundStart) && <label className="text-sm font-semibold text-deep-teal">{showCancel ? 'سبب الإلغاء' : 'سبب الاسترداد'}<textarea disabled={busy} value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} rows={2} className="mt-1 w-full rounded-lg border border-line bg-surface-raised p-3 text-base text-ink" /></label>}
        {showCancel && (
          <Button variant="secondary" size="sm" disabled={busy || reason.trim().length < 3} onClick={cancel}>
            إلغاء
          </Button>
        )}
        {showRefundStart && (
          <Button variant="burgundy" size="sm" disabled={busy || reason.trim().length < 3} onClick={() => refund('initiate')}>
            بدء معالجة الاسترداد
          </Button>
        )}
        {(showRefundStart || showRefundResolution) && <p className="max-w-sm text-xs leading-relaxed text-text-soft">إن كان الطلب لباقة جلسات، راجعي حجوزاتها القادمة وألغيها قبل إتمام الاسترداد. استرداد جلسة منفردة يلغي موعدها القادم عند تأكيد إعادة المبلغ.</p>}
        {showRefundResolution && <>
          <label className="text-sm font-semibold text-deep-teal">مرجع إعادة المبلغ<input disabled={busy} value={evidence} onChange={(event) => setEvidence(event.target.value)} maxLength={120} className="mt-1 min-h-12 w-full rounded-lg border border-line bg-surface-raised px-3 text-base text-ink" placeholder="مرجع التحويل أو الإيصال" /></label>
          <Button variant="burgundy" size="sm" disabled={busy || evidence.trim().length < 3} onClick={() => refund('complete')}>تأكيد إتمام الاسترداد</Button>
          <label className="text-sm font-semibold text-deep-teal">سبب تعذّر الاسترداد<textarea disabled={busy} value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} rows={2} className="mt-1 w-full rounded-lg border border-line bg-surface-raised p-3 text-base text-ink" /></label>
          <Button variant="secondary" size="sm" disabled={busy || reason.trim().length < 3} onClick={() => refund('fail')}>تسجيل فشل الاسترداد</Button>
        </>}
      </div>
      <ActionFeedback feedback={feedback} />
    </div>
  )
}
