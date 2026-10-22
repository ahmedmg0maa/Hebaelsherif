import { existsSync } from 'node:fs'
import { read, report } from './lib.mjs'
const failures=[]
const migration='supabase/migrations/026_booking_windows_credits.sql'
if(!existsSync(migration))failures.push('booking windows/credit migration missing')
else{const sql=read(migration);for(const token of ['guard_availability_window_overlap','subscription_credit_ledger','adjust_subscription_credits','for update'])if(!sql.includes(token))failures.push(`booking migration missing ${token}`)}
if(!read('src/components/admin/AvailabilityManager.tsx').includes('saveAvailabilityWindow'))failures.push('multiple-window admin UI missing')
if(!read('src/components/admin/MembershipManager.tsx').includes('SubscriptionCreditControl'))failures.push('credit ledger admin control missing')
if(!existsSync('supabase/migrations/027_package_booking.sql')||!(read('src/lib/actions/booking.ts').includes("rpc('complete_booking_hold_v2'") && read('src/lib/actions/booking.ts').includes("input.subscriptionId ? 'package'") && read('src/lib/actions/booking.ts').includes("requestOnly?'request':'paid'")))failures.push('package-backed booking flow missing')
if(!existsSync('supabase/migrations/028_credit_idempotency_lock.sql')||!read('supabase/migrations/028_credit_idempotency_lock.sql').includes('pg_advisory_xact_lock'))failures.push('credit idempotency lock missing')
const operational='supabase/migrations/044_booking_operational_workflow_local_only.sql'
if(!existsSync(operational))failures.push('operational booking migration missing')
else{const sql=read(operational);for(const token of ['booking_holds','create_booking_hold','create_free_booking_from_hold','create_booking_order_from_hold','create_package_booking_from_hold','available_booking_calendar','booking_runtime_contract','booking_slot_overrides','resolve_booking_reschedule','admin_update_booking','revoke execute on function public.create_package_booking'])if(!sql.includes(token))failures.push(`operational booking migration missing ${token}`)}
const hardening='supabase/migrations/045_booking_least_privilege_local_only.sql'
if(!existsSync(hardening))failures.push('booking least-privilege migration missing')
else{const sql=read(hardening);for(const token of ['from public, anon, authenticated','booking_service_policy(uuid)','booking_slot_is_available(uuid,date,time,uuid,uuid)','drop policy if exists "bookings: own create pending"','to service_role'])if(!sql.includes(token))failures.push(`booking hardening migration missing ${token}`)}
for(const [file,token] of [['src/components/booking/BookingWizard.tsx','completeBookingFromHold'],['src/components/admin/BookingAgenda.tsx','resolveBookingReschedule'],['src/components/admin/AvailabilityManager.tsx','saveBookingSlotOverride'],['scripts/verify-booking-local.mjs','two windows acquired the same hold']])if(!existsSync(file)||!read(file).includes(token))failures.push(`booking workflow coverage missing ${token}`)
if(!existsSync('scripts/verify-booking-permissions-local.mjs'))failures.push('booking permission regression verifier missing')
report('audit:booking',failures)
