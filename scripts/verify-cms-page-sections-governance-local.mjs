import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const migration = readFileSync('supabase/migrations/075_atomic_cms_page_sections_local_only.sql', 'utf8')
const actions = readFileSync('src/lib/actions/cms.ts', 'utf8')
const homeManager = readFileSync('src/components/admin/HomeSectionManager.tsx', 'utf8')
const cmsManager = readFileSync('src/components/admin/CmsStructureManager.tsx', 'utf8')
const adminPage = readFileSync('src/app/admin/pages/page.tsx', 'utf8')
const publicData = readFileSync('src/lib/data/cms.ts', 'utf8')

assert.match(migration, /revoke insert, update, delete on table public\.page_sections from anon, authenticated;/, 'browser section mutation must be revoked')
assert.match(migration, /revoke insert, update, delete on table public\.content_revisions from anon, authenticated;/, 'browser revision mutation must be revoked')
const fn = migration.slice(migration.indexOf('create or replace function public.manage_cms_page_section'), migration.indexOf('revoke all on function public.manage_cms_page_section'))
assert.match(fn, /has_permission\('content\.delete', p_actor_id\)[\s\S]*has_permission\('content\.manage', p_actor_id\)/, 'delete and edit permissions must be rechecked separately')
assert.match(fn, /from public\.pages where id = p_page_id for update;[\s\S]*pg_advisory_xact_lock/, 'page section aggregate must be locked')
assert.match(fn, /v_count >= 100/, 'unbounded section creation must be rejected')
assert.match(fn, /octet_length\(p_content::text\) > 65536/, 'content payload must be bounded in PostgreSQL')
assert.match(fn, /home_section_kind_exists/, 'home section kinds must remain unique')
assert.equal((fn.match(/published_home_required_section/g) ?? []).length, 2, 'published home must preserve visible hero/pathways/cta on hide and delete')
assert.equal((fn.match(/insert into public\.content_revisions/g) ?? []).length, 2, 'update and delete must checkpoint inside the transaction')
assert.match(fn, /insert into public\.audit_logs[\s\S]*return jsonb_build_object/, 'mutation and metadata-only audit must commit together')
assert(!/jsonb_build_object\([\s\S]*'content'/.test(fn.slice(fn.indexOf('insert into public.audit_logs'))), 'audit metadata must not duplicate section content')
assert.match(migration, /revoke all on function public\.manage_cms_page_section[\s\S]*grant execute on function public\.manage_cms_page_section[\s\S]*to service_role;/, 'section RPC must be service-only')

for (const action of ['createHomeSection', 'saveHomeSection', 'savePageSection', 'deletePageSection']) {
  const start = actions.indexOf(`export async function ${action}`)
  const next = actions.indexOf('\nexport async function ', start + 1)
  const body = actions.slice(start, next === -1 ? actions.length : next)
  assert(start >= 0, `${action} must exist`)
  assert.match(body, /rpc\('manage_cms_page_section'/, `${action} must use the governed transaction`)
  assert(!/from\('(page_sections|content_revisions|audit_logs)'\)\.(insert|update|delete)/.test(body), `${action} must not retain split writes`)
}
assert(homeManager.includes('window.confirm') && cmsManager.includes('window.confirm'), 'destructive section controls must require confirmation')
assert(homeManager.includes("role={failed ? 'alert' : 'status'}") && cmsManager.includes("role={failed ? 'alert' : 'status'}"), 'Admin controls must expose accessible success/failure states')
assert(cmsManager.includes('maxLength={65536}') && cmsManager.includes('max="1000"'), 'Admin section bounds must mirror the transaction')
assert.match(adminPage, /page_sections\(id,name,kind,sort,is_visible,content\)/, 'Admin must reload persisted sections')
assert.match(publicData, /getPublishedHomeSections[\s\S]*page_sections\(id,name,kind,sort,is_visible,content\)/, 'public home must consume governed section state')

console.log('verify:cms-page-sections-governance-local passed — permissioned atomic revision/mutation/audit, published-home guard and truthful Admin controls verified locally')
