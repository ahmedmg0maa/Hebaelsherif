import type { Metadata } from 'next'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { AdminSessionsPanel } from '@/components/admin/AdminSessionsPanel'
import { getAdminSessionInventory } from '@/lib/actions/admin-sessions'
import { getAdminSecurityCenter, type SecurityCheckStatus } from '@/lib/data/security'

export const metadata: Metadata = { title: 'الأمان — الإدارة' }

const statusTone: Record<SecurityCheckStatus, 'success' | 'cobalt' | 'sand' | 'pending' | 'danger'> = {
  'verified-live': 'success',
  'verified-local': 'cobalt',
  configured: 'sand',
  unverified: 'pending',
  failed: 'danger',
}
const statusLabel: Record<SecurityCheckStatus, string> = {
  'verified-live': 'مثبت حيًا',
  'verified-local': 'مثبت محليًا',
  configured: 'مهيأ فقط',
  unverified: 'غير متحقق',
  failed: 'فشل الفحص',
}
const stateLabel = {
  'verified-live': 'تم فحص قاعدة الهدف',
  'migration-required': 'يلزم migration 056 على Staging',
  unconfigured: 'البيئة غير مهيأة',
  unavailable: 'الفحص غير متاح',
}
const eventLabel: Record<string, string> = {
  login_succeeded: 'تسجيل دخول إداري ناجح',
  login_failed: 'محاولة دخول إدارية مرفوضة',
  mfa_enrolled: 'تسجيل عامل MFA',
  mfa_verified: 'تأكيد MFA',
  session_revoked: 'إلغاء جلسة إدارة',
  reauth_required: 'طُلبت إعادة التحقق',
}
const formatter = new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })

export default async function AdminSecurityPage() {
  const [center, inventory] = await Promise.all([getAdminSecurityCenter(), getAdminSessionInventory()])
  const metric = (value: number | null) => value === null ? 'غير متحقق' : value.toLocaleString('ar-EG')
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-deep-teal">مركز الأمان</h1>
        <p className="mt-1 leading-relaxed text-text-soft">يفصل بين دليل المصدر المحلي، وجود الإعداد، والفحص الحي على قاعدة الهدف. لا تتحول التهيئة وحدها إلى شارة نجاح.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge tone={center.state === 'verified-live' ? 'success' : center.state === 'unavailable' ? 'danger' : 'pending'}>{stateLabel[center.state]}</Badge>
          {center.checkedAt && <span className="text-xs text-text-soft">آخر فحص: {formatter.format(new Date(center.checkedAt))}</span>}
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="مؤشرات الأمان التشغيلية">
        {[
          ['الجلسات النشطة', center.metrics.activeSessions],
          ['الحظر النشط', center.metrics.activeLockouts],
          ['محاولات مرفوضة / ٢٤س', center.metrics.failedLogins24h],
          ['أحداث أمان / ٧ أيام', center.metrics.events7d],
        ].map(([label, value]) => <Card key={String(label)} className="p-5"><p className="text-xs font-bold text-text-soft">{label}</p><strong className="mt-2 block text-2xl text-deep-teal">{metric(value as number | null)}</strong></Card>)}
      </section>

      <Card className="space-y-5 p-8">
        <div><CardTitle>الضوابط والأدلة</CardTitle><p className="mt-2 text-sm leading-relaxed text-text-soft">فشل فحص واحد لا يُخفى، وعدم الاتصال لا يُعرض كنجاح.</p></div>
        <ul className="space-y-4">
          {center.checks.map((check) => (
            <li key={check.id} className="rounded-2xl border border-line/80 bg-ivory/45 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-bold text-ink">{check.title}</p><Badge tone={statusTone[check.status]}>{statusLabel[check.status]}</Badge></div>
              <p className="mt-2 text-sm leading-relaxed text-text-soft">{check.detail}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-8"><AdminSessionsPanel inventory={inventory} /></Card>

      <Card className="p-8">
        <CardTitle className="mb-4">أحداث الأمان الأخيرة</CardTitle>
        {!center.eventsAvailable ? <p className="rounded-xl bg-antique-gold/10 px-4 py-3 text-sm text-text-soft" role="status">تعذّرت قراءة الأحداث؛ لم تُفسّر النتيجة على أنها سجل فارغ.</p> : center.events.length === 0 ? <p className="rounded-xl bg-ivory/60 px-4 py-3 text-sm text-text-soft">لا توجد أحداث أمان مسجلة في النطاق المقروء.</p> : <ul className="divide-y divide-line/70">
          {center.events.map((event) => <li key={event.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><span className="text-sm font-semibold text-ink">{eventLabel[event.event] ?? 'حدث أمان إداري'}</span><time className="text-xs text-text-soft" dateTime={event.created_at}>{formatter.format(new Date(event.created_at))}</time></li>)}
        </ul>}
        <p className="mt-4 text-xs leading-relaxed text-text-soft">لا تعرض هذه الصفحة عناوين IP أو بصمات الطلب أو رموز الجلسة أو قيم الأسرار.</p>
      </Card>
    </div>
  )
}
