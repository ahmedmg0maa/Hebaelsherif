import type { Metadata } from 'next'
import Link from 'next/link'
import { getAdminKpis, getAdminOverviewCounts, getApprovalQueue, getRecentCustomers, getTodaySchedule } from '@/lib/data/admin'
import { formatPrice } from '@/lib/format'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { RevenueChart, DonutChart } from '@/components/admin/Charts'
import { ApprovalActions } from '@/components/admin/ApprovalActions'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table'
import { getContentReadiness, launchLevelForStatus } from '@/lib/data/cms'
import { requirePermission } from '@/lib/auth/permissions'

export const metadata: Metadata = { title: 'نظرة عامة — الإدارة' }

const timeFmt = new Intl.DateTimeFormat('ar-EG', { hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Cairo' })
const dateFmt = new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short', timeZone: 'Africa/Cairo' })

export default async function AdminOverviewPage() {
  const [kpis, approvals, customers, schedule, counters, readiness, approvePermission, rejectPermission] = await Promise.all([
    getAdminKpis(),
    getApprovalQueue(5),
    getRecentCustomers(),
    getTodaySchedule(),
    getAdminOverviewCounts(),
    getContentReadiness(),
    requirePermission('payments.approve'),
    requirePermission('payments.reject'),
  ])
  const pendingReschedules = counters.reschedules
  const activeAlerts = counters.alerts
  const launchBlockers = readiness.filter((item) => launchLevelForStatus(item.status) === 'blocker').length

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <h1 className="text-4xl font-bold text-deep-teal">لوحة التحكم</h1>
        <p className="mt-1 text-text-soft">نبض المنصة اليوم — الإيرادات والموافقات والمواعيد.</p>
      </header>

      {kpis.health !== 'ready' && <Card className="border-antique-gold/35 bg-antique-gold/5"><CardTitle>بيانات التشغيل غير جاهزة للعرض</CardTitle><p className="mt-2 text-sm leading-relaxed text-text-soft">{kpis.health === 'unconfigured' ? 'لا توجد تهيئة قراءة محلية؛ لا تعرض اللوحة أصفارًا باعتبارها بيانات تشغيل.' : 'تعذّر استعلام مصدر التشغيل. راجعي حالة النظام والصلاحيات والترحيلات قبل اتخاذ قرار.'}</p><Link href="/admin/system" className="mt-3 inline-block text-sm font-bold text-burgundy">فتح حالة النظام ←</Link></Card>}

      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/admin/bookings" className="rounded-2xl border border-line bg-surface-raised p-5 shadow-card transition hover:-translate-y-0.5"><span className="text-xs font-bold text-text-soft">طلبات إعادة الجدولة المنتظرة</span><strong className="mt-2 block text-3xl text-deep-teal">{pendingReschedules?.toLocaleString('ar-EG') ?? 'غير متاح'}</strong><span className="mt-2 block text-sm text-burgundy">فتح الأجندة والتفاصيل ←</span></Link>
        <Link href="/admin/system" className="rounded-2xl border border-line bg-surface-raised p-5 shadow-card transition hover:-translate-y-0.5"><span className="text-xs font-bold text-text-soft">تنبيهات التشغيل — آخر 24 ساعة</span><strong className="mt-2 block text-3xl text-deep-teal">{activeAlerts?.toLocaleString('ar-EG') ?? 'غير متاح'}</strong><span className="mt-2 block text-sm text-burgundy">مراجعة سجل النظام ←</span></Link>
        <Link href="/admin/system" className="rounded-2xl border border-line bg-surface-raised p-5 shadow-card transition hover:-translate-y-0.5"><span className="text-xs font-bold text-text-soft">موانع الإطلاق</span><strong className="mt-2 block text-3xl text-burgundy">{launchBlockers.toLocaleString('ar-EG')}</strong><span className="mt-2 block text-sm text-burgundy">فتح لوحة الجاهزية ←</span></Link>
      </div>

      <Card className="p-5"><div className="flex flex-wrap items-center gap-3"><span className="font-bold text-deep-teal">إجراءات سريعة:</span><Link className="rounded-full border border-line px-4 py-2 text-sm font-semibold" href="/admin/services">إضافة خدمة</Link><Link className="rounded-full border border-line px-4 py-2 text-sm font-semibold" href="/admin/products">إضافة منتج</Link><Link className="rounded-full border border-line px-4 py-2 text-sm font-semibold" href="/admin/articles">كتابة مقال</Link><Link className="rounded-full border border-line px-4 py-2 text-sm font-semibold" href="/admin/media">رفع وسائط</Link><Link className="rounded-full border border-line px-4 py-2 text-sm font-semibold" href="/admin/bookings">المواعيد والحجوزات</Link><Link className="rounded-full border border-line px-4 py-2 text-sm font-semibold" href="/admin/settings">فتح / إغلاق الاستقبال</Link><Link className="rounded-full border border-line px-4 py-2 text-sm font-semibold" href="/admin/system">متابعة التشغيل</Link></div></Card>

      {/* KPI strip */}
      {kpis.health === 'ready' && <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="إيرادات الشهر — بالجنيه المصري" value={formatPrice(kpis.revenueThisMonth)} accent="teal" sparkline={kpis.revenueByDay.length > 1 ? kpis.revenueByDay : undefined} />
        <StatCard label="مدفوعات بانتظار المراجعة" value={kpis.pendingPayments.toLocaleString('ar-EG')} accent="gold" />
        <StatCard label="التحاقات الدورات" value={kpis.activeStudents.toLocaleString('ar-EG')} accent="cobalt" />
        <StatCard label="حجوزات قادمة" value={kpis.upcomingBookings.toLocaleString('ar-EG')} accent="burgundy" />
      </div>}

      {/* Charts */}
      {kpis.health === 'ready' && <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardTitle className="mb-4">الإيرادات بالجنيه المصري — آخر ٦ أشهر</CardTitle>
          <RevenueChart data={kpis.revenueByMonth} />
        </Card>
        <Card>
          <CardTitle className="mb-4">الحجوزات حسب الحالة</CardTitle>
          <DonutChart data={kpis.bookingsByStatus} />
        </Card>
      </div>}

      {/* Approvals */}
      <Card className="p-0">
        <div className="flex items-center justify-between p-6 pb-4">
          <CardTitle>موافقات الدفع</CardTitle>
          <Link href="/admin/payments" className="text-sm font-semibold text-burgundy">
            القائمة الكاملة
          </Link>
        </div>
        {approvals.length === 0 ? (
          <p className="border-t border-line px-6 py-10 text-center text-sm text-taupe">
            لا مدفوعات بانتظار المراجعة — صندوقك نظيف ✨
          </p>
        ) : (
          <Table className="rounded-none border-x-0 border-b-0 shadow-none">
            <THead>
              <tr>
                <TH>العميلة</TH>
                <TH>المنتج</TH>
                <TH>المبلغ</TH>
                <TH>الإجراء</TH>
              </tr>
            </THead>
            <TBody>
              {approvals.map((a) => (
                <TR key={a.paymentId}>
                  <TD className="font-semibold text-deep-teal">{a.customerName}</TD>
                  <TD className="max-w-48 truncate">{a.productTitles.join(' + ') || '—'}</TD>
                  <TD>{formatPrice(a.amount)}</TD>
                  <TD>
                    <ApprovalActions paymentId={a.paymentId} hasProof={a.proofPresent} canApprove={Boolean(approvePermission)} canReject={Boolean(rejectPermission)} />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>

      {/* Customers + schedule */}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardTitle className="mb-4">أحدث العميلات</CardTitle>
          {customers.length === 0 ? (
            <p className="py-8 text-center text-sm text-taupe">تظهر العميلات الجدد هنا فور أول تسجيل.</p>
          ) : (
            <ul className="divide-y divide-line/70">
              {customers.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-deep-teal/10 font-heading font-bold text-deep-teal" aria-hidden>
                      {c.name.charAt(0)}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-ink">{c.name}</p>
                      <p dir="ltr" className="text-xs text-taupe">{c.email}</p>
                    </div>
                  </div>
                  <span className="tnum text-xs text-taupe">{dateFmt.format(new Date(c.joinedAt))}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardTitle className="mb-4">جدول اليوم</CardTitle>
          {schedule.length === 0 ? (
            <p className="py-8 text-center text-sm text-taupe">لا جلسات اليوم — يوم مثالي للمحتوى ☕</p>
          ) : (
            <ol className="space-y-3">
              {schedule.map((s) => (
                <li key={s.id} className="flex items-center gap-4 rounded-xl bg-ivory/60 p-3">
                  <span className="tnum w-16 shrink-0 text-sm font-bold text-deep-teal">
                    {timeFmt.format(new Date(s.startsAt))}
                  </span>
                  <span className="flex-1 text-sm text-ink">{s.title}</span>
                  <Badge tone={s.status === 'confirmed' ? 'success' : 'pending'}>
                    {s.status === 'confirmed' ? 'مؤكد' : 'بانتظار'}
                  </Badge>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  )
}
