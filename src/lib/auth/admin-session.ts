import { createHash, randomBytes } from 'node:crypto'
import { cookies, headers } from 'next/headers'
import { getServerClient, getServiceClient, hasSupabaseServerSecret } from '@/lib/supabase/server'
import { isPasswordOwner, validatedSessionClaims } from '@/lib/auth/owner-password'
import { logAdminSecurity } from '@/lib/auth/admin-security-log'

export const ADMIN_SESSION_COOKIE = 'heba_admin_session_v2'
const IDLE_MS = 30 * 60 * 1000
const ABSOLUTE_MS = 8 * 60 * 60 * 1000

export type AdminSession = {
  id: string
  userId: string
  deviceLabel: string
  createdAt: string
  lastSeenAt: string
  idleExpiresAt: string
  absoluteExpiresAt: string
  revokedAt: string | null
  current: boolean
  passwordVerifiedAt: string | null
}

function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

async function requestFingerprint() {
  const requestHeaders = await headers()
  const forwarded = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() ?? ''
  const agent = requestHeaders.get('user-agent') ?? ''
  return createHash('sha256').update(`${forwarded}|${agent}`).digest('hex')
}

async function deviceLabel() {
  const agent = (await headers()).get('user-agent')?.toLowerCase() ?? ''
  const browser = agent.includes('edg/') ? 'Edge' : agent.includes('firefox/') ? 'Firefox' : agent.includes('chrome/') ? 'Chrome' : agent.includes('safari/') ? 'Safari' : 'متصفح ويب'
  const platform = agent.includes('android') ? 'Android' : agent.includes('iphone') || agent.includes('ipad') ? 'iOS' : agent.includes('windows') ? 'Windows' : agent.includes('mac os') ? 'macOS' : ''
  return platform ? `${browser} · ${platform}` : browser
}

function sessionCookie(value: string, expires: Date) {
  return { value, options: { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/', expires } }
}

export async function establishAdminSession() {
  if (!hasSupabaseServerSecret()) return { ok: false as const, error: 'تعذّر تأمين جلسة الإدارة.' }
  const client = await getServerClient()
  const [{ data: { user } }, { data: assurance }] = await Promise.all([
    client.auth.getUser(),
    client.auth.mfa.getAuthenticatorAssuranceLevel(),
  ])
  const { data: { session: authSession } } = await client.auth.getSession()
  const claims = validatedSessionClaims(authSession?.access_token)
  const passwordTime = claims.amr?.filter(a => a.method === 'password').reduce((n, a) => Math.max(n, a.timestamp ?? 0), 0) ?? 0
  const passwordOwner = Boolean(user && claims.session_id && passwordTime > 0 && passwordTime * 1000 <= Date.now() && Date.now() - passwordTime * 1000 <= 10 * 60_000 && await isPasswordOwner(user.id))
  if (!user || (assurance?.currentLevel !== 'aal2' && !passwordOwner)) return { ok: false as const, error: 'يلزم تأكيد عامل المصادقة للمتابعة.' }

  const service = getServiceClient()
  const { data: role, error: roleError } = await service.from('admin_roles').select('user_id').eq('user_id', user.id).limit(1).maybeSingle()
  if (roleError || !role) return { ok: false as const, error: 'تعذّر تأمين جلسة الإدارة.' }

  const now = Date.now()
  const absoluteExpiresAt = new Date(now + ABSOLUTE_MS)
  const token = randomBytes(32).toString('base64url')
  const { data: created, error } = await service.from('admin_sessions').insert({
    user_id: user.id,
    auth_session_id: claims.session_id ?? null,
    password_verified_at: passwordOwner ? new Date(passwordTime * 1000).toISOString() : null,
    token_hash: tokenHash(token),
    device_label: await deviceLabel(),
    request_fingerprint: await requestFingerprint(),
    idle_expires_at: new Date(now + IDLE_MS).toISOString(),
    absolute_expires_at: absoluteExpiresAt.toISOString(),
  }).select('id').single()
  if (error || !created) return { ok: false as const, error: 'تعذّر تأمين جلسة الإدارة.' }
  await logAdminSecurity('session_created', user.id, { email: user.email, outcome: 'success', sessionId: created.id, aal: assurance?.currentLevel === 'aal2' ? 'aal2' : 'aal1' })
  const store = await cookies()
  const cookie = sessionCookie(token, absoluteExpiresAt)
  store.set(ADMIN_SESSION_COOKIE, cookie.value, cookie.options)
  return { ok: true as const, idleExpiresAt: new Date(now + IDLE_MS).toISOString(), absoluteExpiresAt: absoluteExpiresAt.toISOString() }
}

export async function getActiveAdminSession(userId: string, touch = true): Promise<AdminSession | null> {
  if (!hasSupabaseServerSecret()) return null
  const store = await cookies()
  const token = store.get(ADMIN_SESSION_COOKIE)?.value
  if (!token) return null
  const service = getServiceClient()
  const { data } = await service.from('admin_sessions')
    .select('id,user_id,device_label,created_at,last_seen_at,idle_expires_at,absolute_expires_at,revoked_at,password_verified_at')
    .eq('token_hash', tokenHash(token)).eq('user_id', userId).maybeSingle()
  if (!data || data.revoked_at) return null
  const now = Date.now()
  const idleExpires = new Date(data.idle_expires_at).getTime()
  const absoluteExpires = new Date(data.absolute_expires_at).getTime()
  if (Number.isNaN(idleExpires) || Number.isNaN(absoluteExpires) || now >= idleExpires || now >= absoluteExpires) {
    await service.from('admin_sessions').update({ revoked_at: new Date().toISOString() }).eq('id', data.id).is('revoked_at', null)
    await logAdminSecurity('session_expired', userId, { outcome: 'success', sessionId: data.id, aal: data.password_verified_at ? 'aal1' : 'aal2' })
    return null
  }
  let lastSeenAt = data.last_seen_at
  let idleExpiresAt = data.idle_expires_at
  if (touch && new Date(data.last_seen_at).getTime() < now - 60_000) {
    const nextIdle = new Date(Math.min(now + IDLE_MS, absoluteExpires)).toISOString()
    await service.from('admin_sessions').update({ last_seen_at: new Date(now).toISOString(), idle_expires_at: nextIdle }).eq('id', data.id).is('revoked_at', null)
    lastSeenAt = new Date(now).toISOString()
    idleExpiresAt = nextIdle
  }
  return { id: data.id, userId: data.user_id, deviceLabel: data.device_label, createdAt: data.created_at, lastSeenAt, idleExpiresAt, absoluteExpiresAt: data.absolute_expires_at, revokedAt: data.revoked_at, current: true, passwordVerifiedAt: data.password_verified_at ?? null }
}
