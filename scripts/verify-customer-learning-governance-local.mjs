import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(path, 'utf8')
const migration = read('supabase/migrations/064_atomic_customer_learning_state_local_only.sql')
const actions = read('src/lib/actions/learn.ts')
const data = read('src/lib/data/learn.ts')
const ui = read('src/components/learn/LearnClient.tsx')

for (const token of [
  'revoke insert, update, delete on table public.course_progress from anon, authenticated',
  'revoke insert, update, delete on table public.lesson_progress from anon, authenticated',
  'revoke insert, update, delete on table public.course_notes from anon, authenticated',
  'public.set_customer_lesson_completion',
  'public.save_customer_course_note',
  'public.delete_customer_course_note',
  "set search_path = ''",
  "'learning-progress:' || p_actor_id::text || ':' || v_course_id::text",
  'select 1 from public.course_enrollments enrollment',
  'on conflict(user_id, lesson_id) do update',
  'on conflict(user_id, course_id) do update',
  "'learning.lesson_completed'",
  "'learning.lesson_reopened'",
  "'learning.note_created'",
  "'learning.note_updated'",
  "'learning.note_deleted'",
  "'contentLength', char_length(v_content)",
]) assert.ok(migration.includes(token), `missing customer learning governance contract: ${token}`)

assert.ok(
  migration.indexOf('insert into public.lesson_progress') < migration.indexOf('insert into public.course_progress')
    && migration.indexOf('insert into public.course_progress') < migration.indexOf('insert into public.audit_logs'),
  'lesson state, recomputed course progress and audit must remain one ordered transaction',
)
assert.ok(
  !migration.includes("jsonb_build_object('content'")
    && !migration.includes("'noteContent'"),
  'private note content must not be copied into audit metadata',
)
assert.ok(
  migration.includes("return jsonb_build_object('outcome', 'unchanged'")
    && migration.includes("return jsonb_build_object('outcome', 'already_deleted')"),
  'progress retries and note deletion must be idempotent',
)

for (const rpc of [
  "rpc('set_customer_lesson_completion'",
  "rpc('save_customer_course_note'",
  "rpc('delete_customer_course_note'",
]) assert.ok(actions.includes(rpc), `learning Server Action must use governed RPC: ${rpc}`)
for (const direct of ["from('lesson_progress').upsert", "from('course_progress').upsert", "from('course_notes').insert", "from('course_notes').update", "from('course_notes').delete"])
  assert.ok(!actions.includes(direct), `learning Server Action must not use direct write: ${direct}`)
assert.ok(!actions.includes('if (lesson.is_preview) return'), 'Dashboard progress/video access must not bypass enrollment for preview lessons')

assert.ok(data.includes("throw new Error('LEARNING_STATE_UNAVAILABLE')"), 'configured learning read failures must fail closed')
assert.ok(data.includes(".in('lesson_id', lessonIds)") && data.includes('.limit(500)'), 'private notes must be course-scoped and bounded')
assert.ok(data.includes('enrolled: false') && data.includes('modules: [], resources: {}, notes: []'), 'unenrolled Dashboard response must not serialize curriculum/resources/notes')

const deleteCall = ui.indexOf('const res = await deleteNote(id)')
const deleteState = ui.indexOf('if (res.ok) setNotes', deleteCall)
assert.ok(deleteCall >= 0 && deleteState > deleteCall, 'note deletion UI must wait for durable success before removing the note')
assert.ok(ui.includes('role="alert"') && ui.includes('setActionError(res.error)'), 'learning mutations must expose accessible failure feedback')
assert.ok(ui.includes('maxLength={5000}') && ui.includes('disabled={busy}'), 'note controls must expose server bounds and prevent repeated deletion while busy')

console.log('verify:customer-learning-governance-local passed — enrollment-bound atomic progress, private note lifecycle, fail-closed reads and truthful UI verified')
