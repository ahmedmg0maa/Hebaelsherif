import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(path, 'utf8')
const migration = read('supabase/migrations/057_operational_settings_and_resend_outbox_local_only.sql')
const adapter = read('src/lib/email/resend.ts')
const crm = read('src/lib/actions/crm.ts')
const adminControl = read('src/lib/actions/admin-control.ts')
const settingsForm = read('src/components/admin/OperationalSettingsForm.tsx')
const inbox = read('src/app/admin/inbox/page.tsx')
const inboxControls = read('src/components/admin/InboxControls.tsx')

for (const token of [
  'save_operational_settings', 'claim_email_outbox', 'finalize_email_outbox',
  "has_permission('settings.manage', p_actor_id)", "has_permission('inbox.manage', p_actor_id)",
  "has_permission('notifications.send', p_actor_id)",
  "status in ('queued', 'sending', 'failed', 'disabled')", "v_row.attempts >= 5",
  "interval '5 minutes'", 'email.delivery_claimed', 'email.delivery_sent',
  'email.delivery_failed', 'revoke insert, update, delete on table public.email_outbox',
  "set search_path = ''", "'outboxId',v_outbox_id", "'provider', case when p_email_enabled then 'resend'",
  "p_status = 'replied' and v_message.status <> 'replied'", "set status = 'replied'",
]) assert.ok(migration.includes(token), `missing Resend/outbox database contract: ${token}`)
const claimBody = migration.slice(migration.indexOf('create or replace function public.claim_email_outbox'), migration.indexOf('create or replace function public.finalize_email_outbox'))
assert.ok(claimBody.indexOf("update public.email_outbox set status='sending'") < claimBody.indexOf("insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta)"), 'claim mutation and audit must share the RPC transaction')
const manageBody = migration.slice(migration.indexOf('create or replace function public.manage_contact_message'), migration.indexOf('create or replace function public.claim_email_outbox'))
assert.ok(!manageBody.includes("v_final_status := 'replied'"), 'queuing or disabling a reply must not claim that delivery succeeded')

for (const token of [
  "import 'server-only'", "https://api.resend.com/emails", "'User-Agent'", "'Idempotency-Key'",
  'contact-reply/${outboxId}', 'MAX_RESPONSE_BYTES', 'response.body.getReader()',
  'AbortSignal.timeout(10_000)', "provider_rate_limited", "provider_auth_failed",
  ".rpc('claim_email_outbox'", ".rpc('finalize_email_outbox'",
]) assert.ok(adapter.includes(token), `missing Worker-safe Resend adapter contract: ${token}`)
assert.ok(!adapter.includes('console.') && !adapter.includes('response.text()') && !adapter.includes('response.json()'), 'adapter must not log data or buffer an unbounded provider response')
assert.ok(!adapter.includes('RESEND_API_KEY=') && !adapter.includes('re_'), 'adapter must not contain a Resend credential literal')

assert.ok(crm.includes('deliverResendOutbox') && crm.includes('retryOutboxEmail') && crm.includes("replyDelivery === 'queued'"), 'Inbox actions must dispatch and expose retry through the governed adapter')
assert.ok(crm.includes("notice = sent.ok ? 'حُفظت المتابعة وأُرسل الرد.'"), 'Admin feedback must distinguish saved from delivered')

const saveSettingsBody = adminControl.slice(adminControl.indexOf('export async function saveOperationalSettings'), adminControl.indexOf('export async function deleteCatalogItem'))
assert.ok(saveSettingsBody.includes(".rpc('save_operational_settings'"), 'operational settings must use the atomic RPC')
assert.ok(!saveSettingsBody.includes("from('site_settings').upsert") && !saveSettingsBody.includes("from('audit_logs').insert"), 'settings action must not split persistence and audit')
assert.ok(saveSettingsBody.includes('RESEND_API_KEY') && saveSettingsBody.includes('RESEND_FROM_EMAIL'), 'email cannot be enabled with incomplete provider configuration')
assert.ok(settingsForm.includes('name="email_enabled"') && settingsForm.includes('تفعيل إرسال ردود Inbox عبر Resend'), 'Admin must own the non-secret email activation switch')
assert.ok(inbox.includes('attempts,next_attempt_at') && inbox.includes('<OutboxRetryControl'), 'Inbox must expose persisted attempt/retry state')
assert.ok(inboxControls.includes('محاولة إرسال آمنة') && inboxControls.includes('useAdminAction') && read('src/components/admin/useAdminAction.ts').includes('result.notice || success'), 'Admin delivery feedback and retry control are required')

console.log('verify:resend-outbox-local passed — atomic settings/outbox state, bounded Worker fetch, idempotent Resend delivery and truthful Admin retry verified')
