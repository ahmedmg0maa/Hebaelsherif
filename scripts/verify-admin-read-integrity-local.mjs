import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(path, 'utf8')
const cms = read('src/lib/data/cms.ts')
const system = read('src/app/admin/system/page.tsx')
const integrations = read('src/lib/data/integrations.ts')
const errorBoundary = read('src/app/error.tsx')
const envExample = read('.env.example')

for (const token of [
  'export type AdminListResult', 'adminListResult<T>', "state: 'unavailable'", 'ADMIN_DATA_READ_UNAVAILABLE',
  'const { data, error } = await query', 'if (error) return',
]) assert.ok(cms.includes(token), `missing Admin read-state contract: ${token}`)
const adminListBody = cms.slice(cms.indexOf('export async function adminList<T>'), cms.indexOf('export async function getPublicMediaOptions'))
assert.ok(adminListBody.includes("throw new Error('ADMIN_DATA_READ_UNAVAILABLE')") && !adminListBody.includes('catch {'), 'configured Admin read failures must cross a sanitized error boundary')

assert.ok(cms.includes('const disabledFlags') && !cms.includes('const defaultFlags'), 'feature flags must fail closed rather than enable defaults')
assert.ok(cms.includes('getFeatureFlagSnapshot') && cms.includes("state: 'unconfigured', flags: disabledFlags") && cms.includes("state: 'unavailable', flags: disabledFlags"), 'feature flag state and fail-closed values are required')

for (const token of [
  'adminListResult<EventRow>', 'getFeatureFlagSnapshot()', 'getIntegrationReadiness()',
  "eventResult.state !== 'ready'", 'لم تُفسّر النتيجة على أنها غياب للأخطاء',
  'كل الميزات الاختيارية معطلة fail-closed', 'وجود أسماء الإعدادات',
]) assert.ok(system.includes(token), `System Center truthful state missing: ${token}`)
assert.ok(!system.includes('الهدوء خبر جيد'), 'unavailable system events must not be described as healthy silence')

for (const token of [
  "import 'server-only'", 'RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'SENTRY_DSN',
  'PROTECTED_UPLOAD_SCAN_URL', 'STAGING_ACCESS_USER', 'requiredForLaunch',
]) assert.ok(integrations.includes(token), `missing safe integration readiness check: ${token}`)
assert.ok(!integrations.includes('console.') && !integrations.includes('return process.env['), 'integration readiness must not print or return environment values')

for (const name of ['RESEND_API_KEY=', 'RESEND_FROM_EMAIL=', 'SENTRY_DSN=', 'NEXT_PUBLIC_SENTRY_DSN=', 'SENTRY_AUTH_TOKEN=']) {
  assert.ok(envExample.includes(name), `missing safe environment name: ${name}`)
  assert.match(envExample, new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm'), `${name} must not contain a real value`)
}
assert.ok(errorBoundary.includes("digest: error.digest ?? 'unavailable'") && !errorBoundary.includes('console.error(error)'), 'client error logging must exclude raw messages and stacks')

console.log('verify:admin-read-integrity-local passed — Admin reads, feature flags, integrations and error logging fail closed without exposing configuration values')
