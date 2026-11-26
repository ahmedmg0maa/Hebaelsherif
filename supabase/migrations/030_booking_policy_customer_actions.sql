-- 030: typed booking policy enforcement plus safe customer cancellation/reschedule requests.
insert into public.site_settings(key,value,is_public)
values ('booking_policy', jsonb_build_object(
  'timezone','Africa/Cairo','slot_interval_minutes',30,'buffer_before_minutes',0,
  'buffer_after_minutes',0,'minimum_notice_minutes',30,'booking_horizon_days',30,
  'max_bookings_per_day',20,'customer_cancel_notice_hours',24
), true)
on conflict (key) do nothing;

create or replace function public.enforce_booking_policy()
returns trigger language plpgsql set search_path=public as $$
declare v_policy jsonb; v_interval int; v_before int; v_after int; v_notice int; v_horizon int; v_max int; v_local timestamp;
begin
  if new.status not in ('pending','confirmed') then return new; end if;
  if tg_op='UPDATE' and new.starts_at=old.starts_at and new.ends_at=old.ends_at then return new; end if;
  select value into v_policy from public.site_settings where key='booking_policy';
  v_interval:=greatest(5,coalesce((v_policy->>'slot_interval_minutes')::int,30));
  v_before:=greatest(0,coalesce((v_policy->>'buffer_before_minutes')::int,0));
  v_after:=greatest(0,coalesce((v_policy->>'buffer_after_minutes')::int,0));
  v_notice:=greatest(0,coalesce((v_policy->>'minimum_notice_minutes')::int,30));
  v_horizon:=greatest(1,least(30,coalesce((v_policy->>'booking_horizon_days')::int,30)));
  v_max:=greatest(1,coalesce((v_policy->>'max_bookings_per_day')::int,20));
  v_local:=new.starts_at at time zone 'Africa/Cairo';
  if extract(minute from v_local)::int % v_interval <> 0 then raise exception using errcode='22023',message='INVALID_SLOT_INTERVAL'; end if;
  if new.starts_at < now()+make_interval(mins=>v_notice) then raise exception using errcode='22023',message='MINIMUM_NOTICE_REQUIRED'; end if;
  if (v_local::date) > ((now() at time zone 'Africa/Cairo')::date+v_horizon) then raise exception using errcode='22023',message='BOOKING_HORIZON_EXCEEDED'; end if;
  perform pg_advisory_xact_lock(hashtextextended('booking-policy:'||new.service_id::text||':'||v_local::date::text,0));
  if (select count(*) from public.bookings b where b.service_id=new.service_id and b.status in ('pending','confirmed') and (b.starts_at at time zone 'Africa/Cairo')::date=v_local::date and b.id<>coalesce(new.id,'00000000-0000-0000-0000-000000000000'::uuid))>=v_max then
    raise exception using errcode='23514',message='DAILY_BOOKING_CAPACITY_REACHED';
  end if;
  if exists(select 1 from public.bookings b where b.service_id=new.service_id and b.status in ('pending','confirmed') and b.id<>coalesce(new.id,'00000000-0000-0000-0000-000000000000'::uuid) and tstzrange(b.starts_at-make_interval(mins=>v_before),b.ends_at+make_interval(mins=>v_after),'[)') && tstzrange(new.starts_at-make_interval(mins=>v_before),new.ends_at+make_interval(mins=>v_after),'[)')) then
    raise exception using errcode='23P01',message='SLOT_BUFFER_CONFLICT';
  end if;
  return new;
end;
$$;
drop trigger if exists bookings_policy_guard on public.bookings;
create trigger bookings_policy_guard before insert or update of starts_at,ends_at,status on public.bookings for each row execute function public.enforce_booking_policy();

create or replace function public.cancel_my_booking(p_booking_id uuid,p_reason text default '')
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_booking public.bookings%rowtype; v_policy jsonb; v_hours int;
begin
  if v_user is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
  select * into v_booking from public.bookings where id=p_booking_id and user_id=v_user for update;
  if not found then raise exception using errcode='P0002',message='BOOKING_NOT_FOUND'; end if;
  if v_booking.status='cancelled' then return jsonb_build_object('outcome','existing'); end if;
  if v_booking.status not in ('pending','confirmed') then raise exception using errcode='22023',message='BOOKING_CANNOT_BE_CANCELLED'; end if;
  select value into v_policy from public.site_settings where key='booking_policy';
  v_hours:=greatest(0,coalesce((v_policy->>'customer_cancel_notice_hours')::int,24));
  if v_booking.starts_at < now()+make_interval(hours=>v_hours) then raise exception using errcode='22023',message='CANCELLATION_NOTICE_REQUIRED'; end if;
  update public.bookings set status='cancelled',customer_notes=concat_ws(E'\n',customer_notes,nullif(btrim(p_reason),'')) where id=v_booking.id;
  if v_booking.order_id is not null then update public.orders set status='cancelled' where id=v_booking.order_id and status='pending_payment'; end if;
  insert into public.booking_events(booking_id,actor_id,event,meta) values(v_booking.id,v_user,'customer.cancelled',jsonb_build_object('reason',btrim(coalesce(p_reason,''))));
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta) values(v_user,'booking.customer_cancelled','booking',v_booking.id::text,jsonb_build_object('reason',btrim(coalesce(p_reason,''))));
  return jsonb_build_object('outcome','cancelled');
end;
$$;
revoke all on function public.cancel_my_booking(uuid,text) from public,anon;
grant execute on function public.cancel_my_booking(uuid,text) to authenticated;

create or replace function public.request_booking_reschedule(p_booking_id uuid,p_proposed_starts_at timestamptz,p_reason text default '')
returns uuid language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_booking public.bookings%rowtype; v_id uuid;
begin
  if v_user is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
  select * into v_booking from public.bookings where id=p_booking_id and user_id=v_user;
  if not found or v_booking.status not in ('pending','confirmed') then raise exception using errcode='22023',message='BOOKING_CANNOT_BE_RESCHEDULED'; end if;
  if p_proposed_starts_at<now()+interval '30 minutes' then raise exception using errcode='22023',message='INVALID_PROPOSED_TIME'; end if;
  if exists(select 1 from public.booking_reschedule_requests where booking_id=p_booking_id and status='pending') then raise exception using errcode='23505',message='RESCHEDULE_ALREADY_PENDING'; end if;
  insert into public.booking_reschedule_requests(booking_id,requested_by,proposed_starts_at,reason) values(p_booking_id,v_user,p_proposed_starts_at,btrim(coalesce(p_reason,''))) returning id into v_id;
  insert into public.booking_events(booking_id,actor_id,event,meta) values(p_booking_id,v_user,'customer.reschedule_requested',jsonb_build_object('request_id',v_id,'proposed_starts_at',p_proposed_starts_at));
  return v_id;
end;
$$;
revoke all on function public.request_booking_reschedule(uuid,timestamptz,text) from public,anon;
grant execute on function public.request_booking_reschedule(uuid,timestamptz,text) to authenticated;
