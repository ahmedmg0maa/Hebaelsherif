import type { Metadata } from 'next'
import { getAdminCoupons } from '@/lib/data/admin'
import { formatPrice } from '@/lib/format'
import { Card, CardTitle } from '@/components/ui/Card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { CouponForm, ActiveToggle, CouponEdit } from '@/components/admin/MarketingForms'

export const metadata: Metadata = { title: 'الكوبونات — الإدارة' }

const dateFmt = new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' })

export default async function AdminCouponsPage() {
  const coupons = await getAdminCoupons()

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-deep-teal">الكوبونات</h1>
        <p className="mt-1 text-text-soft">أنشئي أكواد خصم بحدود استخدام ونوافذ زمنية — تُتحقق دائمًا على الخادم.</p>
      </header>

      <Card className="p-8">
        <CardTitle className="mb-6">كوبون جديد</CardTitle>
        <CouponForm />
      </Card>

      {coupons.length === 0 ? (
        <EmptyState title="لا كوبونات بعد" description="أنشئي أول كود خصم من النموذج أعلاه — يعمل فورًا في صفحة الدفع." />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>الكود</TH>
              <TH>الخصم</TH>
              <TH>الاستخدام</TH>
              <TH>ينتهي</TH>
              <TH>الحالة</TH>
              <TH>الإجراء</TH>
            </tr>
          </THead>
          <TBody>
            {coupons.map((c) => (
              <TR key={c.id}>
                <TD className="font-bold text-deep-teal">
                  <span dir="ltr">{c.code}</span>
                </TD>
                <TD>{c.kind === 'percent' ? `${c.value.toLocaleString('ar-EG')}٪` : formatPrice(c.value)}</TD>
                <TD>
                  {c.redemptions.toLocaleString('ar-EG')}
                  {c.maxUses ? ` / ${c.maxUses.toLocaleString('ar-EG')}` : ' / ∞'}
                </TD>
                <TD>{c.endsAt ? dateFmt.format(new Date(c.endsAt)) : 'مفتوح'}</TD>
                <TD>
                  <Badge tone={c.isActive ? 'success' : 'sand'}>{c.isActive ? 'فعّال' : 'موقوف'}</Badge>
                </TD>
                <TD>
                  <div className="flex flex-wrap items-start gap-2"><ActiveToggle id={c.id} active={c.isActive} kind="coupon" /><CouponEdit coupon={c} /></div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  )
}
