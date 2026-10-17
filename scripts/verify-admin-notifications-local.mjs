import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(path, 'utf8')
const migration = read('supabase/migrations/059_governed_admin_notifications_local_only.sql')
const action = read('src/lib/actions/admin-tools.ts')
const control = read('src/components/admin/NotifyUser.tsx')
const directory = read('src/app/admin/users/page.tsx')
const customer = read('src/app/admin/users/[id]/page.tsx')

for (const token of [
  "public.has_permission('notifications.send', p_actor_id)",
  'pg_advisory_xact_lock',
  'admin_request_id = p_request_id',
  "insert into public.notifications(user_id, title, body, kind, link, created_by, admin_request_id)",
  "insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)",
  "'titleLength', char_length(v_title)",
  "'bodyLength', char_length(v_body)",
  'revoke insert, delete on table public.notifications from anon, authenticated',
  'grant execute on function public.send_admin_notification',
]) assert.ok(migration.includes(token), `missing governed notification contract: ${token}`)

assert.ok(!migration.includes("'title', v_title") && !migration.includes("'body', v_body"), 'audit metadata must not duplicate notification content')
assert.ok(migration.includes("v_link not in (") && migration.includes("v_kind not in ('info', 'success', 'warning', 'error')"), 'destination and kind must be allowlisted inside PostgreSQL')
assert.ok(action.includes("service.rpc('send_admin_notification'") && !action.includes("service.from('notifications').insert"), 'Server Action must use the atomic service-only RPC')
assert.ok(!action.includes("action: 'notification.sent'") && !action.includes('meta: { title:'), 'Server Action must not perform a split or content-bearing audit write')
assert.ok(action.includes('p_request_id: input.requestId') && control.includes('crypto.randomUUID()'), 'Admin send must carry a stable idempotency identity')
assert.ok(control.includes('maxLength={120}') && control.includes('maxLength={1000}') && control.includes('ActionFeedback') && read('src/components/admin/ActionFeedback.tsx').includes("feedback.ok ? 'status' : 'alert'"), 'Admin control must expose bounds and accessible feedback')
for (const page of [directory, customer]) {
  assert.ok(/permission_name:\s*['"]notifications\.send['"]/.test(page), 'notification controls must be gated by the real permission')
  assert.ok(page.includes('canNotify') && page.includes('<NotifyUser'), 'permissioned pages must render the control only when allowed')
}

console.log('verify:admin-notifications-local passed — atomic permission recheck, idempotency, allowlists, minimized audit and truthful Admin controls verified')
