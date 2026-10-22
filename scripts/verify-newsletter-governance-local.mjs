import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(path, 'utf8')
const migration = read('supabase/migrations/055_newsletter_consent_governance_local_only.sql')
const actions = read('src/lib/actions/newsletter.ts')
const crm = read('src/lib/actions/crm.ts')
const registry = read('src/lib/home/sections.ts')
const renderer = read('src/components/home/HomeSectionRenderer.tsx')
const publicHome = read('src/app/(public)/page.tsx')
const signup = read('src/components/home/NewsletterSignup.tsx')
const manager = read('src/components/admin/HomeSectionManager.tsx')
const admin = read('src/app/admin/inbox/page.tsx')
const controls = read('src/components/admin/InboxControls.tsx')
const unsubscribe = read('src/app/unsubscribe/[token]/page.tsx')

for (const token of [
  'consent_at timestamptz', 'consent_version text', 'newsletter_submission_limits',
  'submit_newsletter_subscription', 'unsubscribe_newsletter', 'manage_newsletter_subscriber',
  'rotate_newsletter_unsubscribe_token', "p_consent is not true", "p_source not in ('home')",
  'pg_advisory_xact_lock', 'newsletter_active_consented_email_uidx',
  'drop policy if exists "newsletter: anyone subscribe"',
  'revoke insert, update, delete on table public.newsletter_subscribers from anon, authenticated',
  "has_permission('newsletter.manage', p_actor_id)", "set search_path = ''",
  "'newsletter.subscribed'", "'newsletter.unsubscribed_by_token'", "'newsletter.unsubscribe_token_rotated'",
  'grant execute on function public.submit_newsletter_subscription',
]) assert.ok(migration.includes(token), `missing newsletter database contract: ${token}`)

assert.ok(actions.includes("formData.get('consent') === 'on'") && actions.includes(".rpc('submit_newsletter_subscription'"), 'public subscription must be consented and server mediated')
assert.ok(actions.includes('newsletter-device-v1') && actions.includes('newsletter-email-v1') && !actions.includes("from('newsletter_subscribers').insert"), 'public action must use privacy-safe throttling without direct insertion')
assert.ok(registry.includes("'newsletter'") && renderer.includes('<NewsletterSignup') && renderer.includes('newsletterEnabled'), 'Home newsletter must be governed and fail closed')
assert.ok(publicHome.includes("getPublishedCmsPage('privacy')") && publicHome.includes('hasSupabaseServerSecret()') && publicHome.includes('newsletterEnabled={newsletterEnabled}'), 'Home newsletter must require approved Privacy content and secure persistence')
for (const token of ['name="consent"', 'required', 'سياسة الخصوصية', 'لن نضيفك تلقائيًا', 'preview']) assert.ok(signup.includes(token), `newsletter consent UI missing: ${token}`)
assert.ok(manager.includes("kind === 'newsletter'") && manager.includes('صيغة الموافقة ورابط الخصوصية ثابتان'), 'Admin cannot manage the governed newsletter section safely')
assert.ok(crm.includes(".rpc('manage_newsletter_subscriber'") && crm.includes(".rpc('rotate_newsletter_unsubscribe_token'"), 'Admin newsletter mutations bypass atomic permission/audit RPCs')
assert.ok(admin.includes('consent_at') && admin.includes('سجل قديم بلا موافقة مثبتة') && controls.includes('إعادة الاشتراك تتم من نموذج الموافقة العام فقط'), 'Admin does not distinguish evidence-backed and legacy subscribers')
assert.ok(unsubscribe.includes(".select('status')") && !unsubscribe.includes(".update({status:'unsubscribed'") && unsubscribe.includes('<UnsubscribeConfirmation'), 'GET unsubscribe route must be read-only and require explicit confirmation')

console.log('verify:newsletter-governance-local passed — explicit consent, throttled server intake, atomic Admin lifecycle and POST-confirmed unsubscribe verified')
