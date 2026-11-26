-- Owner-approved Cairo schedule; additive, no booking/payment/entitlement deletion.
create table public.coach_working_hours (
 weekday integer primary key check (weekday between 0 and 6),
 is_open boolean not null,
 start_time time not null default '10:00',
 end_time time not null default '20:00',
 check (start_time < end_time and end_time < time '24:00')
);
insert into public.coach_working_hours(weekday,is_open) select d,d between 0 and 4 from generate_series(0,6) d;
create table public.coach_schedule_exceptions (
 id uuid primary key default gen_random_uuid(),
 date date not null,
 kind text not null check(kind in ('open','closed')),
 start_time time not null,
 end_time time not null,
 reason text not null default '' check(char_length(reason)<=500),
 created_at timestamptz not null default now(),
 check(start_time < end_time),
 unique(date,kind,start_time,end_time)
);
alter table public.coach_working_hours enable row level security;
alter table public.coach_schedule_exceptions enable row level security;
revoke all on public.coach_working_hours,public.coach_schedule_exceptions from public,anon,authenticated,service_role;

-- All booking/hold writes and schedule changes share this lock. GiST still
-- independently prevents cross-service overlap, including concurrent requests.
create function public.lock_coach_schedule() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended('coach-schedule',0));
 return null;
end $$;
create trigger coach_schedule_booking_lock before insert or update or delete on public.bookings
 for each statement execute function public.lock_coach_schedule();
create trigger coach_schedule_hold_lock before insert or update or delete on public.booking_holds
 for each statement execute function public.lock_coach_schedule();
create trigger coach_schedule_service_lock before update on public.services
 for each statement execute function public.lock_coach_schedule();

create function public.coach_schedule_allows(p_occupied tstzrange) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare a timestamp:=lower(p_occupied) at time zone 'Africa/Cairo';
 b timestamp:=upper(p_occupied) at time zone 'Africa/Cairo';
begin
 if a is null or b is null or a::date<>b::date or a>=b then return false; end if;
 -- Closures always win, even over an exceptional opening. Reasons stay private.
 if exists(select 1 from public.coach_schedule_exceptions x where x.date=a::date and x.kind='closed'
   and tsrange(x.date+x.start_time,x.date+x.end_time,'[)') && tsrange(a,b,'[)')) then return false; end if;
 return exists(select 1 from public.coach_working_hours w where w.weekday=extract(dow from a)::int and w.is_open
     and a::time>=w.start_time and b::time<=w.end_time)
   or exists(select 1 from public.coach_schedule_exceptions x where x.date=a::date and x.kind='open'
     and a::time>=x.start_time and b::time<=x.end_time);
end $$;

create function public.guard_coach_reservation_hours() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.ends_at>now() and (new.expires_at is null or new.expires_at>now())
   and not public.coach_schedule_allows(new.occupied) then
   raise exception using errcode='23P01',message='COACH_WORKING_HOURS_OR_CLOSURE';
 end if;
 return new;
end $$;
create trigger coach_reservation_hours before insert or update on public.coach_calendar_reservations
 for each row execute function public.guard_coach_reservation_hours();

-- A buffer edit must update reservations in the same transaction or fail safely.
create function public.refresh_coach_buffers() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.buffer_before_minutes is distinct from old.buffer_before_minutes
   or new.buffer_after_minutes is distinct from old.buffer_after_minutes then
   delete from public.coach_calendar_reservations where expires_at<=now();
   update public.coach_calendar_reservations set occupied=public.coach_occupied_range(service_id,starts_at,ends_at)
     where service_id=new.id and ends_at>now();
 end if;
 return new;
end $$;
create trigger coach_service_buffers after update on public.services
 for each row execute function public.refresh_coach_buffers();

create function public.assert_coach_schedule_preserves_bookings() returns void
language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 select count(*) into n from public.coach_calendar_reservations r where r.ends_at>now()
   and (r.expires_at is null or r.expires_at>now()) and not public.coach_schedule_allows(r.occupied);
 if n>0 then raise exception using errcode='23P01',message='COACH_SCHEDULE_CONFLICT',detail=n::text; end if;
