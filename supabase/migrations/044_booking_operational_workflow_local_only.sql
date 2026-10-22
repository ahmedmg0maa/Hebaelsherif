-- 044: operational booking workflow (LOCAL-ONLY until the owner confirms the production project).
-- Forward-only source migration. Do not apply this file from this workspace.
--
-- The existing booking/order RPCs remain available for backwards compatibility.
-- New clients use a short-lived hold before the final free or paid booking action,
-- so availability is reserved atomically without exposing a browser-side lock token.

-- A deliberately non-sensitive capability check for the administrative readiness
-- screen. It identifies the full 044 contract without leaking bookings or config.
create or replace function public.booking_runtime_contract()
returns jsonb language sql stable security definer set search_path=public as $$
  select jsonb_build_object('migration','044','timezone','Africa/Cairo','holds',true,'slot_overrides',true)
$$;
revoke all on function public.booking_runtime_contract() from public;
grant execute on function public.booking_runtime_contract() to anon, authenticated;

alter table public.services
  add column if not exists booking_payment_mode text not null default 'payment_required'
    check (booking_payment_mode in ('payment_required', 'free')),
  add column if not exists buffer_before_minutes integer,
  add column if not exists buffer_after_minutes integer,
  add column if not exists minimum_notice_minutes integer,
  add column if not exists booking_window_days integer,
  add column if not exists hold_minutes integer not null default 10
    check (hold_minutes between 2 and 30),
  add column if not exists cancellation_notice_hours integer,
  add column if not exists reschedule_notice_hours integer,
  add column if not exists max_reschedules integer not null default 2
    check (max_reschedules between 0 and 12),
  add column if not exists booking_policy_note text not null default '';

alter table public.services
  add constraint services_booking_policy_non_negative check (
    coalesce(buffer_before_minutes, 0) >= 0
    and coalesce(buffer_after_minutes, 0) >= 0
    and coalesce(minimum_notice_minutes, 0) >= 0
    and coalesce(booking_window_days, 1) between 1 and 365
    and coalesce(cancellation_notice_hours, 0) >= 0
    and coalesce(reschedule_notice_hours, 0) >= 0
  );

alter table public.availability_exceptions
  add column if not exists kind text not null default 'closed'
    check (kind in ('closed', 'custom', 'holiday', 'blackout')),
  add column if not exists reason text not null default '';

update public.availability_exceptions
   set kind = case when is_closed then 'closed' else 'custom' end
 where kind = 'closed';

-- A dated manual opening or closing has slot granularity. It can open a slot
-- outside the regular weekly timetable or close one slot inside it.
create table if not exists public.booking_slot_overrides (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  date date not null,
  start_time time not null,
  mode text not null check (mode in ('open', 'closed')),
  reason text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(service_id, date, start_time)
);
create index if not exists booking_slot_overrides_service_date_idx
  on public.booking_slot_overrides(service_id, date);
alter table public.booking_slot_overrides enable row level security;
create policy "booking slot overrides: public read" on public.booking_slot_overrides for select using (true);
create policy "booking slot overrides: permitted write" on public.booking_slot_overrides
  for all using (public.has_permission('availability.manage')) with check (public.has_permission('availability.manage'));

-- Holds are separate from bookings so expiring one never changes a customer
-- appointment/order. The id is owned by auth.uid() and is never put in audit meta.
create table if not exists public.booking_holds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  expires_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'released', 'expired', 'converted')),
  created_at timestamptz not null default now(),
  released_at timestamptz,
  check (ends_at > starts_at),
  check (expires_at > created_at)
);
create index if not exists booking_holds_active_lookup_idx
  on public.booking_holds(service_id, starts_at, ends_at, expires_at) where status = 'active';
create index if not exists booking_holds_user_idx on public.booking_holds(user_id, created_at desc);
alter table public.booking_holds enable row level security;
create policy "booking holds: own read" on public.booking_holds for select using (user_id = auth.uid() or public.has_permission('bookings.manage'));

