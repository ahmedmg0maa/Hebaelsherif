import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const migration = readFileSync('supabase/migrations/072_atomic_protected_upload_binding_local_only.sql', 'utf8')
const action = readFileSync('src/lib/actions/delivery-admin.ts', 'utf8')
const uploadUi = readFileSync('src/components/admin/ProtectedDeliveryUpload.tsx', 'utf8')

const beginStart = migration.indexOf('create or replace function public.begin_protected_upload_intent')
const authorizeStart = migration.indexOf('create or replace function public.authorize_protected_upload_finalization')
const bindingStart = migration.indexOf('create or replace function public.bind_validated_protected_upload')
const rejectionStart = migration.indexOf('create or replace function public.record_protected_upload_rejection')
const cleanupStart = migration.indexOf('create or replace function public.record_protected_upload_cleanup_failure')
assert(beginStart >= 0 && authorizeStart > beginStart && bindingStart > authorizeStart && rejectionStart > bindingStart && cleanupStart > rejectionStart, 'all governed intent/upload RPCs must exist in order')
const begin = migration.slice(beginStart, authorizeStart)
const authorize = migration.slice(authorizeStart, bindingStart)
const binding = migration.slice(bindingStart, rejectionStart)
const rejection = migration.slice(rejectionStart, cleanupStart)

assert.match(migration, /create table public\.protected_upload_intents[\s\S]*storage_path text not null unique[\s\S]*status text not null default 'issued'/, 'a private unique-path upload-intent ledger must exist')
assert.match(migration, /alter table public\.protected_upload_intents enable row level security;[\s\S]*revoke all on table public\.protected_upload_intents from anon, authenticated;/, 'the upload-intent ledger must remain private and service-only')
for (const table of ['book_versions', 'book_files', 'course_lessons', 'lesson_resources', 'workshop_resources', 'workshop_recordings']) {
  assert.match(migration, new RegExp(`revoke insert, update, delete on table public\\.${table} from anon, authenticated;`), `${table} browser-direct mutation must be revoked`)
}

