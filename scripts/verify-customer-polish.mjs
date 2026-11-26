import assert from 'node:assert/strict'
import { brandColors } from '../src/styles/tokens.ts'
import { getSupabasePublicKey, hasSupabasePublicConfig } from '../src/lib/supabase/public-key.ts'
import { getSupabaseServerKey } from '../src/lib/supabase/server-key.ts'
import { defaultGuidedAssessmentContent as content } from '../src/lib/assessments/governance.ts'
import { scoreAssessmentResults } from '../src/lib/assessments/scoring.ts'
import { SUPABASE_PUBLIC_ENV_NAMES } from './public-config.mjs'
import { adminLoginPrerequisites } from './admin-login-prerequisites.mjs'

const [urlName, newPublicName, legacyPublicName] = SUPABASE_PUBLIC_ENV_NAMES
const names = [...SUPABASE_PUBLIC_ENV_NAMES,'SUPABASE_SECRET_KEY','SUPABASE_SERVICE_ROLE_KEY']
const before = names.map(name => process.env[name])
try {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
  process.env[newPublicName] = ''
  process.env[legacyPublicName] = ' legacy-public '
  process.env.SUPABASE_SECRET_KEY = ' '
  process.env.SUPABASE_SERVICE_ROLE_KEY = ' legacy-server '
  assert.equal(getSupabasePublicKey(), 'legacy-public')
  assert.equal(hasSupabasePublicConfig(), true)
  assert.equal(getSupabaseServerKey(), 'legacy-server')
  process.env[newPublicName] = 'new-public'
  process.env.SUPABASE_SECRET_KEY = 'new-server'
  assert.equal(getSupabasePublicKey(), 'new-public')
  assert.equal(getSupabaseServerKey(), 'new-server')
  process.env[legacyPublicName] = ''
  process.env[newPublicName] = ' '
  assert.equal(hasSupabasePublicConfig(), false)
} finally { names.forEach((name, index) => { if (before[index] === undefined) delete process.env[name]; else process.env[name] = before[index] }) }
assert.deepEqual(scoreAssessmentResults(content, {}), [])
const answers = Object.fromEntries(content.questions.map((q, index) => [q.key, q.options[index].key]))
assert.deepEqual(scoreAssessmentResults(content, answers).map(x => x.key), ['session','course','book'])
for (const question of content.questions) answers[question.key] = question.options[1].key
assert.deepEqual(scoreAssessmentResults(content, answers).map(x => x.key), ['course'])
answers[content.questions[0].key] = 'unknown'
assert.deepEqual(scoreAssessmentResults(content, answers), [])
const weighted = structuredClone(content)
weighted.questions[0].options[0].weight = 3
const split = Object.fromEntries(weighted.questions.map((q, index) => [q.key, q.options[index].key]))
assert.deepEqual(scoreAssessmentResults(weighted, split).map(x => x.key), ['session'])
assert.equal(adminLoginPrerequisites({}).length, 4)
assert.deepEqual(adminLoginPrerequisites({ [urlName]:'https://example.supabase.co', [legacyPublicName]:'public', SUPABASE_SECRET_KEY:'', SUPABASE_SERVICE_ROLE_KEY:'legacy', OWNER_ADMIN_EMAIL:'owner@example.com' }), [])
function luminance(hex) {
  const channels = [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)/255).map(c => c <= .04045 ? c/12.92 : ((c+.055)/1.055)**2.4)
  return channels.reduce((sum, c, i) => sum + c * [.2126,.7152,.0722][i],0)
}
for (const foreground of [brandColors.textSoft,brandColors.deepTeal,brandColors.burgundy,brandColors.ink]) {
  for (const background of [brandColors.ivory,brandColors.softWhite]) {
    const [low, high] = [luminance(foreground),luminance(background)].sort((a,b) => a-b)
    assert.ok((high+.05)/(low+.05) >= 4.5, 'Body text must remain readable on both cream surfaces')
  }
}
console.log('verify:customer-polish passed — key fallback, scoring ties/weights, admin prerequisites and cream-surface text contrast')
