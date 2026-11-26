import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { defaultGuidedAssessmentContent as content } from '../src/lib/assessments/governance.ts'
import { scoreAssessment } from '../src/lib/assessments/scoring.ts'
import { HERO_FIELDS, defaultHomeCopy, heroCopyFromForm, normalizeHomeCopy } from '../src/lib/home/hero.ts'
import { readingMinutes, publicArticleCover, articleDate } from '../src/lib/articles/presentation.ts'

let combinations = 0
for (const a of content.questions[0].options) for (const b of content.questions[1].options) for (const c of content.questions[2].options) {
  const chosen = [a, b, c]
  const answers = Object.fromEntries(content.questions.map((q, index) => [q.key, chosen[index].key]))
  const expected = content.results.map((r, order) => ({ result: r, order, score: chosen.filter((option) => option.resultKey === r.key).reduce((sum, option) => sum + option.weight, 0) })).sort((x, y) => y.score - x.score || x.order - y.order)[0].result
  const before = JSON.stringify(answers)
  assert.deepEqual(scoreAssessment(content, answers), expected)
  assert.equal(JSON.stringify(answers), before)
  combinations++
}
assert.equal(combinations, 27)
assert.equal(scoreAssessment(content, {}), null)
assert.equal(scoreAssessment(content, { current_need: 'unknown' }), null)
const tied = structuredClone(content)
tied.questions = tied.questions.slice(0, 2)
tied.questions[0].options[0].weight = 1
tied.questions[1].options[1].weight = 1
const tieAnswers = { [tied.questions[0].key]: tied.questions[0].options[0].key, [tied.questions[1].key]: tied.questions[1].options[1].key }
assert.equal(scoreAssessment(tied, tieAnswers).key, 'session')
tied.results.reverse()
assert.equal(scoreAssessment(tied, tieAnswers).key, 'course')
for (const count of [2, 3, 4, 5, 6]) {
  const dynamic = structuredClone(content)
  dynamic.questions = Array.from({ length: count }, (_, index) => ({ ...structuredClone(content.questions[index % 3]), key: `question_${index}` }))
  const answers = Object.fromEntries(dynamic.questions.map((q) => [q.key, q.options[0].key]))
  assert.equal(scoreAssessment(dynamic, answers).key, 'session')
  delete answers[dynamic.questions.at(-1).key]
  assert.equal(scoreAssessment(dynamic, answers), null)
}

const form = new FormData()
for (const [key, , field] of HERO_FIELDS) form.set(field, defaultHomeCopy[key])
assert.deepEqual(heroCopyFromForm(form), defaultHomeCopy)
form.set('lead', 'أ'.repeat(321)); assert.equal(heroCopyFromForm(form), null)
form.set('lead', '<script>bad</script>'); assert.equal(heroCopyFromForm(form), null)
assert.equal(normalizeHomeCopy({ lead: ['bad'] }).lead, defaultHomeCopy.lead)
assert.equal(normalizeHomeCopy({ eyebrow: 'نص خاص' }).eyebrow, 'نص خاص')
assert.equal(readingMinutes(''), 1)
assert.equal(readingMinutes(Array(181).fill('كلمة').join(' ')), 2)
assert.equal(articleDate('not-a-date'), null)
assert.equal(publicArticleCover('javascript:alert(1)'), null)
assert.equal(publicArticleCover('https://x.supabase.co/storage/v1/object/public/private/x.jpg'), null)
assert.equal(publicArticleCover('https://user:pass@x.supabase.co/storage/v1/object/public/public-media/x.jpg'), null)
assert.ok(publicArticleCover('https://x.supabase.co/storage/v1/object/public/public-media/x.webp'))

const read = (path) => readFileSync(path, 'utf8')
const migration = read('supabase/migrations/082_master_v2_home_content_local_only.sql')
for (const contract of ['master_v2_home_content_valid', 'home_section_kind_immutable', 'published_home_required_section', "'content.manage'", "'content.delete'", 'pg_advisory_xact_lock', 'insert into public.content_revisions', 'insert into public.audit_logs', 'to service_role', "'manifesto','quote'", 'between 3 and 4']) assert.ok(migration.includes(contract), contract)
assert.ok(read('src/app/(public)/page.tsx').includes('getPublishedGuidedAssessment()'))
assert.ok(read('src/components/home/HomeSectionRenderer.tsx').includes('normalizeHomeCopy(section.content, copy)'))
assert.ok(read('src/components/layout/PublicHeader.tsx').includes('dialog.showModal()'))
assert.ok(!read('src/components/layout/PublicFooter.tsx').includes('BotanicalSpray'))
assert.ok(read('src/proxy.ts').includes("requestHeaders.set('Content-Security-Policy'"))
console.log(`verify:master-v2-local passed — ${combinations} scoring combinations, tie rules, copy validation, article metadata, CMS source contracts. Not database/browser execution.`)
