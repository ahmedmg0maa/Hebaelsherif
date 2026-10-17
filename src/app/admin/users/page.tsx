import type { Metadata } from 'next'
import { getServiceClient } from '@/lib/supabase/server'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table'
import { EmptyState } from '@/components/ui/EmptyState'
import { NotifyUser } from '@/components/admin/NotifyUser'
import { AccountDeletionQueue, type AccountDeletionQueueRow } from '@/components/admin/AccountDeletionQueue'
import { requirePermission } from '@/lib/auth/permissions'
import {isAccountDeletionStatus,accountDeletionStatusLabel} from '@/lib/account-deletion/status'
import {adminCustomerPage} from '@/lib/data/admin-customer-pages'
import type {AdminPageQuery} from '@/lib/data/admin-pagination'
import {AdminListTools} from '@/components/admin/AdminListTools'
import Link from 'next/link'

export const metadata: Metadata = { title: 'العملاء — الإدارة' }

type Row = { id: string; full_name: string; email: string; phone: string | null; created_at: string }

const dateFmt = new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })

type Props = { searchParams: Promise<AdminPageQuery> }

export default async function AdminUsersPage({ searchParams }: Props) {
  const query = await searchParams
  const q=query.q
  const admin = await requirePermission('users.view', { redirectOnFailure: true })
  if (!admin?.userId) throw new Error('ADMIN_CUSTOMER_DIRECTORY_ACCESS_UNAVAILABLE')
  const service = getServiceClient()
  const [result,sendPermission,managePermission,deletionResult]=await Promise.all([
    adminCustomerPage<Row>(admin.userId,query),
    service.rpc('has_permission',{permission_name:'notifications.send',uid:admin.userId}),
    service.rpc('has_permission',{permission_name:'users.manage',uid:admin.userId}),
    adminCustomerPage<AccountDeletionQueueRow>(admin.userId,query,'deletions','deletion_'),
  ])
  const users=result.rows
  const canNotify = !sendPermission.error && sendPermission.data === true
  const canManage = !managePermission.error && managePermission.data === true
  const deletionRequests=deletionResult.rows
  if(deletionRequests.some(row=>!isAccountDeletionStatus(row.status)))throw Error('ADMIN_CUSTOMER_DIRECTORY_INVALID_RESPONSE')

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-deep-teal">العملاء</h1>
          <p className="mt-1 text-text-soft">
            تصفحي جميع الحسابات بالبحث والصفحات؛ عرض القائمة يُسجل في سجل العمليات دون نسخ بيانات العميلات إليه.
          </p>
        </div>

      </header>

      <AdminListTools result={result} query={query} label="العميلات" searchLabel="بحث بالاسم أو البريد" example="جزء من اسم العميلة"/>
      <section className="space-y-4" aria-labelledby="account-deletion-queue-title">
        <div>
          <h2 id="account-deletion-queue-title" className="text-2xl font-bold text-deep-teal">طلبات حذف الحساب</h2>
          <p className="mt-1 text-sm text-text-soft">تصفحي الطلبات النشطة والمغلقة بالتصفية والصفحات. «معتمد» لا يعني أن الهوية حُذفت؛ لا يُسجل الاكتمال إلا بعد غيابها فعليًا.</p>
        </div>
        <AdminListTools result={deletionResult} query={query} label="طلبات حذف الحساب" searchLabel="بحث بالاسم أو البريد أو رقم الطلب" statuses={Object.entries(accountDeletionStatusLabel).map(([value,label])=>({value,label}))}/><AccountDeletionQueue rows={deletionRequests} canManage={canManage} />
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
