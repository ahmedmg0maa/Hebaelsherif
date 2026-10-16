-- 045: close legacy booking bypasses after the 044 hold-aware workflow.
-- LOCAL-ONLY: do not apply to staging or production without a separate,
-- environment-specific authorization and a verified recovery point.
--
-- Ordering matters: 044 creates the hold-aware public contract; this migration
-- then removes the legacy/direct entry points. Supabase must apply 044 and 045
-- together in one controlled staging change window.

-- The application no longer calls these legacy RPCs directly. The 044
-- SECURITY DEFINER wrappers call them as the function owner, while service_role
-- remains available for controlled server-side recovery/operations.
revoke all on function public.create_booking_order(uuid,date,time,text,text,text)
  from public, anon, authenticated;
grant execute on function public.create_booking_order(uuid,date,time,text,text,text)
  to service_role;

revoke all on function public.create_package_booking(uuid,date,time,text,text,text,uuid)
  from public, anon, authenticated;
grant execute on function public.create_package_booking(uuid,date,time,text,text,text,uuid)
  to service_role;

-- These are implementation helpers for the explicitly exposed time-only
-- availability RPCs. Keeping them off PostgREST's browser roles prevents the
-- policy object and internal predicate from becoming accidental public APIs.
revoke all on function public.booking_service_policy(uuid)
  from public, anon, authenticated;
grant execute on function public.booking_service_policy(uuid)
  to service_role;

revoke all on function public.booking_slot_is_available(uuid,date,time,uuid,uuid)
  from public, anon, authenticated;
grant execute on function public.booking_slot_is_available(uuid,date,time,uuid,uuid)
  to service_role;

-- Every supported booking creation path is now an audited hold-aware RPC.
-- Broad table grants remain compatible with Supabase/PostgREST, but without an
-- INSERT policy anon/authenticated cannot create a booking row directly.
drop policy if exists "bookings: own create pending" on public.bookings;

comment on function public.create_booking_order(uuid,date,time,text,text,text) is
  'Internal legacy primitive. Browser execution revoked by migration 045; use create_booking_order_from_hold.';
comment on function public.create_package_booking(uuid,date,time,text,text,text,uuid) is
  'Internal legacy primitive. Browser execution revoked by migration 045; use create_package_booking_from_hold.';