end $$;
-- Fail rather than silently invalidate existing appointments on migration.
select public.assert_coach_schedule_preserves_bookings();

create function public.admin_read_coach_schedule(p_actor_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if p_actor_id is null or not public.has_permission('availability.manage',p_actor_id) then
   raise exception using errcode='42501',message='availability_manage_permission_required'; end if;
 return jsonb_build_object('hours',(select jsonb_agg(w order by weekday) from public.coach_working_hours w),
   'exceptions',coalesce((select jsonb_agg(x order by date,start_time) from public.coach_schedule_exceptions x where date>=(now() at time zone 'Africa/Cairo')::date),'[]'::jsonb));
end $$;
create function public.admin_save_coach_hours(p_actor_id uuid,p_hours jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare item jsonb;
begin
 if p_actor_id is null or not public.has_permission('availability.manage',p_actor_id) then
   raise exception using errcode='42501',message='availability_manage_permission_required'; end if;
 if jsonb_typeof(p_hours)<>'array' or jsonb_array_length(p_hours)<>7
   or (select count(distinct (x->>'weekday')::int) from jsonb_array_elements(p_hours) x)<>7 then
   raise exception using errcode='22023',message='COACH_WEEK_INVALID'; end if;
 perform pg_advisory_xact_lock(hashtextextended('coach-schedule',0));
 for item in select * from jsonb_array_elements(p_hours) loop
   update public.coach_working_hours set is_open=(item->>'is_open')::boolean,
     start_time=(item->>'start_time')::time,end_time=(item->>'end_time')::time where weekday=(item->>'weekday')::int;
   if not found then raise exception using errcode='22023',message='COACH_WEEK_INVALID'; end if;
 end loop;
 perform public.assert_coach_schedule_preserves_bookings();
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta)
 values(p_actor_id,'availability.coach_hours_saved','coach_schedule','weekly','{}');
end $$;
create function public.admin_save_coach_exception(p_actor_id uuid,p_date date,p_kind text,p_start time,p_end time,p_reason text default '') returns uuid
language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if p_actor_id is null or not public.has_permission('availability.manage',p_actor_id) then
   raise exception using errcode='42501',message='availability_manage_permission_required'; end if;
 if p_date is null or p_kind not in ('open','closed') or p_start is null or p_end is null or p_start>=p_end
   or p_reason is null or char_length(p_reason)>500 then raise exception using errcode='22023',message='COACH_EXCEPTION_INVALID'; end if;
 perform pg_advisory_xact_lock(hashtextextended('coach-schedule',0));
 insert into public.coach_schedule_exceptions(date,kind,start_time,end_time,reason) values(p_date,p_kind,p_start,p_end,btrim(p_reason))
 on conflict(date,kind,start_time,end_time) do update set reason=excluded.reason returning id into v_id;
 perform public.assert_coach_schedule_preserves_bookings();
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta)
 values(p_actor_id,'availability.coach_exception_saved','coach_schedule',v_id::text,jsonb_build_object('date',p_date,'kind',p_kind));
 return v_id;
end $$;
create function public.admin_delete_coach_exception(p_actor_id uuid,p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if p_actor_id is null or not public.has_permission('availability.manage',p_actor_id) then
   raise exception using errcode='42501',message='availability_manage_permission_required'; end if;
 perform pg_advisory_xact_lock(hashtextextended('coach-schedule',0));
 delete from public.coach_schedule_exceptions where id=p_id;
 if not found then raise exception using errcode='P0002',message='coach_exception_not_found'; end if;
 perform public.assert_coach_schedule_preserves_bookings();
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta)
 values(p_actor_id,'availability.coach_exception_deleted','coach_schedule',p_id::text,'{}');
end $$;

revoke all on function public.lock_coach_schedule(),public.coach_schedule_allows(tstzrange),public.guard_coach_reservation_hours(),
 public.refresh_coach_buffers(),public.assert_coach_schedule_preserves_bookings() from public,anon,authenticated,service_role;
