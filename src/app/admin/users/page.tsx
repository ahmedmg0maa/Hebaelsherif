import type { Metadata } from 'next'
import { getServiceClient } from '@/lib/supabase/server'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table'
import { EmptyState } from '@/components/ui/EmptyState'
import { NotifyUser } from '@/components/admin/NotifyUser'
import { AccountDeletionQueue, type AccountDeletionQueueRow } from '@/components/admin/AccountDeletionQueue'
import { requirePermission } from '@/lib/auth/permissions'
import { isAccountDeletionStatus } from '@/lib/account-deletion/status'
import Link from 'next/link'

export const metadata: Metadata = { title: 'العملاء — الإدارة' }

type Row = { id: string; full_name: string; email: string; phone: string | null; created_at: string }

const dateFmt = new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })

type Props = { searchParams: Promise<{ q?: string }> }

export default async function AdminUsersPage({ searchParams }: Props) {
  const { q } = await searchParams
  const admin = await requirePermission('users.view', { redirectOnFailure: true })
  if (!admin?.userId) throw new Error('ADMIN_CUSTOMER_DIRECTORY_ACCESS_UNAVAILABLE')
  const query = q?.trim() ?? ''
  if (query.length > 100 || /[\u0000-\u001f\u007f]/.test(query)) throw new Error('ADMIN_CUSTOMER_SEARCH_INVALID')
  const service = getServiceClient()
  const [{ data, error }, sendPermission, managePermission, deletionResponse] = await Promise.all([
    service.rpc('search_admin_users', { p_actor_id: admin.userId, p_query: query }),
    service.rpc('has_permission', { permission_name: 'notifications.send', uid: admin.userId }),
    service.rpc('has_permission', { permission_name: 'users.manage', uid: admin.userId }),
    service.rpc('list_admin_account_deletion_requests', { p_actor_id: admin.userId }),
  ])
  if (error || deletionResponse.error) throw new Error('ADMIN_CUSTOMER_DIRECTORY_READ_UNAVAILABLE')
  const users = (Array.isArray(data) ? data : []) as Row[]
  const canNotify = !sendPermission.error && sendPermission.data === true
  const canManage = !managePermission.error && managePermission.data === true
  const deletionRequests = (Array.isArray(deletionResponse.data) ? deletionResponse.data : [])
    .filter((row): row is AccountDeletionQueueRow => Boolean(
      row && typeof row === 'object' && typeof row.id === 'string'
      && (typeof row.customer_id === 'string' || row.customer_id === null)
      && typeof row.full_name === 'string' && typeof row.email === 'string'
      && isAccountDeletionStatus(row.status) && typeof row.requested_at === 'string',
    ))

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-deep-teal">العملاء</h1>
          <p className="mt-1 text-text-soft">
            {q ? `نتائج البحث عن «${q}»` : `أحدث ٢٠٠ حساب${canNotify ? ' — ويمكنك مراسلة أي عميلة بإشعار مباشر.' : '.'}`}
          </p>
        </div>
        <form className="flex gap-2">
          <label htmlFor="q" className="sr-only">
            بحث
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q ?? ''}
            placeholder="الاسم أو البريد…"
            maxLength={100}
            className="w-56 rounded-full border border-line bg-surface-raised px-4 py-2 text-sm shadow-card focus:border-deep-teal focus:outline-2 focus:outline-deep-teal/20"
          />
          <button type="submit" className="rounded-full bg-deep-teal px-5 py-2 text-sm font-semibold text-on-dark">
            بحث
          </button>
        </form>
      </header>

      <section className="space-y-4" aria-labelledby="account-deletion-queue-title">
        <div>
          <h2 id="account-deletion-queue-title" className="text-2xl font-bold text-deep-teal">طلبات حذف الحساب</h2>
          <p className="mt-1 text-sm text-text-soft">مراجعة تشغيلية بحد أقصى ٢٠٠ طلب نشط. «معتمد» لا يعني أن الهوية حُذفت؛ لا يُسجل الاكتمال إلا بعد غيابها فعليًا.</p>
        </div>
        <AccountDeletionQueue rows={deletionRequests} canManage={canManage} />
      </section>

      {users.length === 0 ? (
        <EmptyState
          title={q ? 'لا نتائج لهذا البحث' : 'لا حسابات بعد'}
          description={q ? 'جرّبي جزءًا من الاسم أو البريد الإلكتروني.' : 'تظهر العميلات هنا فور تسجيلهن في المنصة.'}
        />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>الاسم</TH>
              <TH>البريد</TH>
              <TH>الهاتف</TH>
              <TH>انضمت</TH>
              <TH>تواصل</TH>
            </tr>
          </THead>
          <TBody>
            {users.map((u) => (
              <TR key={u.id}>
                <TD className="font-semibold text-deep-teal"><Link href={`/admin/users/${u.id}`} className="underline-offset-4 hover:underline">{u.full_name || '—'}</Link></TD>
                <TD>
                  <span dir="ltr">{u.email}</span>
                </TD>
                <TD>{u.phone ? <span dir="ltr">{u.phone}</span> : '—'}</TD>
                <TD>{dateFmt.format(new Date(u.created_at))}</TD>
                <TD>
                  {canNotify ? <NotifyUser userId={u.id} userName={u.full_name || u.email} /> : '—'}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  )
}
