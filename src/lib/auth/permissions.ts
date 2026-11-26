import { redirect } from 'next/navigation'
import { getServerClient } from '@/lib/supabase/server'
import { hasSupabasePublicConfig } from '@/lib/supabase/public-key'
import { getActiveAdminSession, type AdminSession } from '@/lib/auth/admin-session'

export const PERMISSIONS = [
  'admin.access', 'roles.manage', 'users.view', 'users.manage',
  'payments.view', 'payments.approve', 'payments.reject',
  'orders.view', 'orders.update', 'orders.refund',
  'bookings.view', 'bookings.manage', 'availability.manage', 'packages.manage',
  'catalog.view', 'catalog.manage', 'catalog.publish', 'catalog.delete',
  'content.view', 'content.manage', 'content.publish', 'content.delete', 'learning.manage',
  'media.view', 'media.manage', 'media.delete',
  'settings.view', 'settings.manage', 'feature_flags.manage',
  'inbox.view', 'inbox.manage', 'newsletter.manage', 'reviews.manage', 'press.manage', 'resources.manage', 'assessments.manage',
  'reports.view', 'reports.export', 'reports.snapshot',
  'marketing.manage', 'audit.view', 'system.view', 'notifications.send', 'admin.search',
] as const

export type Permission = (typeof PERMISSIONS)[number]
export type AdminRole = 'owner' | 'admin' | 'operations' | 'finance' | 'content' | 'marketing' | 'support' | 'editor' | 'analyst' | 'auditor'

const ROLE_PERMISSIONS: Record<Exclude<AdminRole, 'owner'>, readonly Permission[]> = {
  admin: PERMISSIONS.filter((permission) => permission !== 'roles.manage'),
  operations: ['admin.access', 'users.view', 'orders.view', 'bookings.view', 'bookings.manage', 'availability.manage', 'packages.manage', 'inbox.view', 'inbox.manage', 'notifications.send', 'reports.view', 'admin.search'],
  finance: ['admin.access', 'users.view', 'payments.view', 'payments.approve', 'payments.reject', 'orders.view', 'orders.update', 'orders.refund', 'bookings.view', 'packages.manage', 'reports.view', 'reports.export', 'reports.snapshot', 'marketing.manage', 'audit.view', 'admin.search'],
  content: ['admin.access', 'catalog.view', 'catalog.manage', 'catalog.publish', 'catalog.delete', 'content.view', 'content.manage', 'content.publish', 'content.delete', 'learning.manage', 'media.view', 'media.manage', 'media.delete', 'reviews.manage', 'press.manage', 'resources.manage', 'assessments.manage', 'reports.view', 'admin.search'],
  marketing: ['admin.access', 'users.view', 'catalog.view', 'content.view', 'content.manage', 'content.publish', 'media.view', 'media.manage', 'inbox.view', 'newsletter.manage', 'reviews.manage', 'press.manage', 'resources.manage', 'assessments.manage', 'reports.view', 'reports.export', 'marketing.manage', 'admin.search'],
  support: ['admin.access', 'users.view', 'payments.view', 'orders.view', 'bookings.view', 'inbox.view', 'inbox.manage', 'reviews.manage', 'notifications.send', 'reports.view', 'admin.search'],
  editor: ['admin.access', 'catalog.view', 'content.view', 'content.manage', 'learning.manage', 'media.view', 'media.manage', 'admin.search'],
  analyst: ['admin.access', 'users.view', 'payments.view', 'orders.view', 'bookings.view', 'catalog.view', 'content.view', 'reports.view', 'reports.export', 'system.view', 'admin.search'],
  auditor: ['admin.access', 'users.view', 'payments.view', 'orders.view', 'bookings.view', 'reports.view', 'audit.view', 'system.view'],
}

export const ROLE_LABELS: Record<AdminRole, string> = {
  owner: 'المالكة', admin: 'مديرة النظام', operations: 'العمليات', finance: 'المالية',
  content: 'إدارة المحتوى', marketing: 'التسويق', support: 'الدعم', editor: 'محررة',
  analyst: 'محللة', auditor: 'مدققة للقراءة فقط',
}

export type PermissionContext = {
  userId: string | null
  role: AdminRole | null
  roles: AdminRole[]
  permission: Permission
  session: AdminSession | null
}

/** High-impact actions require fresh owner password assurance or fresh staff MFA. */
export const FRESH_ADMIN_ASSURANCE_MAX_AGE_MS = 10 * 60 * 1000
export const FRESH_ADMIN_ASSURANCE_ERROR = 'أعيدي تأكيد الدخول قبل هذا الإجراء الحساس من رابط تأكيد الدخول في أعلى الإدارة.'

