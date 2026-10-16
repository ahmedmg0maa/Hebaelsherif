-- 015: booking integrity — the database is the final guard against double booking.
create extension if not exists btree_gist;

alter table public.bookings
  add constraint bookings_valid_range check (ends_at > starts_at);

alter table public.bookings
  add constraint bookings_no_time_overlap
  exclude using gist (
    service_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status in ('pending', 'confirmed'));

create index if not exists bookings_order_idx on public.bookings (order_id);

-- Existing live services predate availability rules. Give only unconfigured
-- services a sane default; once an admin adds rules, those rules remain authoritative.
insert into public.availability_rules (service_id, weekday, start_time, end_time, timezone)
select service.id, day.weekday, time '10:00', time '20:00', 'Africa/Cairo'
from public.services service
cross join (values (0), (1), (2), (3), (4), (6)) as day(weekday)
where service.is_active
  and not exists (
    select 1 from public.availability_rules configured
    where configured.service_id = service.id
  );

-- Expiring an unpaid order must release its reserved appointment as well.
create or replace function public.expire_stale_orders()
returns int language plpgsql security definer set search_path = public as $$
declare
  expired_ids uuid[];
  affected int;
begin
  with expired as (
    update public.orders
       set status = 'expired'
     where status = 'pending_payment'
       and expires_at is not null
       and expires_at < now()
    returning id
  )
  select coalesce(array_agg(id), array[]::uuid[]) into expired_ids from expired;

  affected := cardinality(expired_ids);
  if affected = 0 then return 0; end if;

  update public.bookings
     set status = 'cancelled'
   where order_id = any(expired_ids)
     and status = 'pending';

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, meta)
  select null, 'order.expired', 'order', orders.id::text,
         jsonb_build_object('user_id', orders.user_id, 'booking_released', true)
    from public.orders
   where orders.id = any(expired_ids);

  return affected;
end $$;
