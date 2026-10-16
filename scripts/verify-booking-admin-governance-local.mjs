import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(path, 'utf8')
const migration = read('supabase/migrations/061_atomic_booking_admin_governance_local_only.sql')
const bookingActions = read('src/lib/actions/booking-admin.ts')
const adminActions = read('src/lib/actions/admin-control.ts')
const legacyActions = read('src/lib/actions/cms.ts')
const bookingPage = read('src/app/admin/bookings/page.tsx')
const bookingEditor = read('src/components/admin/BookingEditor.tsx')
const adminControls = read('src/components/admin/AdminControls.tsx')

for (const token of [
  "public.has_permission('bookings.manage', p_actor_id)",
  "public.has_permission('availability.manage', p_actor_id)",
  "set search_path = ''",
  'for update',
  "pg_advisory_xact_lock(",
  "public.booking_slot_is_available(",
  'booking_status_transition_invalid',
  "'admin.booking_updated'",
  "'booking.updated'",
  "'availability.window_created'",
  "'availability.exception_upserted'",
  "'availability.slot_override_upserted'",
  'revoke update on table public.bookings from anon, authenticated',
  'revoke insert, update, delete on table public.availability_rules from anon, authenticated',
  'revoke insert, update, delete on table public.availability_exceptions from anon, authenticated',
  'revoke insert, update, delete on table public.booking_slot_overrides from anon, authenticated',
  'grant execute on function public.admin_update_booking_governed',
  'grant execute on function public.resolve_booking_reschedule_governed',
]) assert.ok(migration.includes(token), `missing booking Admin governance contract: ${token}`)

assert.ok(
  migration.includes('revoke all on function public.admin_update_booking(uuid, timestamptz, timestamptz, text, text, text, text)')
    && migration.includes('revoke all on function public.resolve_booking_reschedule(uuid, boolean, text)'),
  'the auth.uid()-based 044 Admin entry points must be retired',
)
assert.ok(
  migration.indexOf('select * into v_booking from public.bookings where id = p_booking_id for update')
    < migration.indexOf('update public.bookings\n     set starts_at = p_starts_at'),
  'booking updates must lock the business row before mutation',
)
assert.ok(
  migration.includes("v_booking.status = 'pending' and v_status in ('pending', 'confirmed', 'cancelled')")
    && migration.includes("v_booking.status = 'confirmed' and v_status in ('confirmed', 'completed', 'cancelled', 'no_show')"),
  'booking state transitions must be explicit',
)
assert.ok(
  !migration.includes("jsonb_build_object('note'")
    && !migration.includes("jsonb_build_object('reason'")
    && migration.includes("'adminNotePresent', v_note <> ''")
    && migration.includes("'reasonPresent', v_reason <> ''"),
  'private notes/reasons must be represented only by metadata booleans in evidence',
)
assert.ok(
  migration.includes('admin_notes = v_admin_notes') && !migration.includes('customer_notes ='),
  'Admin booking updates must preserve customer-authored notes',
)

for (const rpc of [
  "rpc('admin_upsert_availability_exception'",
  "rpc('admin_upsert_booking_slot_override'",
  "rpc('admin_delete_booking_slot_override'",
  "rpc('admin_delete_availability_exception'",
  "rpc('admin_create_availability_window'",
  "rpc('admin_delete_availability_window'",
  "rpc('resolve_booking_reschedule_governed'",
]) assert.ok(bookingActions.includes(rpc), `Admin action must use governed RPC: ${rpc}`)

assert.ok(adminActions.includes("rpc('admin_update_booking_governed'") && adminActions.includes('p_actor_id: admin.id'), 'booking editor action must pass the explicit Admin actor')
assert.ok(!bookingActions.includes(".from('availability_rules')") && !bookingActions.includes(".from('availability_exceptions')") && !bookingActions.includes(".from('booking_slot_overrides')"), 'availability actions must not split direct mutation from audit')
assert.ok(!legacyActions.includes('setBookingStatus') && !adminControls.includes('BookingControls') && !bookingPage.includes('BookingControls'), 'legacy split-write booking controls must be removed')
assert.ok(!bookingEditor.includes('name="customer_notes"') && bookingEditor.includes('للقراءة فقط'), 'customer notes must be visible but immutable in Admin')
assert.ok(!bookingEditor.includes('name="ends_at"') && bookingEditor.includes('تُحسب نهاية الجلسة تلقائيًا'), 'booking duration must come from the governed service definition')
assert.ok(bookingEditor.includes('ActionFeedback') && readFileSync('src/components/admin/ActionFeedback.tsx', 'utf8').includes("feedback.ok ? 'status' : 'alert'"), 'Admin booking feedback must distinguish success from errors accessibly')

console.log('verify:booking-admin-governance-local passed — explicit actors, atomic booking/availability evidence, state transitions, immutable customer notes and governed Admin UI verified')