create or replace function public.booking_service_policy(p_service_id uuid)
returns jsonb language sql stable security definer set search_path=public as $$
  select jsonb_build_object(
    'slot_interval_minutes', greatest(5, coalesce((site.value->>'slot_interval_minutes')::int, 30)),
    'buffer_before_minutes', greatest(0, coalesce(s.buffer_before_minutes, (site.value->>'buffer_before_minutes')::int, 0)),
    'buffer_after_minutes', greatest(0, coalesce(s.buffer_after_minutes, (site.value->>'buffer_after_minutes')::int, 0)),
    'minimum_notice_minutes', greatest(0, coalesce(s.minimum_notice_minutes, (site.value->>'minimum_notice_minutes')::int, 30)),
    'booking_window_days', greatest(1, coalesce(s.booking_window_days, (site.value->>'booking_horizon_days')::int, 30)),
    'hold_minutes', s.hold_minutes,
    'cancellation_notice_hours', greatest(0, coalesce(s.cancellation_notice_hours, (site.value->>'customer_cancel_notice_hours')::int, 24)),
    'reschedule_notice_hours', greatest(0, coalesce(s.reschedule_notice_hours, (site.value->>'customer_cancel_notice_hours')::int, 24)),
    'max_reschedules', s.max_reschedules
  )
  from public.services s
  left join public.site_settings site on site.key = 'booking_policy'
  where s.id = p_service_id
$$;

-- One authoritative slot predicate used by holds and customer reschedules.
create or replace function public.booking_slot_is_available(
  p_service_id uuid,
  p_date date,
  p_time time,
  p_ignore_booking_id uuid default null,
  p_ignore_hold_id uuid default null
)
returns boolean language plpgsql security definer set search_path=public as $$
declare
  v_service public.services%rowtype; v_policy jsonb; v_start timestamptz; v_end timestamptz;
  v_exception public.availability_exceptions%rowtype; v_override public.booking_slot_overrides%rowtype;
  v_allowed boolean := false;
begin
  select s.* into v_service from public.services s join public.products p on p.id=s.product_id
    where s.id=p_service_id and s.is_active and p.is_published;
  if not found then return false; end if;
  v_policy := public.booking_service_policy(p_service_id);
  v_start := make_timestamptz(extract(year from p_date)::int, extract(month from p_date)::int, extract(day from p_date)::int,
    extract(hour from p_time)::int, extract(minute from p_time)::int, 0, 'Africa/Cairo');
  v_end := v_start + make_interval(mins => v_service.duration_minutes);
  if extract(minute from p_time)::int % (v_policy->>'slot_interval_minutes')::int <> 0
     or v_start < now() + make_interval(mins => (v_policy->>'minimum_notice_minutes')::int)
     or p_date > ((now() at time zone 'Africa/Cairo')::date + (v_policy->>'booking_window_days')::int) then return false; end if;
  select * into v_override from public.booking_slot_overrides where service_id=p_service_id and date=p_date and start_time=p_time;
  if found and v_override.mode='closed' then return false; end if;
  if found and v_override.mode='open' then v_allowed := true; end if;
  select * into v_exception from public.availability_exceptions where service_id=p_service_id and date=p_date;
  if found and v_exception.kind in ('closed','holiday','blackout') then return false; end if;
  if not v_allowed then
    select exists(select 1 from public.availability_rules r where r.service_id=p_service_id
      and r.weekday=extract(dow from p_date)::int and p_time>=r.start_time
      and p_time+make_interval(mins=>v_service.duration_minutes)<=r.end_time) into v_allowed;
    if found and v_exception.kind='custom' then
      v_allowed := v_allowed and p_time>=v_exception.start_time
        and p_time+make_interval(mins=>v_service.duration_minutes)<=v_exception.end_time;
    end if;
  end if;
  if not v_allowed then return false; end if;
  if exists(select 1 from public.bookings b where b.service_id=p_service_id and b.status in ('pending','confirmed')
      and b.id is distinct from p_ignore_booking_id
      and tstzrange(b.starts_at-make_interval(mins=>(v_policy->>'buffer_before_minutes')::int), b.ends_at+make_interval(mins=>(v_policy->>'buffer_after_minutes')::int),'[)')
        && tstzrange(v_start-make_interval(mins=>(v_policy->>'buffer_before_minutes')::int), v_end+make_interval(mins=>(v_policy->>'buffer_after_minutes')::int),'[)')) then return false; end if;
  if exists(select 1 from public.booking_holds h where h.service_id=p_service_id and h.status='active' and h.expires_at>now()
      and h.id is distinct from p_ignore_hold_id
      and tstzrange(h.starts_at-make_interval(mins=>(v_policy->>'buffer_before_minutes')::int), h.ends_at+make_interval(mins=>(v_policy->>'buffer_after_minutes')::int),'[)')
        && tstzrange(v_start-make_interval(mins=>(v_policy->>'buffer_before_minutes')::int), v_end+make_interval(mins=>(v_policy->>'buffer_after_minutes')::int),'[)')) then return false; end if;
  return true;
