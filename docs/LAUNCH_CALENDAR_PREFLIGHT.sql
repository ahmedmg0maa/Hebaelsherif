-- Read-only review before 097. Execute using an authorized database connection.
-- First query: all existing pending/confirmed overlaps (including historical rows).
select a.id as booking_a,b.id as booking_b,a.starts_at,a.ends_at,b.starts_at,b.ends_at
from public.bookings a join public.bookings b on a.id<b.id
where a.status in ('pending','confirmed') and b.status in ('pending','confirmed')
 and tstzrange(a.starts_at,a.ends_at,'[)') && tstzrange(b.starts_at,b.ends_at,'[)');
-- Second query: future bookings/active holds, including service policy buffers.
with reservations as (
 select 'booking' kind,id,service_id,starts_at,ends_at from public.bookings where status in ('pending','confirmed') and ends_at>now()
 union all
 select 'hold',id,service_id,starts_at,ends_at from public.booking_holds where status='active' and expires_at>now()
), occupied as (
 select r.*,tstzrange(starts_at-make_interval(mins=>coalesce((p->>'buffer_before_minutes')::int,0)),
 ends_at+make_interval(mins=>coalesce((p->>'buffer_after_minutes')::int,0)),'[)') span
 from reservations r cross join lateral (select public.booking_service_policy(r.service_id) p) policy
)
select a.kind,a.id,b.kind,b.id,a.starts_at,b.starts_at from occupied a join occupied b
 on (a.kind,a.id)<(b.kind,b.id) and a.span && b.span;
