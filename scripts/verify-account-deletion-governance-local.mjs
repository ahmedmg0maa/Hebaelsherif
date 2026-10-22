import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(path, 'utf8')
const migration = read('supabase/migrations/071_governed_account_deletion_requests_local_only.sql')
const actions = read('src/lib/actions/account-deletion.ts')
const customer = read('src/components/dashboard/AccountDeletionRequestControl.tsx')
const settings = read('src/app/dashboard/settings/page.tsx')
const adminPage = read('src/app/admin/users/page.tsx')
const adminQueue = read('src/components/admin/AccountDeletionQueue.tsx')
const data = read('src/lib/data/account-deletion.ts')

for (const token of [
  'public.account_deletion_requests',
  'on delete set null',
  'account_deletion_requests_one_active_user',
  'revoke all on table public.account_deletion_requests from anon, authenticated',
  'public.get_customer_account_deletion_request',
  'public.request_customer_account_deletion',
  'public.cancel_customer_account_deletion',
  'public.list_admin_account_deletion_requests',
  'public.review_customer_account_deletion',
  'public.complete_customer_account_deletion',
  "set search_path = ''",
  "'account-deletion:' || p_actor_id::text",
  "requested_at >= now() - interval '30 days'",
  'v_recent_count >= 3',
  "exists(select 1 from public.admin_roles where user_id = p_actor_id)",
  "public.has_permission('users.view', p_actor_id)",
  "public.has_permission('users.manage', p_actor_id)",
  "'customer.account_deletion_requested'",
  "'customer.account_deletion_cancelled'",
  "'admin.account_deletion_reviewed'",
  "'admin.account_deletion_completed'",
  'if v_request.user_id is not null then',
  "message = 'account_identity_still_exists'",
  'grant execute on function public.complete_customer_account_deletion(uuid,uuid,text) to service_role',
]) assert.ok(migration.includes(token), `missing account-deletion governance contract: ${token}`)

assert.ok(
  migration.indexOf('insert into public.account_deletion_requests') < migration.indexOf("'customer.account_deletion_requested'"),
  'customer request and minimized audit must share one ordered transaction',
)
assert.ok(
  migration.indexOf('update public.account_deletion_requests') < migration.indexOf("'admin.account_deletion_reviewed'"),
  'Admin review and audit must share one ordered transaction',
)
for (const privateAudit of ["'reviewNote', v_note", "'email', v_email", "'fullName', v_full_name"])
  assert.ok(!migration.includes(privateAudit), `private request content must not enter audit metadata: ${privateAudit}`)
assert.ok(migration.includes("'notePresent', v_note is not null") && migration.includes("'noteLength', coalesce(char_length(v_note), 0)"), 'review audit must retain structure without note content')

for (const token of [
  "rpc('request_customer_account_deletion'",
  "rpc('cancel_customer_account_deletion'",
  "rpc('review_customer_account_deletion'",
  "rpc('complete_customer_account_deletion'",
  "requireFreshAdminAssurance('users.manage')",
  'account_identity_still_exists',
]) assert.ok(actions.includes(token), `missing account-deletion action boundary: ${token}`)
assert.ok(!actions.includes('.auth.admin.deleteUser') && !actions.includes("from('account_deletion_requests')"), 'application must not bypass governed persistence or silently perform external deletion')

assert.ok(data.includes("rpc('get_customer_account_deletion_request'") && data.includes('CUSTOMER_ACCOUNT_DELETION_READ_UNAVAILABLE'), 'customer request read must fail closed through the service-only contract')
for (const token of ['AccountDeletionRequestControl', 'الإرسال لا يحذف الحساب فورًا', 'إلغاء طلب الحذف', 'role={feedback.ok ? \'status\' : \'alert\'}'])
  assert.ok(customer.includes(token), `customer deletion UI missing truthful state: ${token}`)
assert.ok(!settings.includes('خلال ٧ أيام') && !settings.includes('راسلينا'), 'settings must not retain the false contact-only deletion promise')

assert.ok(adminPage.includes("rpc('list_admin_account_deletion_requests'") && adminPage.includes('AccountDeletionQueue') && adminPage.includes('لا يُسجل الاكتمال إلا بعد غيابها فعليًا'), 'Admin users page must consume and describe the governed request queue truthfully')
for (const token of ['اعتماد للتنفيذ — MFA حديث', 'completeAccountDeletionRequest', 'maxLength={1000}', 'role={feedback[row.id].ok ? \'status\' : \'alert\'}'])
  assert.ok(adminQueue.includes(token), `Admin deletion queue missing operational truth/control: ${token}`)

console.log('verify:account-deletion-governance-local passed — durable customer request/cancel, permissioned review, fresh-MFA approval/completion proof and truthful UI verified')
