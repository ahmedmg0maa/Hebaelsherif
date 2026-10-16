import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(path, 'utf8')
const migration = read('supabase/migrations/067_atomic_customer_account_governance_local_only.sql')
const actions = read('src/lib/actions/account.ts')
const profileUi = read('src/components/dashboard/ProfileForm.tsx')
const notificationsUi = read('src/components/dashboard/MarkReadButton.tsx')

for (const token of [
  'revoke update on table public.profiles from anon, authenticated',
  'revoke update on table public.notifications from anon, authenticated',
  'public.update_customer_profile',
  'public.mark_customer_notifications_read',
  "set search_path = ''",
  "'customer-profile:' || p_actor_id::text",
  "'customer-notifications-read:' || p_actor_id::text",
  "'customer.profile_updated'",
  "'customer.notifications_marked_read'",
  "jsonb_build_object('count', v_count)",
  "jsonb_build_object('outcome', 'unchanged'",
  'grant execute on function public.update_customer_profile(uuid,text,text) to service_role',
  'grant execute on function public.mark_customer_notifications_read(uuid) to service_role',
]) assert.ok(migration.includes(token), `missing customer account governance contract: ${token}`)

assert.ok(
  migration.indexOf('update public.profiles') < migration.indexOf("'customer.profile_updated'"),
  'profile update and metadata-only audit must remain one ordered transaction',
)
assert.ok(
  migration.indexOf('update public.notifications') < migration.indexOf("'customer.notifications_marked_read'"),
  'notification read state and count-only audit must remain one ordered transaction',
)
for (const privateField of ["'fullName'", "'phone'", "'title'", "'body'"])
  assert.ok(!migration.includes(privateField), `private customer content must not enter audit metadata: ${privateField}`)

for (const rpc of ["rpc('update_customer_profile'", "rpc('mark_customer_notifications_read'"])
  assert.ok(actions.includes(rpc), `account Server Action must use governed RPC: ${rpc}`)
for (const direct of ["from('profiles').update", "from('notifications').update"])
  assert.ok(!actions.includes(direct), `account Server Action must not use direct write: ${direct}`)
assert.ok(actions.includes('hasSupabaseServerSecret()'), 'governed account writes require the server-only Supabase capability')
assert.ok(actions.includes('fullName.length > 120') && actions.includes('phonePattern'), 'profile inputs need matching server-side bounds')

assert.ok(profileUi.includes('maxLength={120}') && profileUi.includes('maxLength={30}'), 'profile UI must expose server field bounds')
assert.ok(notificationsUi.includes("role={feedback.ok ? 'status' : 'alert'}"), 'notification failures must be announced accessibly')
assert.ok(notificationsUi.includes('if (result.ok)') && notificationsUi.includes('router.refresh()'), 'notification UI must wait for durable success before refreshing')

console.log('verify:customer-account-governance-local passed — atomic profile/read-state writes, least privilege, minimized audit and truthful UI verified')