end $$;

create or replace function public.create_booking_hold(p_service_id uuid, p_date date, p_time time)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_service public.services%rowtype; v_policy jsonb; v_start timestamptz; v_id uuid; v_expiry timestamptz;
begin
  if v_user is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended('booking-hold:'||p_service_id::text||':'||p_date::text,0));
  update public.booking_holds set status='expired', released_at=now() where status='active' and expires_at<=now();
  if not public.booking_slot_is_available(p_service_id,p_date,p_time,null,null) then raise exception using errcode='23P01',message='SLOT_UNAVAILABLE'; end if;
  select * into v_service from public.services where id=p_service_id;
  v_policy:=public.booking_service_policy(p_service_id);
  v_start:=make_timestamptz(extract(year from p_date)::int,extract(month from p_date)::int,extract(day from p_date)::int,extract(hour from p_time)::int,extract(minute from p_time)::int,0,'Africa/Cairo');
  v_expiry:=now()+make_interval(mins=>(v_policy->>'hold_minutes')::int);
  insert into public.booking_holds(user_id,service_id,starts_at,ends_at,expires_at) values(v_user,p_service_id,v_start,v_start+make_interval(mins=>v_service.duration_minutes),v_expiry) returning id into v_id;
  return jsonb_build_object('holdId',v_id,'expiresAt',v_expiry,'startsAt',v_start);
end $$;
revoke all on function public.create_booking_hold(uuid,date,time) from public,anon;
grant execute on function public.create_booking_hold(uuid,date,time) to authenticated;

-- Public booking pages receive times only, never customer names, notes, holds,
-- audit data, or meeting links. The final booking action re-checks this predicate.
create or replace function public.available_booking_slots(p_service_id uuid,p_date date)
returns table(slot_time time) language plpgsql security definer set search_path=public as $$
declare v_policy jsonb; v_cursor time := time '00:00';
begin
  v_policy:=public.booking_service_policy(p_service_id);
  if v_policy is null then return; end if;
  while v_cursor < time '24:00' loop
    if public.booking_slot_is_available(p_service_id,p_date,v_cursor,null,null) then slot_time:=v_cursor; return next; end if;
    v_cursor:=v_cursor+make_interval(mins=>(v_policy->>'slot_interval_minutes')::int);
  end loop;
end $$;
revoke all on function public.available_booking_slots(uuid,date) from public;
grant execute on function public.available_booking_slots(uuid,date) to anon,authenticated;

create or replace function public.available_booking_calendar(p_service_id uuid,p_from date,p_to date)
returns table(booking_date date, slot_time time) language sql security definer set search_path=public as $$
  select day::date, slots.slot_time
  from generate_series(p_from, p_to, interval '1 day') day
  cross join lateral public.available_booking_slots(p_service_id, day::date) slots
$$;
revoke all on function public.available_booking_calendar(uuid,date,date) from public;
grant execute on function public.available_booking_calendar(uuid,date,date) to anon,authenticated;

create or replace function public.release_my_booking_hold(p_hold_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid();
begin
  if v_user is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
  update public.booking_holds set status=case when expires_at<=now() then 'expired' else 'released' end,released_at=now()
    where id=p_hold_id and user_id=v_user and status='active';
  return jsonb_build_object('outcome','released');
end $$;
revoke all on function public.release_my_booking_hold(uuid) from public,anon;
grant execute on function public.release_my_booking_hold(uuid) to authenticated;

create or replace function public.create_free_booking_from_hold(p_hold_id uuid,p_full_name text,p_phone text,p_notes text default '')
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_hold public.booking_holds%rowtype; v_service public.services%rowtype; v_id uuid;
begin
  if v_user is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
  if length(btrim(coalesce(p_full_name,'')))<2 or btrim(coalesce(p_phone,'')) !~ '^\\+?[0-9[:space:]-]{8,18}$' then raise exception using errcode='22023',message='INVALID_CUSTOMER_DETAILS'; end if;
  select * into v_hold from public.booking_holds where id=p_hold_id and user_id=v_user for update;
  if not found or v_hold.status<>'active' or v_hold.expires_at<=now() then raise exception using errcode='22023',message='HOLD_EXPIRED'; end if;
  select * into v_service from public.services where id=v_hold.service_id;
  if not found or v_service.booking_payment_mode<>'free' then raise exception using errcode='22023',message='PAYMENT_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended('booking-hold:'||v_hold.service_id::text||':'||(v_hold.starts_at at time zone 'Africa/Cairo')::date::text,0));
  if not public.booking_slot_is_available(v_hold.service_id,(v_hold.starts_at at time zone 'Africa/Cairo')::date,(v_hold.starts_at at time zone 'Africa/Cairo')::time,null,v_hold.id) then raise exception using errcode='23P01',message='SLOT_UNAVAILABLE'; end if;
  update public.profiles set full_name=btrim(p_full_name),phone=btrim(p_phone) where id=v_user;
  insert into public.bookings(user_id,service_id,starts_at,ends_at,status,customer_notes) values(v_user,v_hold.service_id,v_hold.starts_at,v_hold.ends_at,'confirmed',nullif(btrim(coalesce(p_notes,'')),'')) returning id into v_id;
  update public.booking_holds set status='converted',released_at=now() where id=v_hold.id;
  insert into public.booking_events(booking_id,actor_id,event,meta) values(v_id,v_user,'booking.free_confirmed',jsonb_build_object('source','hold'));
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta) values(v_user,'booking.free_confirmed','booking',v_id::text,jsonb_build_object('starts_at',v_hold.starts_at));
  return jsonb_build_object('bookingId',v_id,'total',0,'confirmed',true);
