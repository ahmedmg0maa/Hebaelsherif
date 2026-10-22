import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(path, 'utf8')
const migration = read('supabase/migrations/056_admin_security_center_local_only.sql')
const action = read('src/lib/actions/admin-sessions.ts')
const data = read('src/lib/data/security.ts')
const page = read('src/app/admin/security/page.tsx')
const panel = read('src/components/admin/AdminSessionsPanel.tsx')

for (const token of [
  'get_admin_security_readiness', 'manage_admin_sessions', "has_permission('system.view', p_actor_id)",
  "has_permission('admin.access', p_actor_id)", "p_scope not in ('one', 'others', 'all')",
  'active_admin_session_required', 'get diagnostics v_revoked_count = row_count',
  "insert into public.audit_logs", "insert into public.admin_security_events", "'session_revoked'",
  'revoke all on function public.get_admin_security_readiness',
  'revoke all on function public.manage_admin_sessions', 'to_regclass', 'to_regprocedure',
  "set search_path = ''", 'rls_missing_tables', 'private_delivery_buckets',
]) assert.ok(migration.includes(token), `missing security-center database contract: ${token}`)

assert.ok(action.includes(".rpc('manage_admin_sessions'"), 'session revocation must call the atomic database RPC')
assert.ok(!action.includes("from('admin_sessions').update") && !action.includes("from('audit_logs').insert"), 'session action must not split mutation and audit writes')
assert.ok(action.includes("state: 'unconfigured'") && action.includes("state: 'unavailable'"), 'session inventory must distinguish unavailable from an empty result')

for (const token of [
  "requirePermission('system.view')", "? 'migration-required' : 'unavailable'", "state: 'unconfigured'",
  "'verified-live'", "'verified-local'", "'configured'", "'unverified'", "'failed'",
  'eventsAvailable', "select('id,event,created_at')",
]) assert.ok(data.includes(token), `missing truthful security data boundary: ${token}`)
assert.ok(!data.includes('request_fingerprint') && !data.includes('token_hash'), 'security center must not read fingerprints or tokens')

assert.ok(!page.includes('const controls =') && page.includes('لا تتحول التهيئة وحدها إلى شارة نجاح'), 'security page must not render hard-coded successful controls')
assert.ok(page.includes('مثبت حيًا') && page.includes('مثبت محليًا') && page.includes('غير متحقق') && page.includes('فشل الفحص'), 'security evidence labels must remain explicit')
assert.ok(page.includes('لا تعرض هذه الصفحة عناوين IP') && !page.includes('request_fingerprint'), 'security UI must state and preserve its privacy boundary')
assert.ok(panel.includes('لم تُفسّر النتيجة على أنها قائمة فارغة'), 'session query failure must not masquerade as zero active sessions')

console.log('verify:admin-security-center-local passed — live/local evidence is separated and session revocation is permission-checked, atomic and privacy-minimized')
