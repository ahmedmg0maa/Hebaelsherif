'use server'

import { establishAdminSession } from '@/lib/auth/admin-session'
import { isPasswordOwner } from '@/lib/auth/owner-password'
import { createHash } from 'node:crypto'
import { headers } from 'next/headers'
import { getServerClient, getServiceClient, hasSupabaseServerSecret } from '@/lib/supabase/server'
import { hasSupabasePublicConfig } from '@/lib/supabase/public-key'
import { logAdminSecurity, requestFingerprint } from '@/lib/auth/admin-security-log'

type AdminLoginResult = { ok: true; needsMfa: boolean } | { ok: false; error: string }
const GENERIC_LOGIN_ERROR = 'تعذّر تسجيل الدخول. راجعي البيانات وحاولي لاحقًا.'
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function consumeAdminLoginThrottle(email: string, outcome: 'attempt' | 'failure' | 'success') {
  if (!hasSupabaseServerSecret()) return false
  const fingerprint = requestFingerprint(await headers())
  const throttleKey = createHash('sha256').update(`admin-login|${email.trim().toLowerCase()}|${fingerprint}`).digest('hex')
  const { data, error } = await getServiceClient().rpc('consume_admin_login_throttle', { p_key: throttleKey, p_outcome: outcome })
  if (error || !Array.isArray(data) || data.length !== 1) return false
  return data[0]?.allowed === true
}

export async function adminPasswordLogin(emailInput: string, password: string): Promise<AdminLoginResult> {
  const email = emailInput.trim().toLowerCase()
  if (!password || password.length > 512 || !EMAIL.test(email) || email.length > 320 || !hasSupabasePublicConfig() || !hasSupabaseServerSecret())
    return { ok: false, error: 'تعذّر تسجيل الدخول الآن.' }

  const accountKey = createHash('sha256').update(`admin-account|${email}`).digest('hex')
  const { data: accountAllowed, error: accountError } = await getServiceClient().rpc('consume_admin_account_attempt', { p_key: accountKey })
  if (accountError || accountAllowed !== true || !await consumeAdminLoginThrottle(email, 'attempt')) {
    await logAdminSecurity('login_failed', undefined, { email, outcome: 'blocked', reason: 'throttled' })
    return { ok: false, error: GENERIC_LOGIN_ERROR }
  }

  const client = await getServerClient()
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error || !data.user) {
    await consumeAdminLoginThrottle(email, 'failure')
    await logAdminSecurity('login_failed', undefined, { email, outcome: 'failure', reason: 'credentials_or_auth' })
    return { ok: false, error: GENERIC_LOGIN_ERROR }
  }

  // This identity-only check intentionally uses the server secret. The shared
  // RLS helpers require approved assurance, while this is the narrow pre-session step
  // that decides whether a successfully authenticated account may enroll/challenge MFA.
  const { data: role, error: roleError } = await getServiceClient()
    .from('admin_roles')
    .select('user_id')
    .eq('user_id', data.user.id)
    .limit(1)
    .maybeSingle()
  if (roleError || !role) {
    await client.auth.signOut()
    await consumeAdminLoginThrottle(email, 'failure')
    await logAdminSecurity('login_failed', data.user.id, { email, outcome: 'failure', reason: 'role_missing', aal: 'aal1' })
    return { ok: false, error: GENERIC_LOGIN_ERROR }
  }

  const { data: assurance } = await client.auth.mfa.getAuthenticatorAssuranceLevel()
  await consumeAdminLoginThrottle(email, 'success')
  await logAdminSecurity('login_succeeded', data.user.id, { email, outcome: 'success', aal: assurance?.currentLevel === 'aal2' ? 'aal2' : 'aal1' })
  const passwordOwner = await isPasswordOwner(data.user.id)
  if (passwordOwner || assurance?.currentLevel === 'aal2') {
    const established = await establishAdminSession()
    if (!established.ok) { await client.auth.signOut(); return established }
    return { ok: true, needsMfa: false }
  }
  return { ok: true, needsMfa: true }
}

export async function recordAdminMfaEvent(event: 'mfa_enrolled' | 'mfa_verified') {
  const client = await getServerClient()
  const { data: { user } } = await client.auth.getUser()
  if (user) await logAdminSecurity(event, user.id, { email: user.email, outcome: 'success', aal: 'aal2' })
}

export async function ownerPasswordLogin(password: string): Promise<AdminLoginResult> {
  const email = process.env.OWNER_ADMIN_EMAIL?.trim().toLowerCase()
  if (!email || password.length > 512) return { ok: false, error: 'دخول المالكة غير مهيأ بعد. يلزم إكمال إعداد التشغيل.' }
  return adminPasswordLogin(email, password)
}