exception when exclusion_violation then raise exception using errcode='23P01',message='SLOT_UNAVAILABLE';
end $$;
revoke all on function public.create_free_booking_from_hold(uuid,text,text,text) from public,anon;
grant execute on function public.create_free_booking_from_hold(uuid,text,text,text) to authenticated;

-- Paid and package bookings use the same hold boundary as free bookings. The
-- older RPC stays callable only from SECURITY DEFINER wrappers already in the
-- database; browser roles receive this hold-aware entry point instead.
create or replace function public.create_booking_order_from_hold(p_hold_id uuid,p_full_name text,p_phone text,p_notes text default '')
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_hold public.booking_holds%rowtype; v_service public.services%rowtype; v_result jsonb; v_local timestamp;
begin
  if v_user is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
  select * into v_hold from public.booking_holds where id=p_hold_id and user_id=v_user for update;
  if not found or v_hold.status<>'active' or v_hold.expires_at<=now() then raise exception using errcode='22023',message='HOLD_EXPIRED'; end if;
  select * into v_service from public.services where id=v_hold.service_id;
  if not found or v_service.booking_payment_mode<>'payment_required' then raise exception using errcode='22023',message='INVALID_PAYMENT_MODE'; end if;
  v_local:=v_hold.starts_at at time zone 'Africa/Cairo';
  perform pg_advisory_xact_lock(hashtextextended('booking-hold:'||v_hold.service_id::text||':'||v_local::date::text,0));
  if not public.booking_slot_is_available(v_hold.service_id,v_local::date,v_local::time,null,v_hold.id) then raise exception using errcode='23P01',message='SLOT_UNAVAILABLE'; end if;
  v_result:=public.create_booking_order(v_hold.service_id,v_local::date,v_local::time,p_full_name,p_phone,p_notes);
  update public.booking_holds set status='converted',released_at=now() where id=v_hold.id;
  insert into public.booking_events(booking_id,actor_id,event,meta) values((v_result->>'bookingId')::uuid,v_user,'booking.payment_hold_converted',jsonb_build_object('expires_at',v_result->>'expiresAt'));
  return v_result || jsonb_build_object('holdConverted',true);
end $$;
revoke all on function public.create_booking_order_from_hold(uuid,text,text,text) from public,anon;
grant execute on function public.create_booking_order_from_hold(uuid,text,text,text) to authenticated;

