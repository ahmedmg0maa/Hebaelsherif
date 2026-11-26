import { requirePermission, type Permission } from '@/lib/auth/permissions'

export async function PermissionBoundary({ permission, children }: { permission: Permission; children: React.ReactNode }) {
  await requirePermission(permission, { redirectOnFailure: true })
  return children
}
