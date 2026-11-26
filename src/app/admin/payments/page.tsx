import type { Metadata } from 'next'
import { getApprovalQueue } from '@/lib/data/admin'
import { formatPrice } from '@/lib/format'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table'
import { EmptyState } from '@/components/ui/EmptyState'
import { ApprovalActions } from '@/components/admin/ApprovalActions'
import { requirePermission } from '@/lib/auth/permissions'

export const metadata: Metadata = { title: 'موافقات الدفع — الإدارة' }

const dateFmt = new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

const methodLabels: Record<string, string> = {
  instapay: 'إنستاباي',
  wallet: 'محفظة',
  bank_transfer: 'تحويل بنكي',
}

export default async function AdminPaymentsPage() {
  const [queue, approvePermission, rejectPermission] = await Promise.all([
    getApprovalQueue(),
    requirePermission('payments.approve'),
    requirePermission('payments.reject'),
  ])
  const pendingTotal = queue.reduce((s, a) => s + a.amount, 0)

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-deep-teal">موافقات الدفع</h1>
          <p className="mt-1 text-text-soft">
            راجعي الإيصال ثم اعتمدي أو ارفضي — الاعتماد يفعّل وصول العميلة تلقائيًا ويرسل لها إشعارًا.
          </p>
        </div>
        {queue.length > 0 && (
          <div className="rounded-2xl border border-antique-gold/40 bg-surface-raised px-5 py-3 text-center shadow-card">
            <p className="text-xs font-semibold text-taupe">بانتظار المراجعة</p>
            <p className="tnum text-xl font-bold text-deep-teal">
              {queue.length.toLocaleString('ar-EG')} · {formatPrice(pendingTotal)}
            </p>
          </div>
        )}
      </header>

      {queue.length === 0 ? (
        <EmptyState
          title="لا مدفوعات بانتظار المراجعة"
          description="حين ترفع عميلة إيصال تحويل يظهر هنا فورًا مع كل تفاصيل الطلب."
        />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>العميلة</TH>
              <TH>المنتج</TH>
              <TH>الوسيلة</TH>
              <TH>المبلغ</TH>
              <TH>أُرسل</TH>
              <TH>الإجراء</TH>
            </tr>
          </THead>
          <TBody>
            {queue.map((a) => (
              <TR key={a.paymentId}>
                <TD>
                  <p className="font-semibold text-deep-teal">{a.customerName}</p>
                  <p dir="ltr" className="text-xs text-taupe">{a.customerEmail}</p>
                </TD>
                <TD className="max-w-52">
                  <span className="line-clamp-2">{a.productTitles.join(' + ') || '—'}</span>
                </TD>
                <TD>{methodLabels[a.method] ?? a.method}</TD>
                <TD className="font-bold">{formatPrice(a.amount)}</TD>
                <TD>{dateFmt.format(new Date(a.createdAt))}</TD>
                <TD>
                  <ApprovalActions paymentId={a.paymentId} hasProof={a.proofPresent} canApprove={Boolean(approvePermission)} canReject={Boolean(rejectPermission)} />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  )
}
