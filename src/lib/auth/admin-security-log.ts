import 'server-only'

import { createHash } from 'node:crypto'
import { headers } from 'next/headers'
import { getServiceClient, hasSupabaseServerSecret } from '@/lib/supabase/server'

export type AdminSecurityEvent = 'login_succeeded' | 'login_failed' | 'mfa_enrolled' | 'mfa_verified' | 'session_created' | 'session_revoked' | 'session_expired' | 'logout' | 'reauth_required'

export function requestFingerprint(headersList: Headers) {
  const forwarded = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? ''
  const agent = headersList.get('user-agent') ?? ''
  return createHash('sha256').update(`${forwarded}|${agent}`).digest('hex')
}

function adminDeviceLabel(agent: string) {
  const value = agent.toLowerCase()
  const browser = value.includes('edg/') ? 'Edge' : value.includes('firefox/') ? 'Firefox' : value.includes('chrome/') ? 'Chrome' : value.includes('safari/') ? 'Safari' : 'متصفح ويب'
  const platform = value.includes('android') ? 'Android' : value.includes('iphone') || value.includes('ipad') ? 'iOS' : value.includes('windows') ? 'Windows' : value.includes('mac os') ? 'macOS' : value.includes('linux') ? 'Linux' : ''
  return platform ? `${browser} · ${platform}` : browser
}

function adminSubjectHash(email: string) {
  return createHash('sha256').update(`admin-subject|${email.trim().toLowerCase()}`).digest('hex')
}

export async function logAdminSecurity(
  event: AdminSecurityEvent,
  actorId?: string,
  options: { email?: string; outcome?: 'success' | 'failure' | 'blocked'; sessionId?: string; aal?: 'aal1' | 'aal2'; reason?: string } = {},
) {
  if (!hasSupabaseServerSecret()) return
  const requestHeaders = await headers()
  const fingerprint = requestFingerprint(requestHeaders)
  const requestId = (requestHeaders.get('cf-ray') ?? requestHeaders.get('x-request-id') ?? '').trim().slice(0, 128) || null
  const payload = {
    actor_id: actorId ?? null,
    event,
    request_fingerprint: fingerprint,
    subject_hash: options.email ? adminSubjectHash(options.email) : null,
    outcome: options.outcome ?? (event === 'login_failed' ? 'failure' : 'success'),
    session_id: options.sessionId ?? null,
    device_label: adminDeviceLabel(requestHeaders.get('user-agent') ?? ''),
    aal: options.aal ?? null,
    request_id: requestId,
    meta: options.reason ? { reason: options.reason.slice(0, 80) } : {},
  }
  const service = getServiceClient()
  const { error } = await service.from('admin_security_events').insert(payload)
  if (error && ['login_succeeded','login_failed','mfa_enrolled','mfa_verified','session_revoked','reauth_required'].includes(event)) {
    // Keep the legacy event set operational until migration 080 is applied.
    await service.from('admin_security_events').insert({ actor_id: actorId ?? null, event, request_fingerprint: fingerprint })
  }
}