create or replace function public.create_package_booking_from_hold(p_hold_id uuid,p_full_name text,p_phone text,p_notes text,p_subscription_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_hold public.booking_holds%rowtype; v_result jsonb; v_local timestamp;
begin
  if v_user is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
  select * into v_hold from public.booking_holds where id=p_hold_id and user_id=v_user for update;
  if not found or v_hold.status<>'active' or v_hold.expires_at<=now() then raise exception using errcode='22023',message='HOLD_EXPIRED'; end if;
  v_local:=v_hold.starts_at at time zone 'Africa/Cairo';
  perform pg_advisory_xact_lock(hashtextextended('booking-hold:'||v_hold.service_id::text||':'||v_local::date::text,0));
  if not public.booking_slot_is_available(v_hold.service_id,v_local::date,v_local::time,null,v_hold.id) then raise exception using errcode='23P01',message='SLOT_UNAVAILABLE'; end if;
  v_result:=public.create_package_booking(v_hold.service_id,v_local::date,v_local::time,p_full_name,p_phone,p_notes,p_subscription_id);
  update public.booking_holds set status='converted',released_at=now() where id=v_hold.id;
  insert into public.booking_events(booking_id,actor_id,event,meta) values((v_result->>'bookingId')::uuid,v_user,'booking.package_hold_converted',jsonb_build_object('subscription_id',p_subscription_id));
  return v_result || jsonb_build_object('holdConverted',true);
end $$;
revoke all on function public.create_package_booking_from_hold(uuid,text,text,text,uuid) from public,anon;
grant execute on function public.create_package_booking_from_hold(uuid,text,text,text,uuid) to authenticated;

revoke execute on function public.create_booking_order(uuid,date,time,text,text,text) from authenticated;
revoke execute on function public.create_package_booking(uuid,date,time,text,text,text,uuid) from authenticated;

-- Customer reschedules remain requests, but proposed times must be real slots.
create or replace function public.request_booking_reschedule(p_booking_id uuid,p_proposed_starts_at timestamptz,p_reason text default '')
returns uuid language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_booking public.bookings%rowtype; v_id uuid; v_policy jsonb; v_local timestamp;
begin
  if v_user is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
  select * into v_booking from public.bookings where id=p_booking_id and user_id=v_user for update;
  if not found or v_booking.status not in ('pending','confirmed') then raise exception using errcode='22023',message='BOOKING_CANNOT_BE_RESCHEDULED'; end if;
  v_policy:=public.booking_service_policy(v_booking.service_id); v_local:=p_proposed_starts_at at time zone 'Africa/Cairo';
  if v_booking.starts_at<now()+make_interval(hours=>(v_policy->>'reschedule_notice_hours')::int) then raise exception using errcode='22023',message='RESCHEDULE_NOTICE_REQUIRED'; end if;
  if (select count(*) from public.booking_reschedule_requests where booking_id=p_booking_id and status='approved') >= (v_policy->>'max_reschedules')::int then raise exception using errcode='22023',message='RESCHEDULE_LIMIT_REACHED'; end if;
  if not public.booking_slot_is_available(v_booking.service_id,v_local::date,v_local::time,v_booking.id,null) then raise exception using errcode='23P01',message='PROPOSED_SLOT_UNAVAILABLE'; end if;
  if exists(select 1 from public.booking_reschedule_requests where booking_id=p_booking_id and status='pending') then raise exception using errcode='23505',message='RESCHEDULE_ALREADY_PENDING'; end if;
  insert into public.booking_reschedule_requests(booking_id,requested_by,proposed_starts_at,reason) values(p_booking_id,v_user,p_proposed_starts_at,btrim(coalesce(p_reason,''))) returning id into v_id;
  insert into public.booking_events(booking_id,actor_id,event,meta) values(p_booking_id,v_user,'customer.reschedule_requested',jsonb_build_object('request_id',v_id,'proposed_starts_at',p_proposed_starts_at));
  return v_id;
end $$;
revoke all on function public.request_booking_reschedule(uuid,timestamptz,text) from public,anon;
grant execute on function public.request_booking_reschedule(uuid,timestamptz,text) to authenticated;

create or replace function public.resolve_booking_reschedule(p_request_id uuid,p_approve boolean,p_admin_note text default '')
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_actor uuid:=auth.uid(); v_request public.booking_reschedule_requests%rowtype; v_booking public.bookings%rowtype; v_local timestamp;
begin
  if v_actor is null or not public.has_permission('bookings.manage') then raise exception using errcode='42501',message='BOOKINGS_MANAGE_REQUIRED'; end if;
  select * into v_request from public.booking_reschedule_requests where id=p_request_id for update;
  if not found then raise exception using errcode='P0002',message='RESCHEDULE_NOT_FOUND'; end if;
  if v_request.status<>'pending' then return jsonb_build_object('outcome','existing','status',v_request.status); end if;
  select * into v_booking from public.bookings where id=v_request.booking_id for update;
  if not found or v_booking.status not in ('pending','confirmed') then raise exception using errcode='22023',message='BOOKING_CANNOT_BE_RESCHEDULED'; end if;
  if p_approve then
    v_local:=v_request.proposed_starts_at at time zone 'Africa/Cairo';
    perform pg_advisory_xact_lock(hashtextextended('booking-hold:'||v_booking.service_id::text||':'||v_local::date::text,0));
    if not public.booking_slot_is_available(v_booking.service_id,v_local::date,v_local::time,v_booking.id,null) then raise exception using errcode='23P01',message='PROPOSED_SLOT_UNAVAILABLE'; end if;
    update public.bookings set starts_at=v_request.proposed_starts_at,ends_at=v_request.proposed_starts_at+(v_booking.ends_at-v_booking.starts_at),admin_notes=concat_ws(E'\n',admin_notes,nullif(btrim(p_admin_note),'')) where id=v_booking.id;
    update public.booking_reschedule_requests set status='approved' where id=v_request.id;
    insert into public.booking_events(booking_id,actor_id,event,meta) values(v_booking.id,v_actor,'admin.reschedule_approved',jsonb_build_object('request_id',v_request.id,'from',v_booking.starts_at,'to',v_request.proposed_starts_at));
    insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta) values(v_actor,'booking.reschedule_approved','booking',v_booking.id::text,jsonb_build_object('request_id',v_request.id,'from',v_booking.starts_at,'to',v_request.proposed_starts_at));
    return jsonb_build_object('outcome','approved','bookingId',v_booking.id);
  end if;
  update public.booking_reschedule_requests set status='declined' where id=v_request.id;
  insert into public.booking_events(booking_id,actor_id,event,meta) values(v_booking.id,v_actor,'admin.reschedule_declined',jsonb_build_object('request_id',v_request.id,'note',btrim(p_admin_note)));
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta) values(v_actor,'booking.reschedule_declined','booking',v_booking.id::text,jsonb_build_object('request_id',v_request.id));
  return jsonb_build_object('outcome','declined','bookingId',v_booking.id);
