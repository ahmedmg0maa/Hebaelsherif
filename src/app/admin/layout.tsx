import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/auth/admin'
import { getAdminBadges } from '@/lib/data/admin'
import { AdminShell } from '@/components/layout/AdminShell'
import { AdminTopbar } from '@/components/admin/AdminTopbar'
import { AdminSessionMonitor } from '@/components/admin/AdminSessionMonitor'

export const metadata:Metadata={robots:{index:false,follow:false}}

// Role check: requireAdmin() redirects non-admins (admin_roles lookup).
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin()
  const badges = await getAdminBadges()
  return (
    <AdminShell badges={badges} permissions={admin.permissions}>
      {admin.session && <AdminSessionMonitor idleExpiresAt={admin.session.idleExpiresAt} absoluteExpiresAt={admin.session.absoluteExpiresAt} />}
      <div className="mx-auto max-w-6xl">
        <AdminTopbar permissions={admin.permissions} />
      </div>
      {children}
    </AdminShell>
  )
}
