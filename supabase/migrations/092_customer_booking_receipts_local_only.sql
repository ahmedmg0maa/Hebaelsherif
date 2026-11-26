-- 092: replayable customer booking holds. LOCAL ONLY; Staging recovery/acceptance required.
-- Receipts contain no customer contact fields; existing converted holds cannot be reconstructed.

create or replace function public.create_booking_hold(p_service_id uuid, p_date date, p_time time)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_service public.services%rowtype; v_policy jsonb; v_start timestamptz; v_id uuid; v_expiry timestamptz;
begin
  if v_user is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended('booking-hold:'||p_service_id::text||':'||p_date::text,0));
  update public.booking_holds set status='expired', released_at=now() where status='active' and expires_at<=now();
  -- The same customer's retry reuses the original lease; it never extends it.
  select id,expires_at,starts_at into v_id,v_expiry,v_start from public.booking_holds
   where user_id=v_user and service_id=p_service_id and status='active' and expires_at>now()
     and (starts_at at time zone 'Africa/Cairo')::date=p_date
     and (starts_at at time zone 'Africa/Cairo')::time=p_time
   order by created_at,id limit 1;
  if found then return jsonb_build_object('holdId',v_id,'expiresAt',v_expiry,'startsAt',v_start); end if;
  if not public.booking_slot_is_available(p_service_id,p_date,p_time,null,null) then raise exception using errcode='23P01',message='SLOT_UNAVAILABLE'; end if;
  select * into v_service from public.services where id=p_service_id;
  v_policy:=public.booking_service_policy(p_service_id);
  v_start:=make_timestamptz(extract(year from p_date)::int,extract(month from p_date)::int,extract(day from p_date)::int,extract(hour from p_time)::int,extract(minute from p_time)::int,0,'Africa/Cairo');
  v_expiry:=now()+make_interval(mins=>(v_policy->>'hold_minutes')::int);
  insert into public.booking_holds(user_id,service_id,starts_at,ends_at,expires_at) values(v_user,p_service_id,v_start,v_start+make_interval(mins=>v_service.duration_minutes),v_expiry) returning id into v_id;
  return jsonb_build_object('holdId',v_id,'expiresAt',v_expiry,'startsAt',v_start);
end $$;

create or replace function public.create_free_booking_from_hold_once_092(p_hold_id uuid,p_full_name text,p_phone text,p_notes text default '')
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_hold public.booking_holds%rowtype; v_service public.services%rowtype; v_id uuid;
begin
  if v_user is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
  if length(btrim(coalesce(p_full_name,'')))<2 or btrim(coalesce(p_phone,'')) !~ '^[+]?[0-9[:space:]-]{8,18}$' then raise exception using errcode='22023',message='INVALID_CUSTOMER_DETAILS'; end if;
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
revoke all on function public.create_free_booking_from_hold_once_092(uuid,text,text,text) from public,anon,authenticated,service_role;

create or replace function public.create_booking_order_from_hold_once_092(p_hold_id uuid,p_full_name text,p_phone text,p_notes text default '')
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
revoke all on function public.create_booking_order_from_hold_once_092(uuid,text,text,text) from public,anon,authenticated,service_role;

create or replace function public.create_package_booking_from_hold_once_092(p_hold_id uuid,p_full_name text,p_phone text,p_notes text,p_subscription_id uuid)
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
revoke all on function public.create_package_booking_from_hold_once_092(uuid,text,text,text,uuid) from public,anon,authenticated,service_role;

