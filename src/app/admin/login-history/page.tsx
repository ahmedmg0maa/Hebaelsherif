import type { Metadata } from 'next'
import Link from 'next/link'
import { getAdminLoginHistory, ADMIN_LOGIN_EVENTS, ADMIN_LOGIN_OUTCOMES, type AdminLoginEvent, type AdminLoginOutcome } from '@/lib/data/admin-login-history'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table'

export const metadata: Metadata = { title: 'سجل الدخول — الإدارة' }

type Search = { event?: string; outcome?: string; from?: string; to?: string; page?: string }
type Props = { searchParams: Promise<Search> }

const eventLabel: Record<AdminLoginEvent, string> = {
  login_succeeded: 'دخول ناجح', login_failed: 'دخول مرفوض', mfa_enrolled: 'تسجيل MFA', mfa_verified: 'تحقق MFA',
  session_created: 'جلسة جديدة', session_revoked: 'إلغاء جلسة', session_expired: 'انتهاء جلسة', logout: 'خروج', reauth_required: 'إعادة تحقق',
}
const outcomeLabel: Record<AdminLoginOutcome, string> = { success: 'نجاح', failure: 'فشل', blocked: 'محظور' }
const tone: Record<AdminLoginOutcome, 'success' | 'danger' | 'pending'> = { success: 'success', failure: 'danger', blocked: 'pending' }
const formatter = new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Cairo' })

function pageHref(search: Search, page: number) {
  const params = new URLSearchParams()
  for (const key of ['event','outcome','from','to'] as const) if (search[key]) params.set(key, search[key]!)
  params.set('page', String(page))
  return `/admin/login-history?${params}`
}

