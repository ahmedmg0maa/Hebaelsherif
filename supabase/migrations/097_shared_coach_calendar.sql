-- Shared single-coach calendar, enforced under concurrent writes by GiST.
-- Existing conflicting rows deliberately abort migration; never silently delete bookings.
create table public.coach_calendar_reservations (
 source_kind text not null check(source_kind in ('booking','hold')),
 source_id uuid not null,
 user_id uuid not null,
 service_id uuid not null,
 starts_at timestamptz not null,
 ends_at timestamptz not null,
 occupied tstzrange not null,
 expires_at timestamptz,
 primary key(source_kind,source_id),
 constraint coach_calendar_no_overlap exclude using gist(occupied with &&)
);
alter table public.coach_calendar_reservations enable row level security;
revoke all on public.coach_calendar_reservations from public,anon,authenticated,service_role;

create function public.coach_occupied_range(p_service uuid,p_start timestamptz,p_end timestamptz)
returns tstzrange language sql stable security definer set search_path='' as $$
 select tstzrange(p_start-make_interval(mins=>coalesce((p->>'buffer_before_minutes')::int,0)),
 p_end+make_interval(mins=>coalesce((p->>'buffer_after_minutes')::int,0)),'[)')
 from (select public.booking_service_policy(p_service) p) s
$$;
revoke all on function public.coach_occupied_range(uuid,timestamptz,timestamptz) from public,anon,authenticated,service_role;

insert into public.coach_calendar_reservations
 select 'booking',id,user_id,service_id,starts_at,ends_at,public.coach_occupied_range(service_id,starts_at,ends_at),null
 from public.bookings where status in ('pending','confirmed') and ends_at>now();
insert into public.coach_calendar_reservations
 select 'hold',id,user_id,service_id,starts_at,ends_at,public.coach_occupied_range(service_id,starts_at,ends_at),expires_at
 from public.booking_holds where status='active' and expires_at>now();

create function public.sync_coach_calendar() returns trigger
language plpgsql security definer set search_path='' as $$
declare k text:=case when tg_table_name='bookings' then 'booking' else 'hold' end; active boolean;
begin
 if tg_op='DELETE' then delete from public.coach_calendar_reservations where source_kind=k and source_id=old.id; return old; end if;
 -- Prune only expired leases, never a pending payment/real booking.
 delete from public.coach_calendar_reservations where expires_at<=now();
 if k='booking' then active:=new.status in ('pending','confirmed');
 else active:=new.status='active' and new.expires_at>now(); end if;
 if not active then delete from public.coach_calendar_reservations where source_kind=k and source_id=new.id; return new; end if;
 if tg_op='UPDATE' and new.starts_at=old.starts_at and new.ends_at=old.ends_at and new.service_id=old.service_id
 and exists(select 1 from public.coach_calendar_reservations where source_kind=k and source_id=new.id) then return new; end if;
 if k='booking' then
   -- Convert only this customer's exact held appointment in the same transaction.
   delete from public.coach_calendar_reservations where source_kind='hold' and user_id=new.user_id
     and service_id=new.service_id and starts_at=new.starts_at and ends_at=new.ends_at;
 end if;
 delete from public.coach_calendar_reservations where source_kind=k and source_id=new.id;
 if k='booking' then
 insert into public.coach_calendar_reservations values(k,new.id,new.user_id,new.service_id,new.starts_at,new.ends_at,
 public.coach_occupied_range(new.service_id,new.starts_at,new.ends_at),null);
 else
 insert into public.coach_calendar_reservations values(k,new.id,new.user_id,new.service_id,new.starts_at,new.ends_at,
 public.coach_occupied_range(new.service_id,new.starts_at,new.ends_at),new.expires_at);
 end if;
 return new;
exception when exclusion_violation then raise exception using errcode='23P01',message='SLOT_UNAVAILABLE';
end $$;
revoke all on function public.sync_coach_calendar() from public,anon,authenticated,service_role;
create trigger coach_calendar_booking after insert or update or delete on public.bookings for each row execute function public.sync_coach_calendar();
create trigger coach_calendar_hold after insert or update or delete on public.booking_holds for each row execute function public.sync_coach_calendar();
-- Defense in depth for bookings, including direct staff reschedules.
alter table public.bookings drop constraint bookings_no_time_overlap;
alter table public.bookings add constraint bookings_no_time_overlap exclude using gist(tstzrange(starts_at,ends_at,'[)') with &&) where(status in ('pending','confirmed'));

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
      and r.weekday=extract(dow from p_date)::int and p_time>=r.start_time
      and p_time+make_interval(mins=>v_service.duration_minutes)<=r.end_time) into v_allowed;
    if found and v_exception.kind='custom' then
      v_allowed := v_allowed and p_time>=v_exception.start_time
        and p_time+make_interval(mins=>v_service.duration_minutes)<=v_exception.end_time;
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

-- Integer cursor cannot wrap from midnight back to 00:00 and loop forever.
create or replace function public.available_booking_slots(p_service_id uuid,p_date date)
returns table(slot_time time) language plpgsql security definer set search_path='' as $$
declare v_policy jsonb; v_minutes integer := 0; v_step integer; v_time time;
begin
 v_policy:=public.booking_service_policy(p_service_id);
 if v_policy is null then return; end if;
 v_step:=greatest(5,least(1440,coalesce((v_policy->>'slot_interval_minutes')::int,30)));
 while v_minutes < 1440 loop
  v_time:=(time '00:00'+make_interval(mins=>v_minutes))::time;
  if public.booking_slot_is_available(p_service_id,p_date,v_time,null,null) then slot_time:=v_time; return next; end if;
  v_minutes:=v_minutes+v_step;
 end loop;
end $$;
revoke all on function public.available_booking_slots(uuid,date) from public;
grant execute on function public.available_booking_slots(uuid,date) to anon,authenticated;

-- Keep bounded calendar reads. An arbitrary public date range must not amplify work.
create or replace function public.available_booking_calendar(p_service_id uuid,p_from date,p_to date)
returns table(booking_date date,slot_time time) language plpgsql security definer set search_path='' as $$
begin
 if p_from is null or p_to is null or p_to<p_from or p_to-p_from>60 then raise exception using errcode='22023',message='INVALID_CALENDAR_RANGE'; end if;
 return query select day::date,s.slot_time from generate_series(p_from,p_to,interval '1 day') day
 cross join lateral public.available_booking_slots(p_service_id,day::date) s;
end $$;
-- Runtime callers must require this revision before accepting appointments.
alter function public.booking_runtime_contract() rename to booking_runtime_contract_093;
revoke all on function public.booking_runtime_contract_093() from public,anon,authenticated,service_role;
create function public.booking_runtime_contract() returns jsonb language sql stable security definer set search_path='' as $$
 select public.booking_runtime_contract_093() || '{"coachCalendar":"097"}'::jsonb
$$;
revoke all on function public.booking_runtime_contract() from public;
grant execute on function public.booking_runtime_contract() to anon,authenticated,service_role;
