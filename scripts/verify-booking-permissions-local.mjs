import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const migration044 = 'supabase/migrations/044_booking_operational_workflow_local_only.sql'
const migration045 = 'supabase/migrations/045_booking_least_privilege_local_only.sql'
assert(existsSync(migration044), 'migration 044 missing')
assert(existsSync(migration045), 'migration 045 missing')

const workflow = readFileSync(migration044, 'utf8').toLowerCase().replace(/\s+/g, ' ')
const hardening = readFileSync(migration045, 'utf8').toLowerCase().replace(/\s+/g, ' ')

const mustContain = (sql, value, message) => assert(sql.includes(value.toLowerCase().replace(/\s+/g, ' ')), message)

// Anonymous discovery is deliberately time-only and non-mutating.
for (const signature of [
  'booking_runtime_contract() to anon, authenticated',
  'available_booking_slots(uuid,date) to anon,authenticated',
  'available_booking_calendar(uuid,date,date) to anon,authenticated',
]) mustContain(workflow, signature, `missing public discovery grant: ${signature}`)

// Authenticated customers enter only through hold-aware mutations.
for (const signature of [
  'create_booking_hold(uuid,date,time) to authenticated',
  'release_my_booking_hold(uuid) to authenticated',
  'create_free_booking_from_hold(uuid,text,text,text) to authenticated',
  'create_booking_order_from_hold(uuid,text,text,text) to authenticated',
  'create_package_booking_from_hold(uuid,text,text,text,uuid) to authenticated',
  'request_booking_reschedule(uuid,timestamptz,text) to authenticated',
]) mustContain(workflow, signature, `missing authenticated hold-aware grant: ${signature}`)

// Admin RPCs can be reached by authenticated JWTs but enforce bookings.manage
// inside the SECURITY DEFINER body; anonymous callers are explicitly revoked.
for (const signature of [
  "not public.has_permission('bookings.manage')",
  'resolve_booking_reschedule(uuid,boolean,text) from public,anon',
  'admin_update_booking(uuid,timestamptz,timestamptz,text,text,text,text) from public,anon',
]) mustContain(workflow, signature, `missing admin denial boundary: ${signature}`)

// Regression gate for the exact production findings from the 2026-08-20
// read-only preflight.
for (const signature of [
  'create_booking_order(uuid,date,time,text,text,text) from public, anon, authenticated',
  'create_package_booking(uuid,date,time,text,text,text,uuid) from public, anon, authenticated',
  'booking_service_policy(uuid) from public, anon, authenticated',
  'booking_slot_is_available(uuid,date,time,uuid,uuid) from public, anon, authenticated',
  'drop policy if exists "bookings: own create pending" on public.bookings',
]) mustContain(hardening, signature, `least-privilege regression: ${signature}`)

for (const signature of [
  'create_booking_order(uuid,date,time,text,text,text) to service_role',
  'create_package_booking(uuid,date,time,text,text,text,uuid) to service_role',
  'booking_service_policy(uuid) to service_role',
  'booking_slot_is_available(uuid,date,time,uuid,uuid) to service_role',
]) mustContain(hardening, signature, `missing controlled service grant: ${signature}`)

assert(!/grant execute on function public\.create_booking_order\([^;]+to (?:anon|authenticated)/.test(hardening), 'legacy booking RPC was re-granted to a browser role')
assert(!/grant execute on function public\.booking_(?:service_policy|slot_is_available)\([^;]+to (?:anon|authenticated)/.test(hardening), 'internal booking helper was exposed to a browser role')

console.log('verify:booking-permissions-local passed — anon discovery only; authenticated hold paths; admin in-body permission checks; legacy/direct bypasses revoked')

