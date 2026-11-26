-- 041: application-owned administrative session controls and serialized login throttling.
create table if not exists public.admin_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  device_label text not null default 'Web browser',
  request_fingerprint text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  idle_expires_at timestamptz not null,
  absolute_expires_at timestamptz not null,
  revoked_at timestamptz,
  check (absolute_expires_at > created_at),
  check (idle_expires_at <= absolute_expires_at)
);
create index if not exists admin_sessions_user_active_idx on public.admin_sessions(user_id, revoked_at, last_seen_at desc);
alter table public.admin_sessions enable row level security;
create policy "admin sessions: aal2 own read" on public.admin_sessions for select to authenticated
using (user_id = auth.uid() and (select auth.jwt()->>'aal') = 'aal2');

create table if not exists public.admin_login_throttles (
  throttle_key text primary key,
  window_started_at timestamptz not null default now(),
  failed_count integer not null default 0 check (failed_count >= 0),
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.admin_login_throttles enable row level security;

create or replace function public.consume_admin_login_throttle(p_key text, p_outcome text)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  record_row public.admin_login_throttles%rowtype;
  next_failures integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'server role required' using errcode = '42501';
  end if;
  if length(p_key) <> 64 or p_key !~ '^[0-9a-f]{64}$' or p_outcome not in ('attempt', 'failure', 'success') then
    raise exception 'invalid login throttle request' using errcode = '22023';
  end if;

  insert into public.admin_login_throttles (throttle_key) values (p_key)
  on conflict (throttle_key) do nothing;
  select * into record_row from public.admin_login_throttles where throttle_key = p_key for update;

  if p_outcome = 'success' then
    delete from public.admin_login_throttles where throttle_key = p_key;
    return query select true, 0;
    return;
  end if;

  if record_row.blocked_until is not null and record_row.blocked_until > now() then
    return query select false, greatest(1, ceil(extract(epoch from record_row.blocked_until - now()))::integer);
    return;
  end if;

  if p_outcome = 'attempt' then
    return query select true, 0;
    return;
  end if;

  next_failures := case when record_row.window_started_at < now() - interval '15 minutes' then 1 else record_row.failed_count + 1 end;
  update public.admin_login_throttles
  set window_started_at = case when record_row.window_started_at < now() - interval '15 minutes' then now() else window_started_at end,
      failed_count = next_failures,
      blocked_until = case
        when next_failures >= 10 then now() + interval '30 minutes'
        when next_failures >= 5 then now() + interval '5 minutes'
        else null
      end,
      updated_at = now()
  where throttle_key = p_key;

  return query select true, 0;
end
$$;
revoke all on function public.consume_admin_login_throttle(text, text) from public, anon, authenticated;
grant execute on function public.consume_admin_login_throttle(text, text) to service_role;
comment on function public.consume_admin_login_throttle(text,text) is 'Server-only serialized administrative login throttle keyed by a privacy-minimized hash.';

-- Rollback guidance: application session enforcement must be disabled before
-- dropping these tables/functions; do not remove authentication history first.
