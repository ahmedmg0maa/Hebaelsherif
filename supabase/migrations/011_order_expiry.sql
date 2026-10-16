-- 011: automatic expiry for stale unpaid orders (KNOWN_ISSUES #3)
create or replace function public.expire_stale_orders()
returns int language plpgsql security definer set search_path = public as $$
declare
  affected int;
begin
  with expired as (
    update public.orders
       set status = 'expired'
     where status = 'pending_payment'
       and expires_at is not null
       and expires_at < now()
    returning id, user_id
  ), logged as (
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, meta)
    select null, 'order.expired', 'order', id::text, jsonb_build_object('user_id', user_id)
      from expired
    returning 1
  )
  select count(*) into affected from expired;
  return affected;
end $$;

-- Schedule hourly with pg_cron (enable the extension in Supabase dashboard → Database → Extensions):
--   select cron.schedule('expire-stale-orders', '0 * * * *', $$select public.expire_stale_orders()$$);
-- Alternatively call it from a Supabase Edge Function on a schedule.
