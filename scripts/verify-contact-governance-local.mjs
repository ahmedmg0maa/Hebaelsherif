import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { normalizeContactInput } from '../src/lib/contact/intake.ts'

const migration = readFileSync('supabase/migrations/048_contact_intake_governance_local_only.sql', 'utf8')
const action = readFileSync('src/lib/actions/contact.ts', 'utf8')
const page = readFileSync('src/app/(public)/contact/page.tsx', 'utf8')
const form = readFileSync('src/components/contact/ContactForm.tsx', 'utf8')
const crm = readFileSync('src/lib/actions/crm.ts', 'utf8')
const inbox = readFileSync('src/app/admin/inbox/page.tsx', 'utf8')

for (const contract of [
  'drop policy if exists "contact: anyone insert"',
  'revoke insert on table public.contact_messages from anon, authenticated',
  'create table if not exists public.contact_submission_limits',
  'alter table public.contact_submission_limits enable row level security',
  "scope in ('device', 'email')",
  "on conflict (scope, key_hash, window_started_at)",
  'v_device_hits > 5 or v_email_hits > 3',
  "'contact_message.received'",
  "jsonb_build_object('purpose', p_purpose, 'source', 'public_contact_form')",
  "public.has_permission('inbox.manage', p_actor_id)",
  "'inbox.message_managed'",
  "'noteAdded', v_note is not null",
  "'replyDelivery', v_delivery_status",
]) assert.ok(migration.includes(contract), `missing contact database contract: ${contract}`)

assert.match(migration, /revoke all on function public\.submit_contact_message[\s\S]+from public, anon, authenticated/)
assert.match(migration, /grant execute on function public\.submit_contact_message[\s\S]+to service_role/)
assert.match(migration, /revoke all on function public\.manage_contact_message[\s\S]+from public, anon, authenticated/)
assert.match(migration, /grant execute on function public\.manage_contact_message[\s\S]+to service_role/)
assert.ok(!migration.includes("'note', v_note") && !migration.includes("'reply', v_reply"), 'PII/message content leaked into audit metadata')

for (const contract of ['privacySafeFingerprints', "rpc('submit_contact_message'", 'hasSupabaseServerSecret', "formData.get('website')"]) {
  assert.ok(action.includes(contract), `missing server-action contract: ${contract}`)
}
assert.ok(page.includes("dynamic = 'force-dynamic'") && page.includes('<ContactForm'), 'contact route is not runtime-configured through the governed form')
assert.ok(!page.includes('getBrowserClient') && !form.includes("from('contact_messages')"), 'contact UI still writes directly to Supabase')
assert.ok(form.includes('privacy_consent') && form.includes('/privacy') && form.includes('CONTACT_PURPOSES'), 'contact UI lacks consent or governed purpose options')
assert.ok(crm.includes("rpc('manage_contact_message'") && !crm.includes('meta: { ...input'), 'Admin inbox mutation is not atomic/PII-minimized')
assert.ok(inbox.includes('privacy_consent_at') && inbox.includes('CONTACT_PURPOSE_LABELS'), 'Admin inbox does not consume consent/purpose data')

function submission(overrides = {}) {
  const values = {
    name: 'هبة',
    email: ' Customer@Example.com ',
    phone: '+20 100 000 0000',
    purpose: 'booking',
    message: 'أحتاج إلى معرفة الموعد المناسب للحجز.',
    privacy_consent: 'on',
    ...overrides,
  }
  const data = new FormData()
  for (const [key, value] of Object.entries(values)) data.set(key, value)
  return data
}

const valid = normalizeContactInput(submission())
assert.equal(valid.ok, true)
if (valid.ok) {
  assert.equal(valid.value.email, 'customer@example.com')
  assert.equal(valid.value.purpose, 'booking')
}
assert.equal(normalizeContactInput(submission({ purpose: 'admin' })).ok, false)
assert.equal(normalizeContactInput(submission({ privacy_consent: '' })).ok, false)
assert.equal(normalizeContactInput(submission({ message: 'قصير' })).ok, false)
assert.equal(normalizeContactInput(submission({ email: 'not-an-email' })).ok, false)

console.log('verify:contact-governance-local passed — server-only intake, atomic dual-scope throttling, consent, Admin permission/audit and PII-minimized contracts verified')
