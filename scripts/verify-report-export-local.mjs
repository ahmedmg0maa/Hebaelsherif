import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const route = readFileSync('src/app/admin/reports/export/route.ts', 'utf8')
const page = readFileSync('src/app/admin/reports/page.tsx', 'utf8')

assert.match(route, /export async function POST\(/, 'report export must be POST-only')
assert.doesNotMatch(route, /export async function GET\(/, 'report export must not expose GET')
assert.match(route, /requireFreshAdminAssurance\('reports\.export'\)/, 'fresh MFA export gate missing')
assert.match(route, /requirePermission\('users\.view'\)/, 'customer export must require users.view')
assert.match(route, /const MAX_ROWS = 5_000/, 'export row cap must remain 5,000')
assert.match(route, /const MAX_DAYS = 366/, 'export date cap must remain 366 Cairo days')
assert.match(route, /Africa\/Cairo/, 'export must use Cairo calendar boundaries')
assert.match(route, /\^\[\\t\\r \]\*\[=\+\\-@\]/, 'spreadsheet formula neutralization missing')
assert.match(route, /action: 'report\.exported'/, 'successful export audit missing')
assert.ok(route.indexOf("action: 'report.exported'") < route.indexOf('return new Response(toCsv'), 'audit must succeed before delivery')
for (const forbidden of ['customer_notes', 'meeting_url', 'storage_path', 'reject_reason']) {
  assert.doesNotMatch(route, new RegExp(forbidden), `sensitive field ${forbidden} must not be exported`)
}
assert.match(route, /private, no-store/, 'CSV response must be private and no-store')
assert.match(page, /ReportExportPanel/, 'reports UI must expose the governed export control')

console.log('verify:report-export-local passed — POST/fresh-MFA/least-privilege/bounds/formula-neutralization/audit/no-store contracts verified')
