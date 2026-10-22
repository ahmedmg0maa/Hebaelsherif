-- 018: full admin control center — memberships, content history, richer booking controls

alter table public.bookings
  add column if not exists admin_notes text not null default '';

-- One working window per service/day. Admins can still close or override a date
-- through availability_exceptions.
with ranked as (
  select id, row_number() over (partition by service_id, weekday order by id) as rn
  from public.availability_rules
)
delete from public.availability_rules a
using ranked r
where a.id = r.id and r.rn > 1;

create unique index if not exists availability_rules_service_weekday_uidx
  on public.availability_rules(service_id, weekday);

create unique index if not exists availability_exceptions_service_date_uidx
  on public.availability_exceptions(service_id, date);

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  price numeric(10,2) not null default 0 check (price >= 0),
  currency text not null default 'EGP',
  billing_interval text not null default 'month'
    check (billing_interval in ('month','quarter','year','one_time')),
  duration_days int not null default 30 check (duration_days > 0),
  sessions_included int not null default 0 check (sessions_included >= 0),
  max_subscribers int check (max_subscribers is null or max_subscribers > 0),
  features jsonb not null default '[]'::jsonb,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  is_published boolean not null default false,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

drop trigger if exists subscription_plans_updated on public.subscription_plans;
create trigger subscription_plans_updated before update on public.subscription_plans
  for each row execute function public.set_updated_at();

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id) on delete restrict,
  order_id uuid references public.orders(id) on delete set null,
  status text not null default 'active'
    check (status in ('pending','active','paused','cancelled','expired')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  sessions_used int not null default 0 check (sessions_used >= 0),
  auto_renew boolean not null default false,
  admin_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists subscriptions_user_status_idx on public.subscriptions(user_id, status);
create index if not exists subscriptions_plan_status_idx on public.subscriptions(plan_id, status);

drop trigger if exists subscriptions_updated on public.subscriptions;
create trigger subscriptions_updated before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- Stores recoverable snapshots for important admin edits. This is separate from
-- audit_logs: audit_logs answers who/when, revisions preserve the previous payload.
create table if not exists public.content_revisions (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  snapshot jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists content_revisions_entity_idx
  on public.content_revisions(entity_type, entity_id, created_at desc);

alter table public.subscription_plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.content_revisions enable row level security;

drop policy if exists "plans: public read published" on public.subscription_plans;
create policy "plans: public read published" on public.subscription_plans for select
  using ((is_published and is_active) or public.is_admin());
drop policy if exists "plans: admin write" on public.subscription_plans;
create policy "plans: admin write" on public.subscription_plans for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "subscriptions: own read" on public.subscriptions;
create policy "subscriptions: own read" on public.subscriptions for select
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists "subscriptions: admin write" on public.subscriptions;
create policy "subscriptions: admin write" on public.subscriptions for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "content revisions: admin read" on public.content_revisions;
create policy "content revisions: admin read" on public.content_revisions for select
  using (public.is_admin());
drop policy if exists "content revisions: admin insert" on public.content_revisions;
create policy "content revisions: admin insert" on public.content_revisions for insert
  with check (public.is_admin());
