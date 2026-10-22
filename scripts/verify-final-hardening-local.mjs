import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'

const read = (path) => readFileSync(path, 'utf8')
const securityMigration = read('supabase/migrations/080_security_login_history_and_preview_tokens_local_only.sql')
const rolesMigration = read('supabase/migrations/081_admin_roles_analyst_auditor_local_only.sql')
const proxy = read('src/proxy.ts')
const layout = read('src/app/layout.tsx')
const loginAction = read('src/lib/actions/auth.ts')
const loginPage = read('src/app/(public)/auth/admin/page.tsx')
const loginForm = read('src/components/auth/AdminLoginForm.tsx')
const historyPage = read('src/app/admin/login-history/page.tsx')
const historyData = read('src/lib/data/admin-login-history.ts')
const historyExport = read('src/app/admin/login-history/export/route.ts')
const previewPage = read('src/app/preview/[type]/[id]/page.tsx')
const periods = read('src/lib/time/cairo-periods.ts')

for (const token of [
  'revoke all on function public.is_enrolled(uuid, uuid) from public, anon, authenticated',
  'uid = auth.uid()',
  'revoke all on function public.expire_stale_orders() from public, anon, authenticated',
  'revoke insert, update, delete, truncate on table public.audit_logs from anon, authenticated',
  'revoke insert, update, delete, truncate on table public.admin_security_events from anon, authenticated',
  'consume_content_preview_token',
  "auth.role() <> 'service_role'",
  "and used_at is null",
]) assert.ok(securityMigration.includes(token), `missing final security contract: ${token}`)

assert.ok(previewPage.includes("rpc('consume_content_preview_token'"), 'preview must atomically consume its one-time token')
assert.ok(!previewPage.includes("from('content_preview_tokens').update"), 'preview must not use a split token read/update sequence')

for (const role of ["'analyst'", "'auditor'"]) {
  assert.ok(rolesMigration.includes(role), `missing governed Admin role: ${role}`)
}
assert.ok(rolesMigration.includes('owner_role_management_required') && rolesMigration.includes('self_role_change_forbidden'), 'role governance must retain owner and self-change protection')

for (const token of ["'nonce-${nonce}'", "'strict-dynamic'", "script-src-attr 'none'", "requestHeaders.set('x-nonce', nonce)"]) {
  assert.ok(proxy.includes(token), `missing nonce CSP boundary: ${token}`)
}
assert.ok(!proxy.includes("script-src 'self' 'unsafe-inline'"), 'inline script execution must not be globally allowed')
assert.ok(layout.includes('nonce={nonce}'), 'the pre-hydration theme script must carry the request nonce')

assert.ok(loginPage.includes('<AdminLoginForm configured={configured} ownerConfigured={ownerConfigured}'), 'Admin route must pass availability flags to the actual form')
assert.ok(loginForm.includes('const staff = params.get(\'staff\') === \'1\'') && loginForm.includes('{staff && <FormField') && loginForm.includes('name="email"') && loginForm.includes('name="password"'), 'Staff login must collect individual identity and password in the extracted form')
assert.ok(loginForm.includes('staff ? await adminPasswordLogin') && loginForm.includes(': await ownerPasswordLogin'), 'Owner and staff must use their explicit server login paths')
assert.ok(loginAction.includes('process.env.OWNER_ADMIN_EMAIL?.trim().toLowerCase()') && loginAction.includes('await isPasswordOwner(data.user.id)'), 'Owner shorthand must bind its identity on the server and verify enrollment')
assert.ok(!loginForm.includes('OWNER_ADMIN_EMAIL'), 'Owner identity configuration must stay on the server')
assert.ok(loginAction.includes('adminPasswordLogin(emailInput: string, password: string)'), 'Admin login must not depend on one shared configured email')
assert.ok(historyData.includes("requirePermission('audit.view')") && historyPage.includes('أرشيف تسجيل الدخول'), 'login history must be permissioned and visible')
assert.ok(historyExport.includes("requireFreshAdminAssurance('audit.view')") && historyExport.includes('text/csv'), 'login-history export must require fresh MFA and emit CSV')
assert.ok(historyExport.includes('/^[=+\\-@\\t\\r]/') && historyExport.includes("`'${raw}`"), 'CSV export must neutralize spreadsheet formulas')

assert.ok(periods.includes("timeZone: 'Africa/Cairo'") && periods.includes('cairoMonthRange') && periods.includes('cairoDayRange'), 'day/month reporting boundaries must be Cairo-aware')
assert.ok(statSync('public/brand/main-logo.png').size < 100_000, '56px logo must remain optimized below 100KB')

console.log('verify:final-hardening-local passed — DB grants, atomic preview, Admin login history/RBAC, nonce CSP, Cairo periods and image budget verified')
