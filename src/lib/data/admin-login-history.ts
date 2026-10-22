import 'server-only'

import { requirePermission } from '@/lib/auth/permissions'
import { hasSupabasePublicConfig } from '@/lib/supabase/public-key'
import { getServiceClient, hasSupabaseServerSecret } from '@/lib/supabase/server'
import { parseCairoLocalDateTime } from '@/lib/booking/cairo-time'

export const ADMIN_LOGIN_EVENTS = ['login_succeeded','login_failed','mfa_enrolled','mfa_verified','session_created','session_revoked','session_expired','logout','reauth_required'] as const
export const ADMIN_LOGIN_OUTCOMES = ['success','failure','blocked'] as const
export type AdminLoginEvent = (typeof ADMIN_LOGIN_EVENTS)[number]
export type AdminLoginOutcome = (typeof ADMIN_LOGIN_OUTCOMES)[number]

export type AdminLoginHistoryRow = {
  id: string
  actorId: string | null
  actorName: string
  actorEmail: string | null
  actorRoles: string[]
  event: AdminLoginEvent
  outcome: AdminLoginOutcome
  deviceLabel: string | null
  aal: string | null
  requestId: string | null
  sessionReference: string | null
  fingerprintReference: string | null
  reason: string | null
  createdAt: string
}

export type AdminLoginHistory = {
  state: 'ready' | 'unconfigured' | 'migration-required' | 'error'
  rows: AdminLoginHistoryRow[]
  total: number
  page: number
  pageSize: number
}

export type AdminLoginHistoryFilters = {
  event?: string
  outcome?: string
  from?: string
  to?: string
  page?: number
  limit?: number
}

function boundedPage(value: number | undefined) {
  return Number.isInteger(value) && Number(value) > 0 ? Math.min(Number(value), 10_000) : 1
}

function safeReason(meta: unknown) {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null
  const reason = (meta as { reason?: unknown }).reason
  return typeof reason === 'string' ? reason.slice(0, 80) : null
}

export async function getAdminLoginHistory(filters: AdminLoginHistoryFilters = {}): Promise<AdminLoginHistory> {
  const page = boundedPage(filters.page)
  const pageSize = Number.isInteger(filters.limit) ? Math.min(Math.max(Number(filters.limit), 1), 5_000) : 50
  const empty = (state: AdminLoginHistory['state']): AdminLoginHistory => ({ state, rows: [], total: 0, page, pageSize })
  if (!hasSupabasePublicConfig() || !hasSupabaseServerSecret()) return empty('unconfigured')
  const admin = await requirePermission('audit.view')
  if (!admin?.userId) return empty('error')

  const service = getServiceClient()
  let query = service.from('admin_security_events')
    .select('id,actor_id,event,outcome,device_label,aal,request_id,session_id,request_fingerprint,meta,created_at', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (ADMIN_LOGIN_EVENTS.includes(filters.event as AdminLoginEvent)) query = query.eq('event', filters.event!)
  if (ADMIN_LOGIN_OUTCOMES.includes(filters.outcome as AdminLoginOutcome)) query = query.eq('outcome', filters.outcome!)
  if (/^\d{4}-\d{2}-\d{2}$/.test(filters.from ?? '')) {
    const start = parseCairoLocalDateTime(`${filters.from}T00:00`)
    if (start) query = query.gte('created_at', start.toISOString())
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(filters.to ?? '')) {
    const endBase = new Date(`${filters.to}T12:00:00Z`)
    endBase.setUTCDate(endBase.getUTCDate() + 1)
    const endKey = endBase.toISOString().slice(0, 10)
    const end = parseCairoLocalDateTime(`${endKey}T00:00`)
    if (end) query = query.lt('created_at', end.toISOString())
  }

  const from = (page - 1) * pageSize
  const { data, error, count } = await query.range(from, from + pageSize - 1)
  if (error) {
    const missing = error.code === '42703' || error.code === 'PGRST204' || error.message.includes('outcome')
    return empty(missing ? 'migration-required' : 'error')
  }

  const actorIds = [...new Set((data ?? []).map((row) => row.actor_id).filter((id): id is string => Boolean(id)))]
  const [profilesResult, rolesResult] = actorIds.length ? await Promise.all([
    service.from('profiles').select('id,full_name,email').in('id', actorIds),
    service.from('admin_roles').select('user_id,role').in('user_id', actorIds),
  ]) : [{ data: [], error: null }, { data: [], error: null }]
  if (profilesResult.error || rolesResult.error) return empty('error')
  const profiles = new Map((profilesResult.data ?? []).map((row) => [row.id, row]))
  const roles = new Map<string, string[]>()
  for (const row of rolesResult.data ?? []) roles.set(row.user_id, [...(roles.get(row.user_id) ?? []), row.role])

  return {
    state: 'ready', total: count ?? 0, page, pageSize,
    rows: (data ?? []).map((row) => {
      const profile = row.actor_id ? profiles.get(row.actor_id) : null
      return {
        id: row.id,
        actorId: row.actor_id,
        actorName: profile?.full_name || (row.actor_id ? 'حساب إداري' : 'محاولة غير معرّفة'),
        actorEmail: profile?.email ?? null,
        actorRoles: row.actor_id ? roles.get(row.actor_id) ?? [] : [],
        event: row.event as AdminLoginEvent,
        outcome: row.outcome as AdminLoginOutcome,
        deviceLabel: row.device_label,
        aal: row.aal,
        requestId: row.request_id,
        sessionReference: row.session_id ? String(row.session_id).slice(0, 8) : null,
        fingerprintReference: row.request_fingerprint ? String(row.request_fingerprint).slice(0, 12) : null,
        reason: safeReason(row.meta),
        createdAt: row.created_at,
      }
    }),
  }
}
