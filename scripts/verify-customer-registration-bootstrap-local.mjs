import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(path, 'utf8')
const migration = read('supabase/migrations/070_governed_customer_registration_bootstrap_local_only.sql')
const registration = read('src/app/(public)/auth/register/page.tsx')

for (const token of [
  'create or replace function public.handle_new_user()',
  "set search_path = ''",
  'profiles_full_name_shape',
  'profiles_email_shape',
  'not valid',
  "char_length(v_full_name) not between 2 and 120",
  "v_full_name ~ '[[:cntrl:]]'",
  'char_length(v_email) > 320',
  'on conflict (id) do nothing',
  "'customer.registered'",
  "'profileCreated', true",
  "'nameAccepted', v_full_name <> ''",
  'revoke all on function public.handle_new_user() from public, anon, authenticated',
]) assert.ok(migration.toLowerCase().includes(token.toLowerCase()), `missing registration bootstrap contract: ${token}`)

const functionBody = migration.slice(migration.indexOf('create or replace function public.handle_new_user()'))
assert.ok(!/insert\s+into\s+public\.admin_roles/i.test(functionBody), 'registration trigger must never grant an Admin role')
assert.ok(!/heba0elsherif|admin_login_email|owner_email/i.test(functionBody), 'registration trigger must not contain an owner identity')
for (const privateAuditField of ["'fullName'", "'email'", "'rawMetadata'"])
  assert.ok(!migration.includes(privateAuditField), `identity content must not enter registration audit: ${privateAuditField}`)
assert.ok(
  migration.indexOf('insert into public.profiles') < migration.indexOf("'customer.registered'"),
  'profile creation and minimized audit must remain one ordered trigger transaction',
)

for (const token of [
  'fullName.length < 2',
  'fullName.length > 120',
  'email.length > 320',
  'minLength={2}',
  'maxLength={120}',
  'maxLength={320}',
  'data: { full_name: fullName }',
  '/auth/callback?next=/dashboard',
  'role="status"',
]) assert.ok(registration.includes(token), `registration UI contract missing: ${token}`)
assert.ok(!registration.includes('admin_roles') && !registration.includes('service_role'), 'registration client must not contain an Admin or privileged path')

console.log('verify:customer-registration-bootstrap-local passed — bounded profile bootstrap, minimized audit, least privilege and no signup-based Admin grant verified')
