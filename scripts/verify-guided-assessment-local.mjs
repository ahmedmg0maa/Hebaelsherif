import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { defaultGuidedAssessmentContent, normalizeGuidedAssessmentForm, validateGuidedAssessmentContent } from '../src/lib/assessments/governance.ts'

const migration = readFileSync('supabase/migrations/052_guided_assessment_versioning_local_only.sql', 'utf8')
const actions = readFileSync('src/lib/actions/assessments.ts', 'utf8')
const data = readFileSync('src/lib/data/assessments.ts', 'utf8')
const admin = readFileSync('src/app/admin/assessments/page.tsx', 'utf8')
const manager = readFileSync('src/components/admin/AssessmentManager.tsx', 'utf8')
const quiz = readFileSync('src/components/catalog/StartHereQuiz.tsx', 'utf8')
const permissions = readFileSync('src/lib/auth/permissions.ts', 'utf8')
const shell = readFileSync('src/lib/admin-navigation.ts', 'utf8')
assert.ok(readFileSync('src/components/layout/AdminShell.tsx','utf8').includes('adminNavigation(permissions,badges)'), 'shell must consume permission-filtered navigation')

for (const contract of ["('admin', 'assessments.manage')", 'create table if not exists public.guided_assessments', 'create table if not exists public.guided_assessment_versions', 'guided_assessment_content_valid', "public.has_permission('assessments.manage', p_actor_id)", 'assessment_version_immutable', "'assessment.published'", "'assessment.version_deleted'", "cron.schedule('publish-scheduled-guided-assessments'"]) assert.ok(migration.includes(contract), `missing assessment database contract: ${contract}`)
assert.match(migration, /revoke all on function public\.save_guided_assessment_version[\s\S]*from public,anon,authenticated/)
assert.match(migration, /grant execute on function public\.save_guided_assessment_version[\s\S]*to service_role/)
assert.ok(!migration.includes('assessment_answers') && !migration.includes('customer_answer'), 'assessment answers must not have a persistence table')
for (const contract of ["requirePermission('assessments.manage')", "rpc('save_guided_assessment_version'", "rpc('delete_guided_assessment_draft'"]) assert.ok(actions.includes(contract), `missing assessment action: ${contract}`)
for (const contract of [".eq('status', 'published')", "published_version_id !== row.id", "guided_assessments.slug', 'start-here'"]) assert.ok(data.includes(contract), `missing published-pointer boundary: ${contract}`)
assert.ok(admin.includes("requirePermission('assessments.manage', { redirectOnFailure: true })") && admin.includes('<AssessmentManager'), 'Admin assessment permission/consumer missing')
for (const field of ['إضافة سؤال', 'إضافة خيار', 'إضافة نتيجة', 'resultKey', 'publish_at', '<StartHereQuiz']) assert.ok(manager.includes(field), `Admin assessment control missing: ${field}`)
assert.ok(!manager.includes('<textarea name="content_json"'), 'structured assessment Admin must not expose raw JSON')
for (const contract of ['role="progressbar"', 'الرجوع عن آخر إجابة', 'تعديل الإجابات', 'إجاباتك تبقى داخل هذه الصفحة', 'aria-pressed=', 'aria-live="polite"']) assert.ok(quiz.includes(contract), `public assessment UX/privacy contract missing: ${contract}`)
assert.ok(!quiz.includes('fetch(') && !quiz.includes('localStorage') && !quiz.includes('sessionStorage'), 'answers must remain ephemeral client state')
assert.ok(permissions.includes("'assessments.manage'") && shell.includes("'/admin/assessments': 'assessments.manage'"), 'assessment permission/navigation mapping missing')

assert.equal(validateGuidedAssessmentContent(defaultGuidedAssessmentContent).ok, true)
const unsafe = structuredClone(defaultGuidedAssessmentContent); unsafe.results[0].target = '/admin/users'; assert.equal(validateGuidedAssessmentContent(unsafe).ok, false)
const unmapped = structuredClone(defaultGuidedAssessmentContent); unmapped.questions.forEach((question) => question.options.forEach((option) => { if (option.resultKey === 'book') option.resultKey = 'course' })); assert.equal(validateGuidedAssessmentContent(unmapped).ok, false)
const form = new FormData(); form.set('name', 'اختبار البداية'); form.set('status', 'scheduled'); form.set('publish_at', '2026-08-27T10:00'); form.set('content_json', JSON.stringify(defaultGuidedAssessmentContent)); assert.equal(normalizeGuidedAssessmentForm(form, new Date('2026-08-27T12:00:00Z')).ok, false)
console.log('verify:guided-assessment-local passed — versioning, atomic publication, structured Admin mapping, safe targets and ephemeral answers verified')
