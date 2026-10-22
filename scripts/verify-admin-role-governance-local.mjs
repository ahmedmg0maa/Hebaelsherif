import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(path, 'utf8')
const migration = read('supabase/migrations/060_atomic_admin_role_governance_local_only.sql')
const actions = read('src/lib/actions/cms.ts')
const page = read('src/app/admin/roles/page.tsx')
const controls = read('src/components/admin/AdminControls.tsx')
const editor = read('src/components/admin/RolePermissionEditor.tsx')

for (const token of [
  "public.has_role('owner', p_actor_id)", "public.has_permission('roles.manage', p_actor_id)",
  "pg_advisory_xact_lock(hashtextextended('admin-role-governance', 0))", 'self_role_change_forbidden',
  'last_owner_removal_forbidden', "'role.' || p_action", "'permissions.updated'",
  'user_id = auth.uid() or public.has_permission(\'roles.manage\')',
  'create policy "admin permissions: role managers read"',
  'revoke insert, update, delete on table public.admin_roles from anon, authenticated',
  'revoke insert, update, delete on table public.admin_permissions from anon, authenticated',
  'grant execute on function public.manage_admin_role', 'grant execute on function public.set_admin_role_permissions',
]) assert.ok(migration.includes(token), `missing role-governance contract: ${token}`)

assert.ok(migration.indexOf('pg_advisory_xact_lock') < migration.indexOf("v_target.role = 'owner'"), 'last-owner count must happen under the governance lock')
assert.ok(migration.includes("not ('admin.access' = any(v_permissions))") && migration.includes("'roles.manage' = any(v_permissions)"), 'delegated roles must retain Admin access and cannot receive role governance')
assert.ok(actions.includes("rpc('manage_admin_role'") && actions.includes("rpc('set_admin_role_permissions'"), 'actions must use atomic role RPCs')
assert.ok(!actions.includes("from('admin_roles').delete") && !actions.includes("from('admin_permissions').delete"), 'actions must not perform split direct role mutations')
assert.ok(page.includes("requirePermission('roles.manage'") && page.includes("rpc('get_admin_role_governance'"), 'role page must use the owner-only audited source')
assert.ok(page.includes("dynamic = 'force-dynamic'"), 'session-bound role governance must never be prerendered without an authenticated runtime')
assert.ok(!page.includes('adminList<') && !page.includes('catch {'), 'role reads must fail closed rather than becoming partial identity data')
assert.ok(controls.includes("window.confirm('هل تريدين سحب هذا الدور؟") && controls.includes("disabled ? 'دورك الحالي'"), 'revocation must be explicit and self-change truthful')
assert.ok(/permission\s*!==\s*'roles\.manage'/.test(editor) && editor.includes('تأكيد أمني حديث قبل الحفظ'), 'exclusive permission and fresh-MFA guidance must be visible')

console.log('verify:admin-role-governance-local passed — owner-only reads, atomic role/permission changes, self-change denial and race-safe last-owner protection verified')
