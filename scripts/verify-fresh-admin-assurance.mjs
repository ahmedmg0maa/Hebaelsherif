import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (file) => readFileSync(file, 'utf8')
const permissions = read('src/lib/auth/permissions.ts')
const paymentActions = read('src/lib/actions/admin.ts')
const cmsActions = read('src/lib/actions/cms.ts')
const controlActions = read('src/lib/actions/admin-control.ts')
const mfaPage = read('src/app/(public)/auth/admin/mfa/page.tsx')
const reportExport = read('src/app/admin/reports/export/route.ts')
const revisionActions = read('src/lib/actions/revisions.ts')

assert.match(permissions, /FRESH_ADMIN_ASSURANCE_MAX_AGE_MS\s*=\s*10\s*\*\s*60\s*\*\s*1000/, 'freshness window must be ten minutes')
assert.match(permissions, /function hasFreshMfaAssurance\(amr: unknown/, 'AMR freshness checker missing')
assert.match(permissions, /entry\?\.method !== 'totp' && entry\?\.method !== 'webauthn'/, 'freshness must accept only MFA AMR methods')
assert.match(permissions, /requirePermission\(permission\)[\s\S]*hasFreshMfaAssurance\(sessionAmr\(session\.access_token\)\)/, 'fresh gate must follow authenticated permission verification')

for (const [source, action] of [
  [paymentActions, 'approvePayment'],
  [paymentActions, 'rejectPayment'],
  [paymentActions, 'manageOrderRefund'],
  [cmsActions, 'grantRole'],
  [cmsActions, 'revokeRole'],
  [cmsActions, 'setRolePermissions'],
  [controlActions, 'saveOperationalSettings'],
  [revisionActions, 'restoreContentRevision'],
]) {
  const start = source.indexOf(`export async function ${action}`)
  assert.notEqual(start, -1, `${action} missing`)
  const next = source.indexOf('\nexport async function ', start + 1)
  const body = source.slice(start, next === -1 ? source.length : next)
  assert.match(body, /requireFreshAdminAssurance\(/, `${action} must require fresh approved assurance`)
}

const refundStart = paymentActions.indexOf('export async function manageOrderRefund')
const refundBody = paymentActions.slice(refundStart)
assert.match(refundBody, /requireFreshAdminAssurance\('orders\.refund'\)/, 'refund lifecycle must require fresh assurance')

assert.match(mfaPage, /const requiresFreshCode = params\.get\('reauth'\) === '1'/, 'MFA route must recognize reauth mode')
assert.match(mfaPage, /aal2' && !requiresFreshCode/, 'existing AAL2 must not skip a requested fresh challenge')
assert.match(mfaPage, /if \(requiresFreshCode\)[\s\S]*establishAdminSession\(\)/, 'fresh TOTP success must establish the admin session before redirect')
assert.match(reportExport, /requireFreshAdminAssurance\('reports\.export'\)/, 'report export must require fresh assurance')

assert.match(permissions, /passwordAssured === true && context.role === 'owner'/, 'password exception must be enrolled-owner-only')
assert.match(permissions, /Date.now\(\) - verifiedAt <= FRESH_ADMIN_ASSURANCE_MAX_AGE_MS/, 'owner password confirmation must be fresh')
console.log('verify:fresh-admin-assurance passed — sensitive actions require fresh staff MFA or fresh enrolled-owner password assurance; permission and active session remain mandatory')
