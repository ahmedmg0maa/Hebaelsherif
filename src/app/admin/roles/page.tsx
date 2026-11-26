import type { Metadata } from 'next'
import { getServiceClient } from '@/lib/supabase/server'
import { Card, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table'
import { EmptyState } from '@/components/ui/EmptyState'
import { AdminInviteForm, RoleForm, RevokeRoleButton } from '@/components/admin/AdminControls'
import { RolePermissionEditor } from '@/components/admin/RolePermissionEditor'
import { PERMISSIONS, requirePermission } from '@/lib/auth/permissions'

export const metadata: Metadata = { title: 'الأدوار — الإدارة' }
export const dynamic = 'force-dynamic'

type Row = { id: string; user_id: string; role: string; created_at: string }
type PermissionRow = { role: string; permission: string }
type GovernancePayload = {
  assignments: Array<Row & { email: string | null }>
  permissions: PermissionRow[]
  counts: { assignments: number; permissions: number; owners: number }
}

function isGovernancePayload(value: unknown): value is GovernancePayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const payload = value as Partial<GovernancePayload>
  return Array.isArray(payload.assignments) && Array.isArray(payload.permissions)
    && typeof payload.counts?.assignments === 'number' && typeof payload.counts?.permissions === 'number'
    && typeof payload.counts?.owners === 'number'
}

const roleLabels: Record<string, { label: string; tone: 'burgundy' | 'teal' | 'cobalt' | 'gold' }> = {
  owner: { label: 'مالكة', tone: 'burgundy' },
  admin: { label: 'مديرة', tone: 'teal' },
  operations: { label: 'العمليات', tone: 'cobalt' },
  finance: { label: 'المالية', tone: 'gold' },
  content: { label: 'إدارة المحتوى', tone: 'teal' },
  marketing: { label: 'التسويق', tone: 'burgundy' },
  support: { label: 'دعم', tone: 'cobalt' },
  editor: { label: 'محررة', tone: 'gold' },
  analyst: { label: 'محللة', tone: 'cobalt' },
  auditor: { label: 'مدققة', tone: 'gold' },
}

const dateFmt = new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })

export default async function AdminRolesPage() {
  const admin = await requirePermission('roles.manage', { redirectOnFailure: true })
  if (!admin?.userId || admin.role !== 'owner') throw new Error('ADMIN_ROLE_GOVERNANCE_ACCESS_UNAVAILABLE')
  const { data, error } = await getServiceClient().rpc('get_admin_role_governance', { p_actor_id: admin.userId })
  if (error || !isGovernancePayload(data)) throw new Error('ADMIN_ROLE_GOVERNANCE_READ_UNAVAILABLE')
  const roles = data.assignments
  const permissions = data.permissions

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-deep-teal">الأدوار والصلاحيات</h1>
        <p className="mt-1 text-text-soft">منح الأدوار وسحبها متاح للمالكة فقط — كل تغيير يُسجل في سجل التدقيق.</p>
        <p className="mt-1 text-xs text-text-soft">{Number(data.counts.assignments).toLocaleString('ar-EG')} تعيين · {Number(data.counts.owners).toLocaleString('ar-EG')} مالكة · القراءة محدودة إلى ٥٠٠ تعيين و١٠٠٠ صلاحية.</p>
      </header>

      <Card className="p-8">
        <CardTitle className="mb-6">منح دور</CardTitle>
        <RoleForm />
      </Card>

      <Card className="p-8">
        <CardTitle className="mb-3">دعوة حساب إداري جديد</CardTitle>
        <p className="mb-5 text-sm leading-relaxed text-text-soft">تُرسل الدعوة أولًا ثم يُمنح الدور عبر الحوكمة. إذا تعذر منح الدور يحاول النظام حذف الحساب المدعو فورًا، ويعرض تنبيه تنظيف يدوي صريح إذا تعذر ذلك.</p>
        <AdminInviteForm />
      </Card>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-deep-teal">مصفوفة الصلاحيات الفعلية</h2>
          <p className="text-sm text-text-soft">المالكة تملك جميع الصلاحيات، وباقي الأدوار مقيدة بالمفاتيح المسجلة في قاعدة البيانات.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {Object.entries(roleLabels).map(([role, meta]) => {
            const keys = role === 'owner' ? ['* — جميع الصلاحيات'] : permissions.filter((item) => item.role === role).map((item) => item.permission)
            return <Card key={role} className="p-5"><div className="flex items-center justify-between"><Badge tone={meta.tone}>{meta.label}</Badge><span className="text-xs text-text-soft">{keys.length.toLocaleString('ar-EG')} صلاحية</span></div><ul className="mt-4 grid gap-1 text-xs text-text-soft" dir="ltr">{keys.map((key) => <li key={key} className="rounded-lg bg-ivory/55 px-3 py-1.5">{key}</li>)}</ul>{role!=='owner'&&<RolePermissionEditor role={role} allPermissions={[...PERMISSIONS]} selected={keys}/>}</Card>
          })}
        </div>
      </section>

      {roles.length === 0 ? (
        <EmptyState
          title="لا أدوار ممنوحة بعد"
          description="لم تُرجع القراءة المحكومة أي تعيينات ضمن النطاق الحالي."
        />
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>العضوة</TH>
              <TH>الدور</TH>
              <TH>مُنح</TH>
              <TH>الإجراء</TH>
            </tr>
          </THead>
          <TBody>
            {roles.map((r) => {
              const meta = roleLabels[r.role] ?? { label: r.role, tone: 'teal' as const }
              return (
                <TR key={r.id}>
                  <TD>
                    <span dir="ltr">{r.email || 'حساب بلا بريد مسجل'}</span>
                  </TD>
                  <TD>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                  </TD>
                  <TD>{dateFmt.format(new Date(r.created_at))}</TD>
                  <TD>
                    <RevokeRoleButton roleId={r.id} disabled={r.user_id === admin.userId} />
                  </TD>
                </TR>
              )
            })}
          </TBody>
        </Table>
      )}
    </div>
  )
}
