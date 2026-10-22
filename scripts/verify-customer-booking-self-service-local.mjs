import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseCairoLocalDateTime } from '../src/lib/booking/cairo-time.ts'

const read = (path) => readFileSync(path, 'utf8')
const migration = read('supabase/migrations/069_governed_customer_booking_self_service_local_only.sql')
const actions = read('src/lib/actions/booking-customer.ts')
const ui = read('src/components/booking/CustomerBookingActions.tsx')
const calendar = read('src/app/dashboard/bookings/[id]/calendar/route.ts')

for (const token of [
  'revoke insert, update, delete on table public.booking_reschedule_requests from anon, authenticated',
  'revoke insert, update, delete on table public.booking_events from anon, authenticated',
  'revoke all on function public.cancel_my_booking(uuid,text)',
  'revoke all on function public.request_booking_reschedule(uuid,timestamptz,text)',
  'public.cancel_customer_booking_governed',
  'public.request_customer_booking_reschedule_governed',
  "set search_path = ''",
  'where id = p_booking_id and user_id = p_actor_id',
  "v_booking.status not in ('pending', 'confirmed')",
  "v_policy->>'cancellation_notice_hours'",
  "v_policy->>'reschedule_notice_hours'",
  'public.booking_slot_is_available',
  "'booking.customer_cancelled'",
  "'booking.customer_reschedule_requested'",
  "'reasonLength', char_length(v_reason)",
  "jsonb_build_object('outcome', 'existing'",
  'to service_role',
]) assert.ok(migration.includes(token), `missing governed customer booking contract: ${token}`)
for (const privateAudit of ["jsonb_build_object('reason'", "'reason', v_reason"])
  assert.ok(!migration.includes(privateAudit), `customer reason must not be copied into event/audit metadata: ${privateAudit}`)
assert.ok(
  migration.indexOf('update public.bookings') < migration.indexOf("'booking.customer_cancelled'"),
  'cancellation effects and audit must remain one ordered transaction',
)
assert.ok(
  migration.indexOf('insert into public.booking_reschedule_requests') < migration.indexOf("'booking.customer_reschedule_requested'"),
  'reschedule request and audit must remain one ordered transaction',
)

for (const rpc of ["rpc('cancel_customer_booking_governed'", "rpc('request_customer_booking_reschedule_governed'"])
  assert.ok(actions.includes(rpc), `customer booking action must use governed RPC: ${rpc}`)
for (const retired of ["rpc('cancel_my_booking'", "rpc('request_booking_reschedule'"])
  assert.ok(!actions.includes(retired), `customer booking action must not call retired RPC: ${retired}`)
assert.ok(actions.includes('hasSupabaseServerSecret()') && actions.includes('isUuid(bookingId)'), 'customer booking actions require server capability and validated identifiers')
assert.ok(actions.includes('parseCairoLocalDateTime(proposedStartsAt)') && actions.includes('safeReason'), 'Cairo wall time and bounded private reason must be normalized server-side')

assert.equal(parseCairoLocalDateTime('2026-01-15T12:00')?.toISOString(), '2026-01-15T10:00:00.000Z', 'winter Cairo offset must be +02:00')
assert.equal(parseCairoLocalDateTime('2026-07-15T12:00')?.toISOString(), '2026-07-15T09:00:00.000Z', 'summer Cairo offset must be +03:00')
for (const invalid of ['2026-02-30T12:00', '2026-07-15 12:00', 'not-a-date'])
  assert.equal(parseCairoLocalDateTime(invalid), null, `invalid Cairo wall time accepted: ${invalid}`)

assert.ok(ui.includes('maxLength={1000}') && ui.includes('بتوقيت القاهرة'), 'customer form must expose reason and timezone contracts')
assert.ok(ui.includes("role={message.ok?'status':'alert'}") && ui.includes('disabled={busy}'), 'customer booking failures must be announced and repeated controls disabled')

for (const token of [
  'isUuid(id)',
  'if (error) return privateResponse',
  "'cache-control': 'private, no-store'",
  "'referrer-policy': 'no-referrer'",
  "'x-content-type-options': 'nosniff'",
  'STATUS:${tentative',
  'foldIcsLine',
  'TextEncoder',
  'UID:booking-${booking.id}@hebaelsherif.com',
]) assert.ok(calendar.includes(token), `missing private ICS contract: ${token}`)

console.log('verify:customer-booking-self-service-local passed — explicit ownership, atomic cancellation/reschedule, Cairo DST conversion, minimized evidence and private RFC-aware ICS verified')
