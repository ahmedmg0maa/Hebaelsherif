import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const migration = readFileSync('supabase/migrations/074_governed_protected_delivery_removal_local_only.sql', 'utf8')
const actions = readFileSync('src/lib/actions/delivery-admin.ts', 'utf8')
const controls = readFileSync('src/components/admin/ProtectedDeliveryItems.tsx', 'utf8')
const books = readFileSync('src/app/admin/books/page.tsx', 'utf8')
const workshops = readFileSync('src/app/admin/workshops/page.tsx', 'utf8')
const curriculum = readFileSync('src/app/admin/courses/[id]/curriculum/page.tsx', 'utf8')
const dashboard = readFileSync('src/lib/data/dashboard.ts', 'utf8')
const bookDownload = readFileSync('src/app/dashboard/books/[slug]/download/route.ts', 'utf8')
const readiness = readFileSync('src/lib/catalog/publication-readiness.ts', 'utf8')

for (const table of ['book_files', 'lesson_resources', 'workshop_resources', 'workshop_recordings']) {
  assert.match(migration, new RegExp(`alter table public\\.${table}[\\s\\S]*?archived_at timestamptz[\\s\\S]*?archived_by uuid`), `${table} must preserve an attributable archived record`)
}
const archiveFn = migration.slice(migration.indexOf('create or replace function public.archive_protected_delivery_binding'), migration.indexOf('create or replace function public.record_protected_delivery_cleanup_result'))
assert.match(archiveFn, /not public\.has_permission\('learning\.manage', p_actor_id\)/, 'the archive transaction must recheck learning.manage')
assert.match(archiveFn, /pg_advisory_xact_lock[\s\S]*for update;/, 'archive must serialize each protected binding')
assert(!/delete from public\.(book_files|lesson_resources|workshop_resources|workshop_recordings)/.test(archiveFn), 'removal must not erase protected-delivery or download history')
assert.match(archiveFn, /update public\.video_admission_sessions[\s\S]*revoked_at = now\(\)/, 'removing a lesson video must revoke active admission sessions')
assert.match(archiveFn, /extensions\.digest\(v_path, 'sha256'\)/, 'raw paths must be reduced to a hash for durable evidence')
assert.match(archiveFn, /'recordId',[\s\S]*'pathHash',[\s\S]*'storageCleanupEligible'/, 'archive audit must contain metadata-only cleanup authority')

const cleanupFn = migration.slice(migration.indexOf('create or replace function public.record_protected_delivery_cleanup_result'), migration.indexOf('create or replace function public.authorize_book_download'))
assert.match(cleanupFn, /p_outcome not in \('removed','not_managed','failed'\)/, 'cleanup outcomes must be bounded')
assert.match(cleanupFn, /Archived private object requires storage reconciliation/, 'failed Storage cleanup must create an operational reconciliation event')
assert(!cleanupFn.includes('storage_path') && !cleanupFn.includes('file_path'), 'cleanup evidence must never accept a raw path')

for (const policy of ['book_files: access read', 'lesson_resources: enrolled read', 'ws_resources: registered read', 'ws_recordings: registered read']) {
  const start = migration.indexOf(`create policy "${policy}"`)
  assert(start >= 0 && migration.slice(start, start + 900).includes('archived_at is null'), `${policy} must hide archived delivery from customers`)
}
const bookAdmission = migration.slice(migration.indexOf('create or replace function public.authorize_book_download'), migration.indexOf('create or replace function public.authorize_customer_protected_delivery'))
assert.match(bookAdmission, /file\.archived_at is null/, 'service-role book admission must deny archived files')
const customerAdmission = migration.slice(migration.indexOf('create or replace function public.authorize_customer_protected_delivery'))
assert.equal((customerAdmission.match(/archived_at is null/g) ?? []).length >= 3, true, 'service-role course/workshop admission must deny archived records')
assert.match(migration, /revoke all on function public\.archive_protected_delivery_binding[\s\S]*grant execute on function public\.archive_protected_delivery_binding[\s\S]*to service_role;/, 'archive RPC must be service-only')

const action = actions.slice(actions.indexOf('export async function archiveProtectedDelivery'))
assert.match(action, /requirePermission\('learning\.manage'\)/, 'Server Action must require learning.manage')
assert.match(action, /sha256\(claim\.storagePath\) === claim\.pathHash[\s\S]*removePrivateObject/, 'queue deletion verifies claimed path authority')
assert.match(action, /complete_protected_cleanup/, 'post-commit Storage result must be recorded against its lease')
assert(controls.includes('setConfirm(item)') && controls.includes('تأكيد الإزالة') && controls.includes('ActionFeedback'), 'removal requires explicit confirmation and accessible feedback')
assert(!books.includes('storage_path') && !workshops.includes('storage_path') && !workshops.includes('file_path'), 'Admin list props must not expose raw private paths')
assert(curriculum.includes("items={l.video_path ? [{ id: l.id") && !curriculum.includes('storagePath'), 'Admin video removal must pass an opaque record id, never the private path')
assert.match(dashboard, /workshop_resources'[\s\S]*\.is\('archived_at', null\)[\s\S]*workshop_recordings'[\s\S]*\.is\('archived_at', null\)/, 'customer workshop reads must explicitly exclude archived delivery')
assert.match(bookDownload, /from\('book_files'\)[\s\S]*\.is\('archived_at',null\)/, 'book download lookup must explicitly exclude archived files')
assert.match(readiness, /from\('book_files'\)[\s\S]*\.is\('archived_at', null\)/, 'publication readiness must require an active protected book file')

console.log('verify:protected-delivery-removal-local passed — history-preserving archive, customer denial, session revocation, safe Storage cleanup and Admin controls verified locally')
