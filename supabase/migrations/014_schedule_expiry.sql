-- 014: schedule hourly order expiry (closes KNOWN_ISSUES #3 end-to-end)
create extension if not exists pg_cron;

-- idempotent: unschedule an existing job with the same name first
do $$
begin
  if exists (select 1 from cron.job where jobname = 'expire-stale-orders') then
    perform cron.unschedule('expire-stale-orders');
  end if;
  perform cron.schedule('expire-stale-orders', '0 * * * *', 'select public.expire_stale_orders()');
end $$;