revoke all on function public.admin_read_coach_schedule(uuid),public.admin_save_coach_hours(uuid,jsonb),
 public.admin_save_coach_exception(uuid,date,text,time,time,text),public.admin_delete_coach_exception(uuid,uuid) from public,anon,authenticated;
grant execute on function public.admin_read_coach_schedule(uuid),public.admin_save_coach_hours(uuid,jsonb),
 public.admin_save_coach_exception(uuid,date,text,time,time,text),public.admin_delete_coach_exception(uuid,uuid) to service_role;

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
  v_allowed boolean := false; v_occupied tstzrange; v_open boolean := false;
begin
  select s.* into v_service from public.services s join public.products p on p.id=s.product_id
    where s.id=p_service_id and s.is_active and p.is_published;
  if not found then return false; end if;
  v_policy := public.booking_service_policy(p_service_id);
  v_start := make_timestamptz(extract(year from p_date)::int, extract(month from p_date)::int, extract(day from p_date)::int,
    extract(hour from p_time)::int, extract(minute from p_time)::int, 0, 'Africa/Cairo');
  v_end := v_start + make_interval(mins => v_service.duration_minutes);
  v_occupied := public.coach_occupied_range(p_service_id,v_start,v_end);
  if not public.coach_schedule_allows(v_occupied) then return false; end if;
  select exists(select 1 from public.coach_schedule_exceptions x where x.date=p_date and x.kind='open'
    and (lower(v_occupied) at time zone 'Africa/Cairo')::time>=x.start_time
    and (upper(v_occupied) at time zone 'Africa/Cairo')::time<=x.end_time) into v_open;
  v_allowed := v_open;
  -- Reject nonexistent Cairo wall-clock times and sessions crossing midnight.
  if (v_start at time zone 'Africa/Cairo')::time <> p_time
    or extract(epoch from p_time)/60 + v_service.duration_minutes > 1440 then return false; end if;
  if (extract(hour from p_time)::int*60+extract(minute from p_time)::int) % (v_policy->>'slot_interval_minutes')::int <> 0
     or v_start < now() + make_interval(mins => (v_policy->>'minimum_notice_minutes')::int)
     or p_date > ((now() at time zone 'Africa/Cairo')::date + (v_policy->>'booking_window_days')::int) then return false; end if;
  select * into v_override from public.booking_slot_overrides where service_id=p_service_id and date=p_date and start_time=p_time;
  if found and v_override.mode='closed' then return false; end if;
  if found and v_override.mode='open' then v_allowed := true; end if;
  select * into v_exception from public.availability_exceptions where service_id=p_service_id and date=p_date;
  if found and v_exception.kind in ('closed','holiday','blackout') then return false; end if;
  if not v_allowed then
    select exists(select 1 from public.availability_rules r where r.service_id=p_service_id
      and r.weekday=extract(dow from p_date)::int
      and (lower(v_occupied) at time zone 'Africa/Cairo')::time>=r.start_time
      and (upper(v_occupied) at time zone 'Africa/Cairo')::time<=r.end_time) into v_allowed;
    if v_exception.kind='custom' then
      v_allowed := (lower(v_occupied) at time zone 'Africa/Cairo')::time>=v_exception.start_time
        and (upper(v_occupied) at time zone 'Africa/Cairo')::time<=v_exception.end_time;
    end if;
  end if;
  if not v_allowed then return false; end if;
  if exists(select 1 from public.coach_calendar_reservations r
    where (r.expires_at is null or r.expires_at>now())
      and not (r.source_kind='booking' and r.source_id is not distinct from p_ignore_booking_id)
      and not (r.source_kind='hold' and r.source_id is not distinct from p_ignore_hold_id)
      and r.occupied && tstzrange(v_start-make_interval(mins=>(v_policy->>'buffer_before_minutes')::int),
        v_end+make_interval(mins=>(v_policy->>'buffer_after_minutes')::int),'[)')) then return false; end if;
  return true;
end $$;


create or replace function public.booking_runtime_contract() returns jsonb language sql stable security definer set search_path='' as $$
 select public.booking_runtime_contract_093() || '{"coachCalendar":"097","coachWorkingHours":"103"}'::jsonb
$$;