end $$;
revoke all on function public.resolve_booking_reschedule(uuid,boolean,text) from public,anon;
grant execute on function public.resolve_booking_reschedule(uuid,boolean,text) to authenticated;

create or replace function public.admin_update_booking(
  p_booking_id uuid,p_starts_at timestamptz,p_ends_at timestamptz,p_status text,
  p_meeting_url text,p_customer_notes text,p_admin_notes text
)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_actor uuid:=auth.uid(); v_booking public.bookings%rowtype; v_local timestamp;
begin
  if v_actor is null or not public.has_permission('bookings.manage') then raise exception using errcode='42501',message='BOOKINGS_MANAGE_REQUIRED'; end if;
  if p_status not in ('pending','confirmed','completed','cancelled','no_show') or p_ends_at<=p_starts_at then raise exception using errcode='22023',message='INVALID_BOOKING_UPDATE'; end if;
  select * into v_booking from public.bookings where id=p_booking_id for update;
  if not found then raise exception using errcode='P0002',message='BOOKING_NOT_FOUND'; end if;
  if p_status in ('pending','confirmed') and (p_starts_at<>v_booking.starts_at or p_ends_at<>v_booking.ends_at) then
    v_local:=p_starts_at at time zone 'Africa/Cairo';
    perform pg_advisory_xact_lock(hashtextextended('booking-hold:'||v_booking.service_id::text||':'||v_local::date::text,0));
    if not public.booking_slot_is_available(v_booking.service_id,v_local::date,v_local::time,p_booking_id,null) then raise exception using errcode='23P01',message='SLOT_UNAVAILABLE'; end if;
  end if;
  update public.bookings set starts_at=p_starts_at,ends_at=p_ends_at,status=p_status,meeting_url=nullif(btrim(p_meeting_url),''),customer_notes=nullif(btrim(p_customer_notes),''),admin_notes=btrim(p_admin_notes) where id=p_booking_id;
  insert into public.booking_events(booking_id,actor_id,event,meta) values(p_booking_id,v_actor,'admin.booking_updated',jsonb_build_object('from',jsonb_build_object('starts_at',v_booking.starts_at,'ends_at',v_booking.ends_at,'status',v_booking.status),'to',jsonb_build_object('starts_at',p_starts_at,'ends_at',p_ends_at,'status',p_status)));
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta) values(v_actor,'booking.updated','booking',p_booking_id::text,jsonb_build_object('from_status',v_booking.status,'to_status',p_status));
  return jsonb_build_object('outcome','updated');
end $$;
revoke all on function public.admin_update_booking(uuid,timestamptz,timestamptz,text,text,text,text) from public,anon;
grant execute on function public.admin_update_booking(uuid,timestamptz,timestamptz,text,text,text,text) to authenticated;