create table public.booking_hold_receipts (
  hold_id uuid primary key references public.booking_holds(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  request_hash text not null check (request_hash ~ '^[a-f0-9]{64}$'),
  booking_id uuid not null unique references public.bookings(id) on delete restrict,
  result jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.booking_hold_receipts enable row level security;
revoke all on public.booking_hold_receipts from public,anon,authenticated,service_role;

create or replace function public.complete_booking_hold_v2(
 p_hold_id uuid,p_mode text,p_full_name text,p_phone text,p_notes text default '',p_subscription_id uuid default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_user uuid:=auth.uid(); v_hash text; v_receipt public.booking_hold_receipts%rowtype;
 v_result jsonb; v_booking public.bookings%rowtype; v_order public.orders%rowtype;
begin
 if v_user is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
 if p_mode is null or p_mode not in ('free','paid','package') or (p_mode='package')<>(p_subscription_id is not null) then
   raise exception using errcode='22023',message='INVALID_PAYMENT_MODE';
 end if;
 if char_length(btrim(coalesce(p_full_name,''))) not between 2 and 160 then raise exception using errcode='22023',message='INVALID_NAME'; end if;
 if btrim(coalesce(p_phone,'')) !~ '^[+]?[0-9[:space:]-]{8,18}$' then raise exception using errcode='22023',message='INVALID_PHONE'; end if;
 if char_length(coalesce(p_notes,''))>2000 then raise exception using errcode='22023',message='INVALID_NOTES'; end if;
 v_hash:=encode(extensions.digest(jsonb_build_array(p_mode,btrim(p_full_name),btrim(p_phone),btrim(coalesce(p_notes,'')),p_subscription_id)::text,'sha256'),'hex');
 -- Own hold only. This lock serializes free/paid/package retries in one transaction.
 perform 1 from public.booking_holds where id=p_hold_id and user_id=v_user for update;
 if not found then raise exception using errcode='22023',message='HOLD_EXPIRED'; end if;
 select * into v_receipt from public.booking_hold_receipts where hold_id=p_hold_id and user_id=v_user;
 if found then
   if v_receipt.request_hash<>v_hash then raise exception using errcode='23505',message='BOOKING_ATTEMPT_CONFLICT'; end if;
   v_result:=v_receipt.result;
 else
   case p_mode
    when 'free' then v_result:=public.create_free_booking_from_hold_once_092(p_hold_id,p_full_name,p_phone,p_notes);
    when 'paid' then v_result:=public.create_booking_order_from_hold_once_092(p_hold_id,p_full_name,p_phone,p_notes);
    when 'package' then v_result:=public.create_package_booking_from_hold_once_092(p_hold_id,p_full_name,p_phone,p_notes,p_subscription_id);
   end case;
   insert into public.booking_hold_receipts(hold_id,user_id,request_hash,booking_id,result)
     values(p_hold_id,v_user,v_hash,(v_result->>'bookingId')::uuid,v_result);
   insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta)
     values(v_user,'booking.receipt_created','booking',v_result->>'bookingId',jsonb_build_object('mode',p_mode));
 end if;
 select * into strict v_booking from public.bookings where id=(v_result->>'bookingId')::uuid and user_id=v_user;
 select * into v_order from public.orders where id=v_booking.order_id and user_id=v_user;
 -- Current status wins over a historical success (cancelled/refunded/paid/review).
 return v_result || jsonb_build_object('bookingStatus',v_booking.status,'orderStatus',v_order.status,
   'confirmed',v_booking.status='confirmed','total',coalesce(v_order.total,0),'expiresAt',v_order.expires_at);
end $$;
revoke all on function public.complete_booking_hold_v2(uuid,text,text,text,text,uuid) from public,anon,service_role;
grant execute on function public.complete_booking_hold_v2(uuid,text,text,text,text,uuid) to authenticated;

create or replace function public.create_free_booking_from_hold(p_hold_id uuid,p_full_name text,p_phone text,p_notes text default '')
returns jsonb language sql security definer set search_path='' as $$
 select public.complete_booking_hold_v2(p_hold_id,'free',p_full_name,p_phone,p_notes,null)
$$;
create or replace function public.create_booking_order_from_hold(p_hold_id uuid,p_full_name text,p_phone text,p_notes text default '')
returns jsonb language sql security definer set search_path='' as $$
 select public.complete_booking_hold_v2(p_hold_id,'paid',p_full_name,p_phone,p_notes,null)
$$;
create or replace function public.create_package_booking_from_hold(p_hold_id uuid,p_full_name text,p_phone text,p_notes text,p_subscription_id uuid)
returns jsonb language sql security definer set search_path='' as $$
 select public.complete_booking_hold_v2(p_hold_id,'package',p_full_name,p_phone,p_notes,p_subscription_id)
$$;
-- Preserve authenticated hold entry points. Internal single-use functions have no API grants.
revoke all on function public.create_booking_hold(uuid,date,time),public.create_free_booking_from_hold(uuid,text,text,text),public.create_booking_order_from_hold(uuid,text,text,text),public.create_package_booking_from_hold(uuid,text,text,text,uuid) from public,anon,service_role;
grant execute on function public.create_booking_hold(uuid,date,time),public.create_free_booking_from_hold(uuid,text,text,text),public.create_booking_order_from_hold(uuid,text,text,text),public.create_package_booking_from_hold(uuid,text,text,text,uuid) to authenticated;
