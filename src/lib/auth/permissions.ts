import type { AdminRole, UserRole } from '@/types'

export const ADMIN_ROLES: AdminRole[] = ['owner', 'super_admin', 'admin', 'support', 'content_manager', 'finance', 'viewer']
export const WRITE_ROLES: AdminRole[] = ['owner', 'super_admin', 'admin', 'support', 'content_manager', 'finance']
export const FINANCE_ROLES: AdminRole[] = ['owner', 'super_admin', 'admin', 'finance']
export const CONTENT_ROLES: AdminRole[] = ['owner', 'super_admin', 'admin', 'content_manager']

export function isAdminRole(role: string | null | undefined): role is AdminRole {
  return Boolean(role && ADMIN_ROLES.includes(role as AdminRole))
}

export function canWriteAdmin(role: UserRole | string | null | undefined) {
  return Boolean(role && WRITE_ROLES.includes(role as AdminRole))
}
