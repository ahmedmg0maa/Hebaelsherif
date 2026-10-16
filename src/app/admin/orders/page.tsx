import type { Metadata } from 'next'
import Link from 'next/link'
import { getAdminOrders } from '@/lib/data/admin'
import { formatPrice } from '@/lib/format'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { OrderActions } from '@/components/admin/OrderActions'
import { cn } from '@/lib/cn'
import { requirePermission } from '@/lib/auth/permissions'

export const metadata: Metadata = { title: 'الطلبات — الإدارة' }

const dateFmt = new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

const statuses = [
  { key: '', label: 'الكل' },
  { key: 'pending_payment', label: 'بانتظار الدفع' },
  { key: 'awaiting_review', label: 'قيد المراجعة' },
  { key: 'paid', label: 'مدفوع' },
  { key: 'refund_pending', label: 'الاسترداد قيد التنفيذ' },
  { key: 'expired', label: 'منتهي' },
  { key: 'cancelled', label: 'ملغي' },
  { key: 'refunded', label: 'مسترد' },
]

const badgeTones: Record<string, 'success' | 'pending' | 'sand' | 'danger' | 'cobalt'> = {
  pending_payment: 'pending',
  awaiting_review: 'cobalt',
  paid: 'success',
  refund_pending: 'cobalt',
  expired: 'sand',
  cancelled: 'sand',
  refunded: 'danger',
}

type Props = { searchParams: Promise<{ status?: string }> }

export default async function AdminOrdersPage({ searchParams }: Props) {
  const { status } = await searchParams
  const [orders, updatePermission, refundPermission] = await Promise.all([
    getAdminOrders(status || undefined),
    requirePermission('orders.update'),
    requirePermission('orders.refund'),
  ])
  const active = status ?? ''

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-deep-teal">الطلبات</h1>
        <p className="mt-1 text-text-soft">دورة حياة كل طلب — من الإنشاء حتى الدفع أو الإلغاء أو الاسترداد.</p>
      </header>

      <nav className="flex flex-wrap gap-2" aria-label="تصفية حسب الحالة">
        {statuses.map((s) => (
          <Link
            key={s.key}
            href={s.key ? `/admin/orders?status=${s.key}` : '/admin/orders'}
            className={cn(
              'rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors',
              active === s.key
                ? 'border-deep-teal bg-deep-teal text-on-dark'
                : 'border-line bg-surface-raised text-text-soft hover:border-deep-teal hover:text-deep-teal',
            )}
          >
            {s.label}
          </Link>
        ))}
      </nav>

      {orders.length === 0 ? (
        <EmptyState
          title="لا طلبات هنا"
          description={active ? 'لا طلبات بهذه الحالة حاليًا — جرّبي تصفية أخرى.' : 'تظهر الطلبات هنا فور إنشاء العميلات لها.'}
        />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>العميلة</TH>
              <TH>المنتج</TH>
              <TH>الإجمالي</TH>
              <TH>التاريخ</TH>
              <TH>الحالة</TH>
              <TH>الإجراء</TH>
            </tr>
          </THead>
          <TBody>
            {orders.map((o) => (
              <TR key={o.id}>
                <TD>
                  <p className="font-semibold text-deep-teal">{o.customerName}</p>
                  <p dir="ltr" className="text-xs text-taupe">{o.customerEmail}</p>
                </TD>
                <TD className="max-w-52">
                  <span className="line-clamp-2">{o.productTitles.join(' + ') || '—'}</span>
                </TD>
                <TD className="font-bold">{formatPrice(o.total)}</TD>
                <TD>{dateFmt.format(new Date(o.createdAt))}</TD>
                <TD>
                  <Badge tone={badgeTones[o.status] ?? 'sand'}>
                    {statuses.find((s) => s.key === o.status)?.label ?? o.status}
                  </Badge>
                </TD>
                <TD>
                  <OrderActions orderId={o.id} status={o.status} canUpdate={Boolean(updatePermission)} canRefund={Boolean(refundPermission)} />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  )
}
