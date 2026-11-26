import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { getUploadRule, validateObservedFile } from '../src/lib/delivery/file-validation.mjs'

const rule = getUploadRule('book')
const type = rule.extensions.pdf
const acceptedBytes = new Uint8Array(Buffer.from('%PDF-1.7\nlocal verification'))
const rejectedBytes = new Uint8Array(Buffer.from('MZ executable disguised as PDF'))

assert.equal(validateObservedFile({
  rule,
  type,
  declaredMime: 'application/pdf',
  declaredSize: acceptedBytes.length,
  observed: { bytes: acceptedBytes, mime: 'application/pdf', size: acceptedBytes.length },
}), true, 'valid PDF magic bytes should pass finalization validation')

assert.equal(validateObservedFile({
  rule,
  type,
  declaredMime: 'application/pdf',
  declaredSize: rejectedBytes.length,
  observed: { bytes: rejectedBytes, mime: 'application/pdf', size: rejectedBytes.length },
}), false, 'disguised executable magic bytes should fail finalization validation')

assert.equal(validateObservedFile({
  rule,
  type,
  declaredMime: 'application/pdf',
  declaredSize: acceptedBytes.length,
  observed: { bytes: acceptedBytes, mime: 'application/octet-stream', size: acceptedBytes.length },
}), false, 'observed MIME mismatch should fail finalization validation')

const actionSource = readFileSync('src/lib/actions/delivery-admin.ts', 'utf8')
const finalizationSource = actionSource.slice(actionSource.indexOf('export async function finalizeProtectedUpload'))
const validationIndex = finalizationSource.indexOf('validateObservedFile(')
const firstBindingIndex = finalizationSource.indexOf("rpc('bind_validated_protected_upload'")
assert(validationIndex >= 0 && firstBindingIndex > validationIndex, 'finalization must call the shared validation gate before binding')
assert.match(finalizationSource, /if \(!inspected\) return[\s\S]*if \(!valid\)/, 'finalization must reject failed server inspection or magic-byte validation')
assert(!/from\('(book_versions|book_files|course_lessons|lesson_resources|workshop_resources|workshop_recordings|protected_upload_inspections|audit_logs)'\)\.(?:insert|update|upsert|delete)/.test(finalizationSource), 'finalization must not fall back to split direct database writes')

const bindingMigration = readFileSync('supabase/migrations/072_atomic_protected_upload_binding_local_only.sql', 'utf8')
const bindingFunction = bindingMigration.slice(bindingMigration.indexOf('create or replace function public.bind_validated_protected_upload'), bindingMigration.indexOf('create or replace function public.record_protected_upload_rejection'))
const auditStatement = bindingFunction.match(/insert into public\.audit_logs[\s\S]*?values \([\s\S]*?\n  \);/)?.[0] ?? ''
assert(auditStatement, 'atomic delivery binding must include the audit insert')
assert(!/p_storage_path|replacedPath|token|signedUrl/.test(auditStatement), 'delivery upload audit metadata must not contain raw paths or tokens')

const migration = readFileSync('supabase/migrations/043_protected_delivery_controls.sql', 'utf8')
const eventTable = migration.match(/create table public\.protected_delivery_events \(([\s\S]*?)\n\);/)?.[1] ?? ''
const inspectionTable = migration.match(/create table public\.protected_upload_inspections \(([\s\S]*?)\n\);/)?.[1] ?? ''
assert(eventTable && inspectionTable, 'delivery security log tables must remain defined')
assert(!/\b(?:token|storage_path|path)\b/i.test(eventTable), 'delivery event schema must not persist raw tokens or storage paths')
assert(!/\b(?:token|storage_path|path)\b/i.test(inspectionTable.replaceAll('path_hash', '')), 'upload inspection schema may persist only a path hash')

console.log('verify:delivery-local passed — finalization magic bytes and log-schema secrecy assertions verified locally')
