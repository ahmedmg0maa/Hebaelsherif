import { existsSync, readFileSync } from 'node:fs'

const mode = process.argv.find((argument) => argument.startsWith('--mode='))?.slice('--mode='.length) ?? 'source'
const snapshotPath = process.argv.find((argument) => argument.startsWith('--snapshot='))?.slice('--snapshot='.length)
const failures = []

function source(path) {
  if (!existsSync(path)) {
    failures.push(`missing source file: ${path}`)
    return ''
  }
  return readFileSync(path, 'utf8')
}

function requireToken(text, token, label) {
  if (!text.includes(token)) failures.push(`${label}: missing ${token}`)
}

const migrations = [
  '044_booking_operational_workflow_local_only.sql',
  '045_booking_least_privilege_local_only.sql',
  '046_media_governance_local_only.sql',
  '047_legal_content_governance_local_only.sql',
]
const migrationSql = migrations.map((name) => source(`supabase/migrations/${name}`))
const [workflow, hardening, media, legal] = migrationSql

for (const [index, name] of migrations.entries()) {
  if (!migrationSql[index]) failures.push(`migration source is empty: ${name}`)
}

for (const token of [
  'booking_runtime_contract',
  'booking_holds',
  'booking_slot_overrides',
  'create_booking_hold',
  'create_free_booking_from_hold',
  'create_booking_order_from_hold',
  'create_package_booking_from_hold',
  'available_booking_calendar',
]) requireToken(workflow, token, '044 workflow')

for (const token of [
  'revoke all on function public.create_booking_order(uuid,date,time,text,text,text)',
  'revoke all on function public.create_package_booking(uuid,date,time,text,text,text,uuid)',
  'revoke all on function public.booking_service_policy(uuid)',
  'revoke all on function public.booking_slot_is_available(uuid,date,time,uuid,uuid)',
  'from public, anon, authenticated',
  'drop policy if exists "bookings: own create pending"',
  'to service_role',
]) requireToken(hardening, token, '045 least privilege')

requireToken(media, 'alter table public.media_assets', '046 media governance')
requireToken(legal, 'alter table public.pages', '047 legal governance')

if (mode === 'source') {
  if (failures.length) {
    console.error(`verify:booking-staging-contract failed\n- ${failures.join('\n- ')}`)
    process.exit(1)
  }
  console.log('verify:booking-staging-contract passed — source order 044 → 045 → 046 → 047 and the 045 booking privilege closure are ready for an authorized catalog check')
  process.exit(0)
}

if (!['preflight', 'postflight'].includes(mode) || !snapshotPath) {
  console.error('Usage: node scripts/verify-booking-staging-contract.mjs --mode=source | --mode=preflight|postflight --snapshot=<sanitized-read-only-catalog.json>')
  process.exit(2)
}

let snapshot
try {
  snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8'))
} catch {
  console.error('The catalog snapshot is missing or is not valid JSON. It must contain only sanitized metadata, never credentials, signed URLs, or customer data.')
  process.exit(2)
}

const migrationIds = new Set((snapshot.migrationIds ?? []).map(String))
const functions = snapshot.functionGrants ?? {}
const policies = snapshot.policies ?? {}
const rls = snapshot.rls ?? {}
const tables = new Set(snapshot.tables ?? [])
const hasRole = (name, role) => (functions[name] ?? []).includes(role)
const hasPolicy = (table, name) => (policies[table] ?? []).includes(name)

if (snapshot.productionProjectRef !== 'zfbwpubsnuijybxjuidc') failures.push('snapshot does not name the owner-confirmed production ref')
if (!snapshot.projectRef || snapshot.projectRef === 'zfbwpubsnuijybxjuidc') failures.push('snapshot must identify a separately provisioned staging project, never production')
if (snapshot.containsCustomerData === true || snapshot.containsCredentials === true) failures.push('snapshot must not contain customer data or credentials')
if (snapshot.recovery?.verified !== true) failures.push('a verified staging recovery point and restore drill are required before migration verification')

if (mode === 'preflight') {
  for (const required of ['000', '043']) if (!migrationIds.has(required)) failures.push(`preflight migration history is missing ${required}`)
  for (const pending of ['044', '045', '046', '047']) if (migrationIds.has(pending)) failures.push(`preflight is not a clean pre-change snapshot: ${pending} is already applied`)
  if (snapshot.environment !== 'staging') failures.push('preflight must use a separately identified staging environment')
}

if (mode === 'postflight') {
  for (const required of ['043', '044', '045', '046', '047']) if (!migrationIds.has(required)) failures.push(`postflight migration history is missing ${required}`)
  for (const table of ['booking_holds', 'booking_slot_overrides']) if (!tables.has(table)) failures.push(`postflight table missing: ${table}`)
  for (const table of ['booking_holds', 'booking_slot_overrides']) if (rls[table] !== true) failures.push(`postflight RLS is not enabled: ${table}`)

  const deniedLegacy = [
    'create_booking_order(uuid,date,time,text,text,text)',
    'create_package_booking(uuid,date,time,text,text,text,uuid)',
    'booking_service_policy(uuid)',
    'booking_slot_is_available(uuid,date,time,uuid,uuid)',
  ]
  for (const name of deniedLegacy) {
    for (const role of ['anon', 'authenticated', 'public']) {
      if (hasRole(name, role)) failures.push(`postflight unsafe grant remains: ${name} → ${role}`)
    }
    if (!hasRole(name, 'service_role')) failures.push(`postflight service_role recovery grant is missing: ${name}`)
  }
  for (const name of [
    'create_booking_hold(uuid,date,time)',
    'release_my_booking_hold(uuid)',
    'create_free_booking_from_hold(uuid,text,text,text)',
    'create_booking_order_from_hold(uuid,text,text,text)',
    'create_package_booking_from_hold(uuid,text,text,text,uuid)',
  ]) {
    if (!hasRole(name, 'authenticated')) failures.push(`postflight customer hold-aware grant missing: ${name}`)
    for (const role of ['anon', 'public']) if (hasRole(name, role)) failures.push(`postflight unsafe browser grant: ${name} → ${role}`)
  }
  for (const name of ['available_booking_slots(uuid,date)', 'available_booking_calendar(uuid,date,date)', 'booking_runtime_contract()']) {
    if (!hasRole(name, 'anon') || !hasRole(name, 'authenticated')) failures.push(`postflight public discovery grant missing: ${name}`)
  }
  if (hasPolicy('bookings', 'bookings: own create pending')) failures.push('postflight direct pending-booking policy remains')
}

if (failures.length) {
  console.error(`verify:booking-staging-contract ${mode} failed\n- ${failures.join('\n- ')}`)
  process.exit(1)
}
console.log(`verify:booking-staging-contract ${mode} passed — sanitized ${snapshot.environment} catalog matches the required booking migration contract`)
