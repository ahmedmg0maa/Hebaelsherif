import { REPORT_MONTH_OPTIONS, reportMonths } from '@/lib/reports/integrity'
import { Button } from '@/components/ui/Button'
import type { Metadata } from 'next'
import { getReports } from '@/lib/data/reports'
import { formatPrice } from '@/lib/format'
import { Card, CardTitle } from '@/components/ui/Card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table'
import { StatCard } from '@/components/ui/StatCard'
import { SnapshotButton } from '@/components/admin/SnapshotButton'
import { ReportExportPanel } from '@/components/admin/ReportExportPanel'
import { requirePermission } from '@/lib/auth/permissions'

export const metadata: Metadata = { title: 'التقارير — الإدارة' }

const dateFmt = new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Cairo' })

const typeLabels: Record<string, string> = {
  course: 'الدورات',
  book: 'الكتب',
  workshop: 'ورش العمل',
  session: 'الجلسات',
  bundle: 'الحزم',
  vip: 'VIP',
  free_resource: 'موارد مجانية',
  other: 'أخرى',
}

const bookingLabels: Record<string, string> = {
  pending: 'بانتظار التأكيد',
  confirmed: 'مؤكدة',
  completed: 'مكتملة',
  cancelled: 'ملغاة',
  no_show: 'تغيّب',
}

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ months?: string }> }) {
  const months = reportMonths((await searchParams).months)
  const { state, revenue, enrollments, bookings, memberships, snapshots } = await getReports(months)
  const exportPermission = await requirePermission('reports.export')

  if (state !== 'ready') {
    const unavailable = state === 'unconfigured'
    return <div className="mx-auto max-w-6xl space-y-8">
      <header><h1 className="text-3xl font-bold text-deep-teal">التقارير</h1></header>
      <Card className="max-w-2xl"><CardTitle>{unavailable ? 'مصدر التقارير غير مهيأ' : 'تعذّرت قراءة مصدر التقارير'}</CardTitle><p className="mt-3 leading-loose text-text-soft">لا نعرض أرقامًا عندما تتعذر القراءة الكاملة أو تتجاوز البيانات حد التجميع الآمن. تحققي من حالة النظام والاتصال والصلاحيات ثم أعيدي المحاولة.</p><a className="mt-4 inline-block text-sm font-bold text-deep-teal underline underline-offset-4" href="/admin/system">فتح حالة النظام</a></Card>
    </div>
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-deep-teal">التقارير</h1>
          <p className="mt-1 text-text-soft">قيمة الطلبات المدفوعة خلال الفترة المختارة. بيانات التعلّم والحجوزات والباقات تغطي كل السجل.</p>
        </div>
        <SnapshotButton />
      </header>

      <form className="flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-surface-raised p-4">
        <label className="grid gap-2 text-sm font-semibold text-deep-teal">فترة الطلبات المدفوعة<select name="months" defaultValue={months} className="min-h-12 rounded-xl border border-line bg-surface-raised px-4 text-base">{REPORT_MONTH_OPTIONS.map(value => <option key={value} value={value}>{value === 1 ? 'الشهر الحالي' : `${value.toLocaleString('ar-EG')} أشهر حتى الآن`}</option>)}</select></label>
        <Button type="submit" variant="secondary">تحديث التقرير</Button>
        <p className="basis-full text-sm leading-loose text-text-soft">الفترة تبدأ من أول شهر بتوقيت القاهرة وتشمل الشهر الحالي حتى الآن. القيم تمثل الطلبات المدفوعة، ولا تمثل صافي الربح أو تسوية الاستردادات.</p>
      </form>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={`الطلبات المدفوعة (${months.toLocaleString('ar-EG')} أشهر)`} value={formatPrice(revenue.total)} accent="teal" />
        <StatCard label="إجمالي الالتحاقات" value={enrollments.total.toLocaleString('ar-EG')} accent="cobalt" />
        <StatCard label="إجمالي الحجوزات" value={bookings.total.toLocaleString('ar-EG')} accent="burgundy" />
        <StatCard label="الاشتراكات النشطة" value={memberships.active.toLocaleString('ar-EG')} accent="teal" />
      </div>

      {exportPermission?.userId && (() => {
        const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' })
        const now = new Date()
        const start = new Date(now)
        start.setUTCDate(start.getUTCDate() - 29)
        return <ReportExportPanel defaultStart={formatter.format(start)} defaultEnd={formatter.format(now)} />
      })()}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardTitle className="mb-4">أداء الباقات</CardTitle>
          {memberships.byPlan.length === 0 ? (
            <p className="py-8 text-center text-sm text-taupe">لا باقات أو اشتراكات بعد.</p>
          ) : (
            <ul className="space-y-2">
              {memberships.byPlan.map((plan) => (
                <li key={plan.title} className="flex items-center justify-between rounded-xl bg-ivory/60 px-4 py-3 text-sm">
                  <span className="font-semibold text-deep-teal">{plan.title}</span>
                  <span className="tnum text-text-soft">{plan.active.toLocaleString('ar-EG')} نشط / {plan.total.toLocaleString('ar-EG')} إجمالي</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-0">
          <CardTitle className="p-6 pb-4">الإيرادات الشهرية</CardTitle>
          {revenue.byMonth.length === 0 ? (
            <p className="border-t border-line px-6 py-10 text-center text-sm text-taupe">
              يبدأ التقرير مع أول طلب مدفوع.
            </p>
          ) : (
            <Table className="rounded-none border-x-0 border-b-0 shadow-none">
              <THead>
                <tr>
                  <TH>الشهر</TH>
                  <TH>الطلبات</TH>
                  <TH>الإيراد</TH>
                </tr>
              </THead>
              <TBody>
                {revenue.byMonth.map((m) => (
                  <TR key={m.label}>
                    <TD>{m.label}</TD>
                    <TD>{m.orders.toLocaleString('ar-EG')}</TD>
                    <TD className="font-bold text-deep-teal">{formatPrice(m.revenue)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>

        <Card className="p-0">
          <CardTitle className="p-6 pb-4">الإيرادات حسب نوع المنتج</CardTitle>
          {revenue.byType.length === 0 ? (
            <p className="border-t border-line px-6 py-10 text-center text-sm text-taupe">
              يظهر التوزيع مع أول عملية بيع.
            </p>
          ) : (
            <Table className="rounded-none border-x-0 border-b-0 shadow-none">
              <THead>
                <tr>
                  <TH>النوع</TH>
                  <TH>العناصر المباعة</TH>
                  <TH>الإيراد</TH>
                </tr>
              </THead>
              <TBody>
                {revenue.byType.map((t) => (
                  <TR key={t.type}>
                    <TD>{typeLabels[t.type] ?? t.type}</TD>
                    <TD>{t.orders.toLocaleString('ar-EG')}</TD>
                    <TD className="font-bold text-deep-teal">{formatPrice(t.revenue)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      </div>

      <Card className="p-0">
        <CardTitle className="p-6 pb-4">تقرير الدورات</CardTitle>
        {enrollments.courses.length === 0 ? (
          <p className="border-t border-line px-6 py-10 text-center text-sm text-taupe">لا دورات مسجلة بعد.</p>
        ) : (
          <Table className="rounded-none border-x-0 border-b-0 shadow-none">
            <THead>
              <tr>
                <TH>الدورة</TH>
                <TH>الالتحاقات</TH>
                <TH>متوسط التقدم</TH>
                <TH>أتممن الدورة</TH>
              </tr>
            </THead>
            <TBody>
              {enrollments.courses.map((c) => (
                <TR key={c.title}>
                  <TD className="font-semibold text-deep-teal">{c.title}</TD>
                  <TD>{c.enrollments.toLocaleString('ar-EG')}</TD>
                  <TD>{c.avgPercent.toLocaleString('ar-EG')}٪</TD>
                  <TD>{c.completions.toLocaleString('ar-EG')}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardTitle className="mb-4">الحجوزات حسب الحالة</CardTitle>
          {bookings.byStatus.length === 0 ? (
            <p className="py-8 text-center text-sm text-taupe">لا حجوزات مسجلة بعد.</p>
          ) : (
            <ul className="space-y-2">
              {bookings.byStatus.map((b) => (
                <li key={b.status} className="flex items-center justify-between rounded-xl bg-ivory/60 px-4 py-2.5 text-sm">
                  <span className="text-ink">{bookingLabels[b.status] ?? b.status}</span>
                  <span className="tnum font-bold text-deep-teal">{b.count.toLocaleString('ar-EG')}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardTitle className="mb-4">اللقطات المحفوظة</CardTitle>
          {snapshots.length === 0 ? (
            <p className="py-8 text-center text-sm text-taupe">
              «حفظ لقطة الآن» يخزّن أرقام اليوم للمقارنة التاريخية لاحقًا.
            </p>
          ) : (
            <ul className="divide-y divide-line/70">
              {snapshots.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-3 text-sm">
                  <span className="font-semibold text-ink">لقطة شاملة</span>
                  <span className="tnum text-taupe">{dateFmt.format(new Date(s.createdAt))}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
