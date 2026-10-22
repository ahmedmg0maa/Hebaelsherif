import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(path, 'utf8')
const registry = read('src/lib/home/sections.ts')
const actions = read('src/lib/actions/cms.ts')
const publicPage = read('src/app/(public)/page.tsx')
const preview = read('src/app/preview/[type]/[id]/page.tsx')
const manager = read('src/components/admin/HomeSectionManager.tsx')
const pageLifecycle = read('supabase/migrations/077_atomic_cms_page_lifecycle_local_only.sql')

for (const kind of ['hero','trust','pathways','guided_start','editorial_feature','offer','articles','resources','testimonials','press','newsletter','cta']) {
  assert.match(registry, new RegExp(`'${kind}'`), `home registry missing ${kind}`)
}
assert.match(publicPage, /getPublishedHomeSections\(\)/, 'public home must consume the governed section order')
assert.match(publicPage, /HomeSectionRenderer/, 'public home must render the fixed registry')
for (const action of ['createHomeSection', 'saveHomeSection']) {
  const start = actions.indexOf(`export async function ${action}`)
  const next = actions.indexOf('\nexport async function ', start + 1)
  const body = actions.slice(start, next === -1 ? actions.length : next)
  assert.notEqual(start, -1, `${action} missing`)
  assert.match(body, /requireAdminUser\('content\.manage'\)/, `${action} lacks content permission`)
  assert.match(body, /rpc\('manage_cms_page_section'/, `${action} must use the audit-atomic page-section transaction`)
  assert.match(body, /revalidatePath\('\/'\)/, `${action} does not update the public consumer`)
}
assert.match(pageLifecycle, /v_page\.slug = 'home'[\s\S]*\(values \('hero'\),\('pathways'\),\('cta'\)\)/, 'home publication completeness gate missing from the atomic page lifecycle')
assert.equal((pageLifecycle.match(/\(values \('hero'\),\('pathways'\),\('cta'\)\)/g) ?? []).length, 2, 'save and scheduler must both enforce Home completeness')
assert.match(manager, /HomeSectionManager/, 'structured Arabic home editor missing')
assert.doesNotMatch(manager, /JSON\.stringify|name="content"/, 'owner home editor must not require raw JSON')
assert.match(preview, /page\.slug === 'home'[\s\S]*HomeSectionRenderer/, 'home preview must render the real consumer')

console.log('verify:home-cms-local passed — fixed registry, Arabic forms, persistence/permission/audit/public consumer and visual preview contracts verified')