assert.match(begin, /not public\.has_permission\('learning\.manage', p_actor_id\)/, 'intent issuance must recheck learning.manage')
assert.match(begin, /regexp_match\([\s\S]*p_storage_path[\s\S]*\[0-9a-f\]/, 'intent issuance must validate the opaque kind/entity/path shape')
assert.match(begin, /encode\(extensions\.digest\(coalesce\(p_storage_path, ''\), 'sha256'\), 'hex'\) <> p_path_hash/, 'intent issuance must recompute the path hash')
assert.match(begin, /perform 1 from public\.(?:books|course_lessons|workshops)[\s\S]*protected_upload_target_not_found/, 'intent issuance must verify the target before signing')
assert.match(begin, /insert into public\.protected_upload_intents[\s\S]*insert into public\.audit_logs/, 'intent issuance and metadata-only audit must be atomic')

assert.match(authorize, /id = p_intent_id and actor_id = p_actor_id[\s\S]*upload_kind = p_upload_kind and entity_id = p_entity_id[\s\S]*storage_path = p_storage_path/, 'finalization authorization must bind the exact actor, intent, kind, entity and path')
assert.match(authorize, /v_intent\.status = 'finalized'[\s\S]*v_intent\.binding_id/, 'authorization must support an idempotent finalized retry')
assert.match(authorize, /v_intent\.expires_at <= now\(\)[\s\S]*set status = 'expired'[\s\S]*delivery\.upload_intent\.expired/, 'expired intents must become durable audited facts')

assert.match(binding, /not public\.has_permission\('learning\.manage', p_actor_id\)/, 'database binding must recheck learning.manage for the explicit actor')
assert.match(binding, /where id = p_intent_id and actor_id = p_actor_id[\s\S]*for update;/, 'database binding must lock the issued actor-owned intent')
assert.match(binding, /encode\(extensions\.digest\(v_intent\.storage_path, 'sha256'\), 'hex'\) <> v_intent\.path_hash/, 'database binding must recompute the issued Storage path hash')
assert.match(binding, /p_observed_size is distinct from v_intent\.declared_size/, 'database binding must repeat exact size comparison')
assert.match(binding, /v_intent\.declared_mime <> all\(v_allowed_mimes\)[\s\S]*p_observed_mime <> all\(v_allowed_mimes\)/, 'database binding must repeat declared and observed MIME allowlists')
assert.match(binding, /pg_advisory_xact_lock\(hashtextextended\('protected-upload:' \|\| v_intent\.path_hash/, 'database binding must serialize the issued upload identity')

const targetMutation = binding.indexOf("if v_intent.upload_kind = 'book' then", binding.indexOf('protected_upload_path_already_bound'))
const inspection = binding.indexOf('insert into public.protected_upload_inspections', targetMutation)
const deliveryEvent = binding.indexOf('insert into public.protected_delivery_events', inspection)
const audit = binding.indexOf('insert into public.audit_logs', deliveryEvent)
const finalizeIntent = binding.indexOf("set status = 'finalized'", audit)
const successReturn = binding.lastIndexOf('return jsonb_build_object(')
assert(targetMutation >= 0 && inspection > targetMutation && deliveryEvent > inspection && audit > deliveryEvent && finalizeIntent > audit && successReturn > finalizeIntent, 'binding, inspection, delivery event, audit and intent finalization must share one transaction before success')
assert.match(binding, /select video_path into v_previous_path[\s\S]*update public\.course_lessons set video_path/, 'video replacement must capture the prior private object for cleanup')

assert.match(rejection, /where id = p_intent_id and actor_id = p_actor_id[\s\S]*for update;/, 'rejection evidence must lock the actor-owned intent')
assert.match(rejection, /insert into public\.protected_upload_inspections[\s\S]*set status = p_outcome, inspection_id = v_id[\s\S]*insert into public\.protected_delivery_events[\s\S]*insert into public\.audit_logs/, 'rejection state, inspection, event and audit must be atomic')
assert.match(rejection, /if coalesce\(p_cleanup_confirmed, false\) is not true then[\s\S]*insert into public\.system_events/, 'unconfirmed object cleanup must create durable operational evidence')

for (const signature of [
  'begin_protected_upload_intent(uuid,text,uuid,text,text,text,bigint)',
  'authorize_protected_upload_finalization(uuid,uuid,text,uuid,text)',
  'bind_validated_protected_upload(uuid,uuid,text,text,text,bigint,text,boolean)',
  'record_protected_upload_rejection(uuid,uuid,text,bigint,text,text,boolean)',
  'record_protected_upload_cleanup_failure(uuid,text,uuid,text)',
]) {
  assert(migration.includes(`revoke all on function public.${signature} from public, anon, authenticated;`), `${signature} must revoke browser execution`)
  assert(migration.includes(`grant execute on function public.${signature} to service_role;`), `${signature} must grant only service execution`)
}

const issuance = action.slice(action.indexOf('export async function beginProtectedUpload'), action.indexOf('export async function finalizeProtectedUpload'))
assert(issuance.indexOf("rpc('begin_protected_upload_intent'") >= 0 && issuance.indexOf("rpc('begin_protected_upload_intent'") < issuance.indexOf('createSignedUploadUrl('), 'a durable intent must precede signed Storage upload issuance')
assert.match(issuance, /signed_upload_issue_failed/, 'failed signing must close the issued intent with rejection evidence')
assert.match(action, /export async function abandonProtectedUpload[\s\S]*direct_storage_upload_failed/, 'a failed direct Storage upload must close its issued intent through the server boundary')
const finalization = action.slice(action.indexOf('export async function finalizeProtectedUpload'))
const authorizationIndex = finalization.indexOf("rpc('authorize_protected_upload_finalization'")
const validationIndex = finalization.indexOf('validateObservedFile(')
const finalizationOnly = finalization.slice(0, finalization.indexOf('export async function archiveProtectedDelivery'))
assert(!finalizationOnly.includes('removePrivateObject('), 'finalization must never delete an object after an ambiguous response')
const bindingIndex = finalization.indexOf("rpc('bind_validated_protected_upload'")
assert(authorizationIndex >= 0 && validationIndex > authorizationIndex && bindingIndex > validationIndex, 'exact intent authorization must precede privileged Storage inspection/removal and atomic binding')
assert(!/from\('(book_versions|book_files|course_lessons|lesson_resources|workshop_resources|workshop_recordings|protected_upload_intents|protected_upload_inspections|audit_logs)'\)\.(?:insert|update|upsert|delete)/.test(action), 'Server Actions must not retain split protected-delivery writes')
const cleanup = readFileSync('supabase/migrations/091_protected_delivery_cleanup_queue_local_only.sql', 'utf8')
assert.match(cleanup, /create trigger lesson_video_cleanup_queue[\s\S]*create trigger book_cleanup_queue/, 'replacement and archival must enqueue cleanup in the mutation transaction')
assert.match(uploadUi, /intentId: start\.data\.intentId/, 'the browser must return the exact issued intent')
assert.match(uploadUi, /if \(attempt\.current\) return await finish\(attempt\.current\)/, 'ambiguous responses must retry the same intent')
assert.match(uploadUi, /abandonProtectedUpload\(kind, entityId, pending\)/, 'explicit cancellation must retire the pending intent')
assert.match(uploadUi, /maxLength=\{180\}/, 'upload title exposes server bound')
assert.match(uploadUi, /maxLength=\{30\}/, 'book version exposes server bound')
assert(uploadUi.includes('ActionFeedback') && uploadUi.includes('useAdminAction'), 'shared runner releases locks and renders status/alert')
assert.match(uploadUi, /finally \{ setProgress\(''\) \}/, 'progress recovers after thrown failures')
console.log('verify:protected-upload-binding-local passed — issued authority, atomic binding, durable cleanup and retryable Admin workflow')
