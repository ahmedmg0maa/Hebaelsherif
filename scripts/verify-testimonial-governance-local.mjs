import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { normalizeReviewSubmission } from '../src/lib/reviews/governance.ts'

const migration = readFileSync('supabase/migrations/049_testimonial_consent_governance_local_only.sql', 'utf8')
const actions = readFileSync('src/lib/actions/reviews.ts', 'utf8')
const customerForm = readFileSync('src/components/dashboard/VerifiedReviewForm.tsx', 'utf8')
const admin = readFileSync('src/app/admin/reviews/page.tsx', 'utf8')
const controls = readFileSync('src/components/admin/ReviewControls.tsx', 'utf8')
const publicPage = readFileSync('src/app/(public)/testimonials/page.tsx', 'utf8')
const publicData = readFileSync('src/lib/data/testimonials.ts', 'utf8')
const homeData = readFileSync('src/lib/data/home.ts', 'utf8')

for (const contract of [
  'publication_consent_at',
  'source_reference_id',
  "source_type in ('purchase', 'booking')",
  "and o.status = 'paid'",
  "'review.submitted'",
  "public.has_permission('reviews.manage', p_actor_id)",
  "p_action not in ('approve', 'reject', 'archive', 'restore', 'feature', 'unfeature', 'respond')",
  "message = 'review_publication_evidence_required'",
  "'review.' || p_action",
]) assert.ok(migration.includes(contract), `missing testimonial database contract: ${contract}`)

assert.match(migration, /status = 'approved'[\s\S]*verified_purchase[\s\S]*publication_consent_at is not null/, 'public RLS does not require approval, verification and consent')
assert.match(migration, /revoke all on function public\.manage_review[\s\S]*from public, anon, authenticated/)
assert.match(migration, /grant execute on function public\.manage_review[\s\S]*to service_role/)
assert.ok(!migration.includes("'comment',") && !migration.includes("'displayName',"), 'testimonial text or identity leaked into audit metadata')

for (const contract of ['normalizeReviewSubmission', 'p_publication_consent', "rpc('manage_review_v2'", "requirePermission('reviews.manage')"]) {
  assert.ok(actions.includes(contract), `missing testimonial action contract: ${contract}`)
}
assert.ok(customerForm.includes('publication_consent') && customerForm.includes('display_name_consent') && customerForm.includes('/privacy'), 'customer review form lacks separate publication/name consent')
assert.ok(admin.includes('publication_consent_at') && admin.includes('source_reference_id') && admin.includes('verified_at'), 'Admin review evidence is incomplete')
assert.ok(controls.includes("moderate(featured ? 'unfeature' : 'feature')") && !controls.includes("adminSetField('reviews'"), 'feature control bypasses atomic review RPC')
assert.ok(publicPage.includes('listPublicTestimonials') && publicPage.includes('شراء موثّق'), 'dedicated public testimonial consumer is missing')
for (const source of [publicData, homeData]) {
  assert.ok(source.includes(".eq('verified_purchase', true)") && source.includes(".not('publication_consent_at', 'is', null)"), 'public testimonial query lacks verification/consent filter')
}

const base = {
  productId: '11111111-1111-4111-8111-111111111111',
  rating: 5,
  comment: 'تجربة واضحة ومفيدة استحقت المشاركة.',
  displayNameConsent: false,
  publicationConsent: true,
}
assert.equal(normalizeReviewSubmission(base).ok, true)
assert.equal(normalizeReviewSubmission({ ...base, productId: 'not-a-uuid' }).ok, false)
assert.equal(normalizeReviewSubmission({ ...base, rating: 6 }).ok, false)
assert.equal(normalizeReviewSubmission({ ...base, comment: 'قصير' }).ok, false)
assert.equal(normalizeReviewSubmission({ ...base, publicationConsent: false }).ok, false)

console.log('verify:testimonial-governance-local passed — paid-source verification, separate consent, atomic moderation, PII-safe audit and public/Admin consumers verified')
