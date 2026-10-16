import { AccountPagination } from '@/components/dashboard/AccountPagination'
import { accountPage } from '@/lib/customer-order-state'
import { getCollectionCount } from '@/lib/data/customer-account'
import type { Metadata } from 'next'
import { getMyPayments, type MyPayment } from '@/lib/data/dashboard'
import { formatPrice } from '@/lib/data/catalog'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import Link from 'next/link'
import { isPast } from '@/lib/format'
import { cn } from '@/lib/cn'

export const metadata: Metadata = { title: 'مدفوعاتي' }

const methodLabels: Record<string, string> = {
  instapay: 'إنستاباي',
  wallet: 'محفظة إلكترونية',
  bank_transfer: 'تحويل بنكي',
}

const dateFmt = new Intl.DateTimeFormat('ar-EG', {
  timeZone: 'Africa/Cairo',
  day: 'numeric',
  month: 'long',
  hour: 'numeric',
  minute: '2-digit',
})

function statusBadge(p: MyPayment) {
  if (p.orderStatus === 'refund_pending') return <Badge tone="cobalt">الاسترداد قيد التنفيذ</Badge>
  if (p.status === 'cancelled') return <Badge tone="sand">ملغي</Badge>
  if (p.status === 'refunded') return <Badge tone="danger">مسترد</Badge>
  if (p.status === 'approved') return <Badge tone="success">مقبول — تم تفعيل الوصول</Badge>
  if (p.status === 'rejected') return <Badge tone="danger">مرفوض</Badge>
  if (p.orderExpiresAt && new Date(p.orderExpiresAt).getTime() < Date.now() && p.orderStatus === 'pending_payment')
    return <Badge tone="sand">منتهي الصلاحية</Badge>
  return <Badge tone="pending">قيد المراجعة</Badge>
}

function Timeline({ p }: { p: MyPayment }) {
  const steps: { label: string; time: string | null; state: 'done' | 'bad' | 'wait' }[] = [
    { label: 'أُرسل الإيصال', time: p.createdAt, state: 'done' },
  ]
  if (p.status === 'approved') {
    steps.push({ label: 'اعتُمد الدفع وفُعّل الوصول', time: p.reviewedAt, state: 'done' })
    if (p.orderStatus === 'refund_pending') steps.push({ label: 'الاسترداد قيد التنفيذ — يظل الوصول فعالًا حتى تأكيد إعادة المبلغ', time: null, state: 'wait' })
  } else if (p.status === 'refunded') {
    steps.push({ label: 'اكتمل الاسترداد وسُحبت الاستحقاقات المرتبطة بالطلب', time: null, state: 'done' })
  } else if (p.status === 'cancelled') {
    steps.push({label:'أُلغي إثبات الدفع',time:p.reviewedAt,state:'bad'})
  } else if (p.status === 'rejected') {
    steps.push({ label: `رُفض الدفع${p.rejectReason ? ` — ${p.rejectReason}` : ''}`, time: p.reviewedAt, state: 'bad' })
    if(p.orderStatus==='pending_payment' && p.orderExpiresAt && !isPast(p.orderExpiresAt)) steps.push({label:'استكملي الإثبات من تفاصيل الطلب قبل انتهاء مهلته',time:null,state:'wait'})
  } else {
    steps.push({ label: 'قيد مراجعة الفريق ضمن أوقات العمل', time: null, state: 'wait' })
  }
  return (
    <ol className="mt-4 space-y-3 border-t border-line pt-4">
      {steps.map((s) => (
        <li key={s.label} className="flex items-start gap-3 text-sm">
          <span
            className={cn(
              'mt-1 h-2.5 w-2.5 shrink-0 rounded-full',
              s.state === 'done' && 'bg-deep-teal',
              s.state === 'bad' && 'bg-burgundy',
              s.state === 'wait' && 'border border-taupe bg-transparent',
            )}
            aria-hidden
          />
          <span className={cn(s.state === 'wait' ? 'text-taupe' : 'text-ink')}>
            {s.label}
            {s.time && <time className="tnum ms-2 text-xs text-taupe">{dateFmt.format(new Date(s.time))}</time>}
          </span>
        </li>
      ))}
    </ol>
  )
}

export default async function PaymentsPage({searchParams}:{searchParams:Promise<{page?:string}>}) {
  const page=accountPage((await searchParams).page)
  const [payments,total]=await Promise.all([getMyPayments(page),getCollectionCount('payments')])

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8">
        <h1 className="font-heading text-3xl font-bold leading-snug text-deep-teal">مدفوعاتي</h1>
        <p className="mt-1 text-text-soft">تابعي حالة كل دفعة من الإرسال حتى تفعيل الوصول.</p>
      </header>

      {payments.length === 0 ? (
        <EmptyState
          title="لا توجد مدفوعات بعد"
          description="حين تشترين دورة أو كتابًا أو تحجزين جلسة ستظهر حالة الدفع هنا خطوة بخطوة."
          actionLabel="استكشفي الدورات"
          actionHref="/courses"
        />
      ) : (
        <div className="space-y-5">
          {payments.map((p) => (
            <Card key={p.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold text-deep-teal">
                    {p.productTitles.length > 0 ? p.productTitles.join(' + ') : 'طلب شراء'}
                  </h2>
                  <p className="tnum mt-1 text-sm text-taupe">
                    {methodLabels[p.method] ?? p.method} · {formatPrice(p.amount,p.currency)}
                  </p>
                </div>
                {statusBadge(p)}
              </div>
              <Timeline p={p} />
              <Link href={`/dashboard/orders/${p.orderId}`} className="mt-4 inline-flex min-h-12 items-center rounded-xl border border-line px-4 text-sm font-semibold text-deep-teal">تفاصيل الطلب وإثبات الدفع</Link>
            </Card>
          ))}
        </div>
      )}
      <div className="mt-6"><AccountPagination page={page} total={total} base="/dashboard/payments"/></div>
    </div>
  )
}
