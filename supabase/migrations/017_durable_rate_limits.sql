-- 017: durable, atomic rate limiting for sensitive authenticated actions.
-- Buckets are intentionally unreadable from the API; callers only receive the
-- decision returned by the security-definer function.

create table if not exists public.action_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null,
  window_started_at timestamptz not null,
  hits int not null default 1 check (hits > 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, scope, window_started_at)
);

alter table public.action_rate_limits enable row level security;
revoke all on table public.action_rate_limits from anon, authenticated;

create or replace function public.consume_action_rate_limit(
  p_scope text,
  p_max_hits int,
  p_window_seconds int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_window_start timestamptz;
  v_hits int;
  v_retry_after int;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if p_scope not in ('coupon', 'payment_proof')
     or p_max_hits < 1 or p_max_hits > 100
     or p_window_seconds < 10 or p_window_seconds > 86400 then
    raise exception 'INVALID_RATE_LIMIT' using errcode = '22023';
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds
  );

  insert into public.action_rate_limits (user_id, scope, window_started_at, hits)
  values (v_user_id, p_scope, v_window_start, 1)
  on conflict (user_id, scope, window_started_at)
  do update set hits = public.action_rate_limits.hits + 1, updated_at = now()
  returning hits into v_hits;

  v_retry_after := greatest(
    1,
    ceil(extract(epoch from (v_window_start + make_interval(secs => p_window_seconds) - clock_timestamp())))::int
  );

  -- Opportunistic pruning keeps the table bounded without a separate scheduler.
  delete from public.action_rate_limits
   where updated_at < now() - interval '2 days';

  return jsonb_build_object(
    'allowed', v_hits <= p_max_hits,
    'retryAfterSec', case when v_hits <= p_max_hits then 0 else v_retry_after end
  );
end;
$$;

revoke all on function public.consume_action_rate_limit(text, int, int) from public;
grant execute on function public.consume_action_rate_limit(text, int, int) to authenticated;

