import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const migration = readFileSync('supabase/migrations/076_atomic_navigation_governance_local_only.sql', 'utf8')
const actions = readFileSync('src/lib/actions/cms.ts', 'utf8')
const manager = readFileSync('src/components/admin/CmsStructureManager.tsx', 'utf8')
const adminPage = readFileSync('src/app/admin/pages/page.tsx', 'utf8')
const publicData = readFileSync('src/lib/data/cms.ts', 'utf8')

assert.match(migration, /revoke insert, update, delete on table public\.navigation_items from anon, authenticated;/, 'browser navigation writes must be revoked')
assert.match(migration, /navigation_label_bounds_076[\s\S]*navigation_href_internal_076[\s\S]*navigation_sort_bounds_076/, 'future writes need database bounds')
const fn = migration.slice(migration.indexOf('create or replace function public.manage_navigation_item'), migration.indexOf('revoke all on function public.manage_navigation_item'))
assert.match(fn, /has_permission\('settings\.manage', p_actor_id\)/, 'PostgreSQL must repeat settings permission')
assert.match(fn, /pg_advisory_xact_lock\(hashtextextended\('navigation-items'/, 'navigation aggregate must serialize')
assert.match(fn, /v_count >= 200/, 'unbounded navigation creation must be denied')
assert.match(fn, /navigation_item_has_children/, 'deletion must not cascade through an unrepresented hierarchy')
assert.match(fn, /navigation_parent_menu_mismatch/, 'updates must preserve parent/menu consistency')
assert.match(fn, /insert into public\.audit_logs[\s\S]*return jsonb_build_object/, 'mutation and audit must commit in one transaction')
const audit = fn.slice(fn.indexOf('insert into public.audit_logs'))
assert(!/'label'|'href'/.test(audit), 'audit metadata must not duplicate navigation copy or destinations')
assert.match(migration, /revoke all on function public\.manage_navigation_item[\s\S]*grant execute on function public\.manage_navigation_item[\s\S]*to service_role;/, 'navigation RPC must be service-only')

for (const action of ['saveNavigationItem', 'deleteNavigationItem']) {
  const start = actions.indexOf(`export async function ${action}`)
  const next = actions.indexOf('\nexport async function ', start + 1)
  const body = actions.slice(start, next === -1 ? actions.length : next)
  assert(start >= 0, `${action} must exist`)
  assert.match(body, /rpc\('manage_navigation_item'/, `${action} must use the governed transaction`)
  assert(!/from\('(navigation_items|audit_logs)'\)\.(insert|update|delete)/.test(body), `${action} must not retain split writes`)
}
assert.match(actions, /Number\.isInteger\(sort\)[\s\S]*sort < 0[\s\S]*sort > 1000/, 'Server Action must mirror order bounds without coercion')
assert(manager.includes('window.confirm') && manager.includes("role={failed ? 'alert' : 'status'}"), 'Admin controls need destructive confirmation and accessible feedback')
assert(manager.includes('maxLength={80}') && manager.includes('maxLength={180}') && manager.includes('max="1000"'), 'Admin inputs must mirror navigation bounds')
assert.match(adminPage, /adminList<NavRow>\('navigation_items'[\s\S]*limit:200/, 'Admin must reload the bounded persisted rows')
assert.match(publicData, /getPublicNavigation[\s\S]*from\('navigation_items'\)[\s\S]*eq\('is_visible',true\)/, 'public chrome must consume governed visible navigation')

console.log('verify:navigation-governance-local passed — bounded permissioned atomic navigation mutation/audit and truthful Admin/public consumers verified locally')
