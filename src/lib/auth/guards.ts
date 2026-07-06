import type { UserRole } from '@/types'

const adminRoles = new Set<UserRole>(['owner', 'admin', 'super_admin', 'support', 'content_manager', 'finance', 'viewer'])

export function isAdmin(role?: string | null): boolean {
  return Boolean(role && adminRoles.has(role as UserRole))
}

export function canManage(role: string | null | undefined, section: 'roles' | 'finance' | 'content' | 'bookings' | 'settings') {
  if (role === 'owner' || role === 'super_admin') return true
  if (section === 'roles') return false
  if (role === 'admin') return true
  if (role === 'finance') return section === 'finance'
  if (role === 'content_manager') return section === 'content'
  if (role === 'support') return section === 'bookings'
  return false
}

export function requireAdminRole(role?: string | null) {
  if (!isAdmin(role)) throw new Error('غير مصرح بالدخول لهذه المنطقة.')
}
