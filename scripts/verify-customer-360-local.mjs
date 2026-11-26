import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(path, 'utf8')
const migration = read('supabase/migrations/058_governed_customer_360_local_only.sql')
const actions = read('src/lib/actions/crm.ts')
const directory = read('src/app/admin/users/page.tsx')
const customer = read('src/app/admin/users/[id]/page.tsx')
const controls = read('src/components/admin/Customer360Actions.tsx')

for (const token of [
  'search_admin_users', 'get_admin_customer_360', 'manage_customer_note', 'manage_customer_tag',
  "has_permission('users.view', p_actor_id)", "has_permission('users.manage', p_actor_id)",
  'revoke insert, update, delete on table public.user_notes from anon, authenticated',
  'revoke insert, update, delete on table public.user_tags from anon, authenticated',
  'limit case when v_query = \'\' then 200 else 50 end', 'limit 100', 'limit 20',
  'customer.directory_viewed', 'customer.profile_viewed', "'customer.note_' || p_action", "'customer.tag_' || p_action",
  'pg_advisory_xact_lock', 'archived_at', "set search_path = ''",
]) assert.ok(migration.includes(token), `missing Customer 360 database contract: ${token}`)

for (const signature of [
  'public.search_admin_users(uuid, text)', 'public.get_admin_customer_360(uuid, uuid)',
  'public.manage_customer_note(uuid, uuid, text, uuid, text)', 'public.manage_customer_tag(uuid, uuid, text, uuid, text)',
]) {
  assert.ok(migration.includes(`revoke all on function ${signature} from public, anon, authenticated`), `browser grant remains on ${signature}`)
  assert.ok(migration.includes(`grant execute on function ${signature} to service_role`), `service grant missing on ${signature}`)
}

const noteFunction = migration.slice(migration.indexOf('create or replace function public.manage_customer_note'), migration.indexOf('create or replace function public.manage_customer_tag'))
const tagFunction = migration.slice(migration.indexOf('create or replace function public.manage_customer_tag'), migration.indexOf('revoke all on function public.search_admin_users'))
assert.ok(noteFunction.includes('insert into public.audit_logs') && tagFunction.includes('insert into public.audit_logs'), 'note/tag mutation and audit must share their RPC transaction')
assert.ok(!noteFunction.includes("'note', v_note") && !tagFunction.includes("'tag', v_tag"), 'note/tag content must not enter audit metadata')

const actionSlice = actions.slice(actions.indexOf('async function customerRecordAction'), actions.indexOf('export async function manageInboxMessage'))
assert.ok(actionSlice.includes("requirePermission('users.manage')") && actionSlice.includes(".rpc(rpc, args)"), 'customer mutations must use the permissioned RPC boundary')
for (const forbidden of ["from('user_notes').insert", "from('user_tags').upsert", "from('audit_logs').insert"]) {
  assert.ok(!actionSlice.includes(forbidden), `split Customer 360 write remains: ${forbidden}`)
}

assert.ok(directory.includes("requirePermission('users.view'") && directory.includes(".rpc('search_admin_users'") && directory.includes('ADMIN_CUSTOMER_DIRECTORY_READ_UNAVAILABLE'), 'directory must be permissioned, injection-safe and fail closed')
assert.ok(!directory.includes('.or(') && !directory.includes('catch {') && !directory.includes('return []'), 'directory must not build a PostgREST OR expression or hide read errors')
assert.ok(customer.includes(".rpc('get_admin_customer_360'") && customer.includes('ADMIN_CUSTOMER_READ_UNAVAILABLE') && customer.includes('data.profile.createdAt'), 'Customer 360 must use its bounded permissioned read contract')
assert.ok(customer.includes('أحدث ١٠٠ سجل') && customer.includes('<EmptyState') && customer.includes('CustomerNoteControl') && customer.includes('CustomerTagControl'), 'Customer 360 must expose truthful bounds, empty states and real lifecycle controls')
assert.ok(controls.includes('setCustomerNoteArchived') && controls.includes('removeCustomerTag') && controls.includes('role="status"'), 'customer controls need archive/restore/remove and accessible feedback')

console.log('verify:customer-360-local passed — bounded PII reads, access audit, atomic note/tag lifecycle and truthful Admin states verified')
