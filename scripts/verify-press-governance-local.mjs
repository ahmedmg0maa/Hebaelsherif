import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { normalizePressInput } from '../src/lib/press/governance.ts'

const migration = readFileSync('supabase/migrations/050_press_governance_local_only.sql', 'utf8')
const actions = readFileSync('src/lib/actions/press.ts', 'utf8')
const adminPage = readFileSync('src/app/admin/press/page.tsx', 'utf8')
const adminUi = readFileSync('src/components/admin/PressManager.tsx', 'utf8')
const publicPage = readFileSync('src/app/(public)/press/page.tsx', 'utf8')
const publicData = readFileSync('src/lib/data/press.ts', 'utf8')
const permissions = readFileSync('src/lib/auth/permissions.ts', 'utf8')
const shell = readFileSync('src/lib/admin-navigation.ts', 'utf8')
assert.ok(readFileSync('src/components/layout/AdminShell.tsx','utf8').includes('adminNavigation(permissions,badges)'), 'shell must consume permission-filtered navigation')
const homeRegistry = readFileSync('src/lib/home/sections.ts', 'utf8')
const homeRenderer = readFileSync('src/components/home/HomeSectionRenderer.tsx', 'utf8')
const homeData = readFileSync('src/lib/data/home.ts', 'utf8')

for (const contract of [
  "('admin', 'press.manage')", "('content', 'press.manage')", "('marketing', 'press.manage')",
  'create table if not exists public.press_mentions', "source_classification in ('independent_editorial', 'partner', 'owned_channel', 'event')",
  "original_url ~ '^https://", "public.has_permission('press.manage', p_actor_id)", 'press_image_rights_required',
  "m.rights_status in ('owned', 'licensed', 'public_domain')", "'press.created'", "'press.updated'", "'press.deleted'",
  "cron.schedule('publish-scheduled-press'",
]) assert.ok(migration.includes(contract), `missing Press database contract: ${contract}`)
assert.match(migration, /revoke all on function public\.save_press_mention[\s\S]*from public, anon, authenticated/)
assert.match(migration, /grant execute on function public\.save_press_mention[\s\S]*to service_role/)
assert.ok(!migration.includes("'outlet',") && !migration.includes("'title',") && !migration.includes("'url',"), 'Press source/title leaked into audit metadata')

for (const contract of ["requirePermission('press.manage')", "rpc('save_press_mention'", "rpc('delete_press_mention'"]) assert.ok(actions.includes(contract), `missing Press action contract: ${contract}`)
assert.ok(adminPage.includes("requirePermission('press.manage', { redirectOnFailure: true })") && adminPage.includes('<PressManager'), 'Admin Press boundary/consumer missing')
for (const contract of ['original_url', 'source_classification', 'image_media_id', 'publish_at', 'deletePressMention', '<PressCard preview']) assert.ok(adminUi.includes(contract), `Admin Press field missing: ${contract}`)
assert.ok(publicPage.includes('listPublishedPress') && publicPage.includes('<PressCard'), 'public Press consumer missing')
assert.ok(publicData.includes(".eq('status', 'published')") && publicData.includes('rights_status') && publicData.includes('rights_reference'), 'public Press query lacks publication/rights boundary')
assert.ok(permissions.includes("'press.manage'") && shell.includes("'/admin/press': 'press.manage'"), 'Press permission/navigation mapping missing')
assert.ok(homeRegistry.includes("'press'") && homeRenderer.includes('<PressHighlights') && homeData.includes(".from('press_mentions')"), 'governed Home Press section is missing')

function form(overrides = {}) {
  const data = new FormData()
  const values = {
    outlet: 'جهة موثقة', title: 'حوار أصلي حول التعلم', kind: 'interview', source_classification: 'independent_editorial',
    original_url: 'https://example.com/original', published_on: '2026-08-20', excerpt: 'مقتطف قصير موثق من المصدر.',
    status: 'draft', sort: '100', ...overrides,
  }
  for (const [key, value] of Object.entries(values)) data.set(key, value)
  return data
}
const now = new Date('2026-08-27T12:00:00Z')
assert.equal(normalizePressInput(form(), now).ok, true)
assert.equal(normalizePressInput(form({ original_url: 'http://example.com' }), now).ok, false)
assert.equal(normalizePressInput(form({ published_on: '2027-01-01' }), now).ok, false)
assert.equal(normalizePressInput(form({ kind: 'event', source_classification: 'independent_editorial', status: 'published' }), now).ok, false)
assert.equal(normalizePressInput(form({ status: 'scheduled', publish_at: '2026-08-27T10:00' }), now).ok, false)

console.log('verify:press-governance-local passed — sourced classification, HTTPS/date validation, rights-aware publish, atomic permission/audit/Admin and public consumers verified')
