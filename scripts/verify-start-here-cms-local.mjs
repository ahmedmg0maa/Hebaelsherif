import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const content = readFileSync('src/lib/start-here/content.ts', 'utf8')
const data = readFileSync('src/lib/data/start-here.ts', 'utf8')
const action = readFileSync('src/lib/actions/cms.ts', 'utf8')
const editor = readFileSync('src/components/admin/StartHereExperienceEditor.tsx', 'utf8')
const page = readFileSync('src/app/(public)/start-here/page.tsx', 'utf8')

for (const source of ['normalizeStartHereContent', "value.startsWith('/')", "!value.startsWith('//')"]) assert.ok(content.includes(source), `missing page-shell guard: ${source}`)
for (const source of ["eq('key', 'start_here_experience')", ".eq('is_public', true)"]) assert.ok(data.includes(source), `missing public page-shell boundary: ${source}`)
for (const source of ["requireAdminUser('content.manage')", "entity_type: 'start_here_experience'", "action: 'start_here_experience.updated'", 'if (auditError)', "revalidatePath('/start-here')"]) assert.ok(action.includes(source), `missing page-shell persistence/audit contract: ${source}`)
assert.ok(editor.includes('saveStartHereExperience') && !editor.includes('quiz_'), 'settings editor must control only the page shell, not bypass assessment versioning')
assert.ok(!editor.includes('JSON.stringify'), 'page-shell Admin must not expose raw JSON')
assert.ok(page.includes('getStartHereContent()') && page.includes('getPublishedGuidedAssessment()'), 'public page must combine the governed shell with the published assessment pointer')
console.log('verify:start-here-cms-local passed — structured page shell, safe links, audit and versioned-assessment handoff verified')
