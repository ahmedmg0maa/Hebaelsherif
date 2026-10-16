import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(path, 'utf8')
const migration = read('supabase/migrations/068_customer_password_operation_evidence_local_only.sql')
const actions = read('src/lib/actions/account.ts')
const dashboardForm = read('src/components/dashboard/ProfileForm.tsx')
const recoveryForm = read('src/components/auth/UpdatePasswordForm.tsx')
const callback = read('src/app/auth/callback/route.ts')
const reset = read('src/app/(public)/auth/reset-password/page.tsx')
const register = read('src/app/(public)/auth/register/page.tsx')
const policy = read('src/lib/auth/password-policy.ts')

for (const token of [
  'public.customer_security_operations',
  "kind in ('password_change_current', 'password_change_recovery')",
  "status in ('pending', 'succeeded', 'failed')",
  'revoke all on table public.customer_security_operations from public, anon, authenticated',
  'public.begin_customer_password_operation',
  'public.finalize_customer_password_operation',
  "'customer-password:' || p_actor_id::text",
  "created_at >= now() - interval '1 hour'",
  'v_recent_count >= 5',
  "'customer.password_change_started'",
  "'customer.password_changed'",
  "'customer.password_change_failed'",
  "set search_path = ''",
  'to service_role',
]) assert.ok(migration.includes(token), `missing customer password evidence contract: ${token}`)
for (const forbidden of ['password text', 'current_password text', 'email text', 'token text', 'request_fingerprint'])
  assert.ok(!migration.includes(forbidden), `credential or request detail must not enter security evidence: ${forbidden}`)
assert.ok(
  migration.indexOf('insert into public.customer_security_operations') < migration.indexOf("'customer.password_change_started'"),
  'pending operation and start audit must be ordered in one transaction',
)
assert.ok(
  migration.indexOf('update public.customer_security_operations') < migration.indexOf("'customer.password_changed'"),
  'terminal operation and outcome audit must be ordered in one transaction',
)

for (const token of [
  "current_password: currentPassword",
  "entry.method === 'recovery'",
  "rpc('begin_customer_password_operation'",
  "rpc('finalize_customer_password_operation'",
  "signOut({ scope: 'global' })",
  "'password_change_current'",
  "'password_change_recovery'",
]) assert.ok(actions.includes(token), `missing password action boundary: ${token}`)
assert.ok(!actions.includes('console.') && !actions.includes('currentPassword,'), 'password actions must not log or serialize current credentials')

assert.ok(policy.includes('PASSWORD_MIN_LENGTH = 12') && policy.includes('PASSWORD_MAX_LENGTH = 128'), 'password policy must be shared and bounded')
assert.ok(dashboardForm.includes('name="current_password"') && dashboardForm.includes('name="password_confirmation"'), 'dashboard password change must collect current password and confirmation')
assert.ok(recoveryForm.includes('completeRecoveredPassword') && recoveryForm.includes("router.replace('/auth/login?password=changed')"), 'recovery UI must use the governed completion and require a fresh login')

assert.ok(callback.includes('exchangeCodeForSession(code)'), 'SSR PKCE callback must exchange the one-time Auth code')
assert.ok(callback.includes("new Set(['/dashboard', '/auth/update-password', '/auth/login'])"), 'callback destination must use a fixed internal allowlist')
assert.ok(callback.includes("'Cache-Control', 'private, no-store'") && callback.includes("'Referrer-Policy', 'no-referrer'"), 'Auth callback responses must be private and non-referring')
assert.ok(reset.includes('/auth/callback?next=/auth/update-password'), 'password recovery email must lead to the real update flow')
assert.ok(register.includes('/auth/callback?next=/dashboard'), 'signup confirmation must complete through the SSR PKCE callback')

console.log('verify:customer-password-lifecycle-local passed — current-password proof, recovery-only AMR, SSR PKCE callback, rate-limited two-phase evidence and session closure verified')
