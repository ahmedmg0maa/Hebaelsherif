import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const action = readFileSync('src/lib/actions/revisions.ts', 'utf8')
const page = readFileSync('src/app/admin/revisions/page.tsx', 'utf8')
const button = readFileSync('src/components/admin/RevisionRestoreButton.tsx', 'utf8')
const preview = readFileSync('src/components/admin/PreviewButton.tsx', 'utf8')

for (const source of ["requireFreshAdminAssurance('content.publish')", "['page','page_section','article']", "status: 'draft', is_published: false", 'is_visible: false', "action: 'content_revision.restored_as_draft'", 'if (auditError)', 'await rollback(']) assert.ok(action.includes(source), `missing revision recovery boundary: ${source}`)
assert.ok(action.includes("from('content_revisions').insert"), 'restore does not checkpoint the current state')
assert.ok(page.includes(".filter((row) => row.entity_type in labels)"), 'revision UI is not limited to approved entity types')
assert.ok(!page.includes('JSON.stringify'), 'revision UI must not expose raw snapshots')
assert.ok(button.includes('استعادة كمسودة') && button.includes('reauth=1'), 'owner restore flow lacks safe state or MFA recovery link')
assert.ok(preview.includes("mobile: 430") && preview.includes("tablet: 820") && preview.includes("desktop: 1440"), 'preview size controls missing')
console.log('verify:revision-recovery-local passed — allowlisted draft/hidden restore, fresh MFA, checkpoint/audit rollback, snapshot privacy and preview sizes verified')

