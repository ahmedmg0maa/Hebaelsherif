import { redirect } from 'next/navigation'
import { getServerClient } from '@/lib/supabase/server'
import { PERMISSIONS, type Permission, requirePermission } from '@/lib/auth/permissions'
import type { AdminSession } from '@/lib/auth/admin-session'

export type AdminContext = { userId: string | null; role: string | null; roles: string[]; permissions: Permission[]; session: AdminSession | null }

// Server-side admin gate for the /admin tree (middleware guards too — defense in depth).
export async function requireAdmin(): Promise<AdminContext> {
  const context = await requirePermission('admin.access', { redirectOnFailure: true })
  if (!context) redirect('/auth/admin?error=role')
  const { data, error } = await (await getServerClient()).rpc('get_effective_admin_permissions')
  if (error || !Array.isArray(data)) throw new Error('ADMIN_PERMISSIONS_UNAVAILABLE')
  const permissions = PERMISSIONS.filter(permission => data.includes(permission))
  return { permissions, userId: context.userId, role: context.role, roles: context.roles, session: context.session }
}