type AmrEntry = { method?: unknown; timestamp?: unknown }

function timestampMs(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value < 100_000_000_000 ? value * 1000 : value
  if (typeof value !== 'string' || !value) return null
  const numeric = Number(value)
  if (Number.isFinite(numeric)) return numeric < 100_000_000_000 ? numeric * 1000 : numeric
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? null : parsed
}

/** Pure claim check so the freshness rule is independently source-testable. */
export function hasFreshMfaAssurance(amr: unknown, now = Date.now()) {
  if (!Array.isArray(amr)) return false
  return amr.some((entry: AmrEntry) => {
    if (entry?.method !== 'totp' && entry?.method !== 'webauthn') return false
    const verifiedAt = timestampMs(entry.timestamp)
    return verifiedAt !== null && verifiedAt <= now && now - verifiedAt <= FRESH_ADMIN_ASSURANCE_MAX_AGE_MS
  })
}

function sessionAmr(accessToken: string): unknown {
  try {
    const payload = accessToken.split('.')[1]
    if (!payload) return null
    return (JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { amr?: unknown }).amr ?? null
  } catch {
    return null
  }
}

export function roleAllows(role: AdminRole, permission: Permission) {
  return role === 'owner' || ROLE_PERMISSIONS[role]?.includes(permission) === true
}

export function permissionsForRoles(roles: readonly AdminRole[]) {
  if (roles.includes('owner')) return [...PERMISSIONS]
  return [...new Set(roles.flatMap((role) => role === 'owner' ? PERMISSIONS : ROLE_PERMISSIONS[role] ?? []))]
}

/** Central server-side authorization gate. It defaults to deny and never trusts client role claims. */
export async function requirePermission(
  permission: Permission,
  options: { redirectOnFailure?: boolean } = {},
): Promise<PermissionContext | null> {
  const redirectOnFailure = options.redirectOnFailure ?? false
  if (!hasSupabasePublicConfig()) {
    return null
  }

  const supabase = await getServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    if (redirectOnFailure) redirect('/auth/admin?redirect=/admin/overview')
    return null
  }

  const { data: assurance, error: assuranceError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  const { data: ownerAssured, error: ownerError } = await supabase.rpc('owner_password_assured', { uid: user.id })
  if ((assuranceError || assurance?.currentLevel !== 'aal2') && (ownerError || ownerAssured !== true)) {
    if (redirectOnFailure) redirect('/auth/admin?reauth=1')
    return null
  }

  const session = await getActiveAdminSession(user.id)
  if (!session) {
    if (redirectOnFailure) redirect('/auth/admin?reauth=1')
    return null
  }

  const { data: rows } = await supabase.from('admin_roles').select('role').eq('user_id', user.id)
  const roles = (rows ?? []).map((row) => row.role).filter((role): role is AdminRole => role in ROLE_LABELS)
  if (roles.length === 0) {
    if (redirectOnFailure) redirect('/auth/admin?error=role')
    return null
  }

  // Database permission mappings are authoritative; an RPC error must fail closed.
  const { data: databaseAllowed, error } = await supabase.rpc('has_permission', {
    permission_name: permission,
    uid: user.id,
  })
  const allowed = !error && databaseAllowed === true
  if (!allowed) {
    if (redirectOnFailure) redirect('/admin/overview?error=permission')
    return null
  }

  const role = roles.includes('owner') ? 'owner' : roles[0]
  return { userId: user.id, role, roles, permission, session }
}

/**
 * Step-up gate for monetary, privilege, and payment-configuration mutations.
 * `requirePermission` verifies the user, active session and approved assurance server-side;
 * only then is the AMR timestamp from that same validated session inspected.
 */
export async function requireFreshAdminAssurance(permission: Permission): Promise<PermissionContext | null> {
  const context = await requirePermission(permission)
  if (!context) return null
  const supabase = await getServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  const verifiedAt = context.session?.passwordVerifiedAt ? Date.parse(context.session.passwordVerifiedAt) : 0
  const { data: passwordAssured } = await supabase.rpc('owner_password_assured', { uid: context.userId })
  const passwordFresh = passwordAssured === true && context.role === 'owner' && verifiedAt > 0 && verifiedAt <= Date.now() && Date.now() - verifiedAt <= FRESH_ADMIN_ASSURANCE_MAX_AGE_MS
  if (!passwordFresh && (!session?.access_token || !hasFreshMfaAssurance(sessionAmr(session.access_token)))) return null
  return context
}