export default async function AdminLoginHistoryPage({ searchParams }: Props) {
  const search = await searchParams
  const history = await getAdminLoginHistory({ ...search, page: Number(search.page ?? 1) })
  const pages = Math.max(1, Math.ceil(history.total / history.pageSize))

  return <div className="mx-auto max-w-7xl space-y-7">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-3xl font-bold text-deep-teal">أرشيف تسجيل الدخول</h1><p className="mt-2 max-w-3xl leading-relaxed text-text-soft">سجل غير قابل للتعديل لدخول الإدارة وMFA والجلسات. عناوين IP وبيانات المتصفح الخام لا تُخزّن؛ يظهر مرجع بصمة مختصر للربط بين المحاولات دون كشف البيانات الأصلية.</p></div>
      <Link href="/admin/audit-logs" className="rounded-full border border-line px-4 py-2 text-sm font-bold text-deep-teal">سجل كل إجراءات الإدارة</Link>
    </header>

    <Card className="p-5">
      <form className="grid gap-3 md:grid-cols-5" method="get">
        <label className="text-sm font-bold text-deep-teal">الحدث<select name="event" defaultValue={search.event ?? ''} className="mt-2 min-h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-ink"><option value="">الكل</option>{ADMIN_LOGIN_EVENTS.map((event) => <option key={event} value={event}>{eventLabel[event]}</option>)}</select></label>
        <label className="text-sm font-bold text-deep-teal">النتيجة<select name="outcome" defaultValue={search.outcome ?? ''} className="mt-2 min-h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-ink"><option value="">الكل</option>{ADMIN_LOGIN_OUTCOMES.map((outcome) => <option key={outcome} value={outcome}>{outcomeLabel[outcome]}</option>)}</select></label>
        <label className="text-sm font-bold text-deep-teal">من<input type="date" name="from" defaultValue={search.from ?? ''} className="mt-2 min-h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-ink" /></label>
        <label className="text-sm font-bold text-deep-teal">إلى<input type="date" name="to" defaultValue={search.to ?? ''} className="mt-2 min-h-11 w-full rounded-xl border border-line bg-surface-raised px-3 text-ink" /></label>
        <div className="flex items-end gap-2"><button className="min-h-11 flex-1 rounded-xl bg-deep-teal px-4 font-bold text-on-dark">تطبيق</button><Link href="/admin/login-history" className="grid min-h-11 place-items-center rounded-xl border border-line px-4 text-sm font-bold text-deep-teal">مسح</Link></div>
      </form>
    </Card>

    {history.state !== 'ready' ? <Card className="border-burgundy/20 p-6"><h2 className="font-bold text-burgundy">السجل غير متاح</h2><p className="mt-2 text-sm leading-relaxed text-text-soft">{history.state === 'migration-required' ? 'يلزم تطبيق Migration 080 على Staging أولًا لتفعيل الحقول الجديدة.' : history.state === 'unconfigured' ? 'بيئة العرض غير متصلة بمزود البيانات.' : 'تعذّرت قراءة السجل؛ لم تُعرض النتيجة كسجل فارغ.'}</p></Card> : <>
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-bold text-text-soft">{history.total.toLocaleString('ar-EG')} حدث · صفحة {history.page.toLocaleString('ar-EG')} من {pages.toLocaleString('ar-EG')}</p><a href={`/admin/login-history/export?${new URLSearchParams({ event: search.event ?? '', outcome: search.outcome ?? '', from: search.from ?? '', to: search.to ?? '' })}`} className="rounded-full border border-line px-4 py-2 text-sm font-bold text-deep-teal">تصدير CSV</a></div>
      {history.rows.length === 0 ? <Card className="p-8 text-center text-text-soft">لا توجد أحداث مطابقة للفلاتر المحددة.</Card> : <Table>
        <THead><tr><TH>الحساب</TH><TH>الحدث</TH><TH>الحماية والجهاز</TH><TH>المراجع</TH><TH>الوقت</TH></tr></THead>
        <TBody>{history.rows.map((row) => <TR key={row.id}>
          <TD><p className="font-semibold text-deep-teal">{row.actorName}</p>{row.actorEmail && <p className="text-xs text-taupe" dir="ltr">{row.actorEmail}</p>}{row.actorRoles.length > 0 && <p className="mt-1 text-xs text-text-soft">{row.actorRoles.join('، ')}</p>}</TD>
          <TD><Badge tone={tone[row.outcome]}>{outcomeLabel[row.outcome]}</Badge><p className="mt-2 text-xs font-bold text-ink">{eventLabel[row.event]}</p>{row.reason && <p className="mt-1 text-xs text-text-soft">{row.reason}</p>}</TD>
          <TD><p className="text-sm text-ink">{row.deviceLabel ?? 'غير متاح'}</p><p className="mt-1 text-xs text-taupe" dir="ltr">{row.aal?.toUpperCase() ?? '—'}</p></TD>
          <TD><p className="text-xs text-taupe" dir="ltr">Session: {row.sessionReference ?? '—'}</p><p className="mt-1 text-xs text-taupe" dir="ltr">Fingerprint: {row.fingerprintReference ?? '—'}</p>{row.requestId && <p className="mt-1 max-w-40 truncate text-xs text-taupe" dir="ltr">Request: {row.requestId}</p>}</TD>
          <TD><time dateTime={row.createdAt}>{formatter.format(new Date(row.createdAt))}</time></TD>
        </TR>)}</TBody>
      </Table>}
      <nav className="flex justify-between gap-3" aria-label="صفحات سجل الدخول"><Link aria-disabled={history.page <= 1} href={pageHref(search, Math.max(1, history.page - 1))} className={`rounded-full border border-line px-5 py-2 text-sm font-bold ${history.page <= 1 ? 'pointer-events-none opacity-40' : 'text-deep-teal'}`}>الأحدث</Link><Link aria-disabled={history.page >= pages} href={pageHref(search, Math.min(pages, history.page + 1))} className={`rounded-full border border-line px-5 py-2 text-sm font-bold ${history.page >= pages ? 'pointer-events-none opacity-40' : 'text-deep-teal'}`}>الأقدم</Link></nav>
    </>}
  </div>
}
