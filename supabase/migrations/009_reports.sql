-- 009: reporting + analytics + system events
create table public.report_snapshots (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  period_start date not null,
  period_end date not null,
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  session_id text,
  name text not null,
  props jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index analytics_events_name_idx on public.analytics_events (name, created_at desc);

create table public.system_events (
  id uuid primary key default gen_random_uuid(),
  level text not null default 'info' check (level in ('debug','info','warn','error')),
  source text not null,
  message text not null,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- RLS
alter table public.report_snapshots enable row level security;
alter table public.analytics_events enable row level security;
alter table public.system_events enable row level security;

create policy "reports: admin only" on public.report_snapshots for all using (public.is_admin()) with check (public.is_admin());
create policy "analytics: anyone insert" on public.analytics_events for insert with check (true);
create policy "analytics: admin read" on public.analytics_events for select using (public.is_admin());
create policy "system_events: admin only" on public.system_events for all using (public.is_admin()) with check (public.is_admin());
