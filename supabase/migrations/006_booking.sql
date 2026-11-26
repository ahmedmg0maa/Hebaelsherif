-- 006: services, availability, bookings, events, reschedules
create table public.services (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  slug text not null unique,
  title text not null,
  description text not null default '',
  duration_minutes int not null default 60,
  price numeric(10,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  timezone text not null default 'Africa/Cairo'
);

create table public.availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  date date not null,
  is_closed boolean not null default true,
  start_time time,
  end_time time
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  service_id uuid not null references public.services(id),
  order_id uuid references public.orders(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending','confirmed','completed','cancelled','no_show')),
  meeting_url text,
  customer_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger bookings_updated before update on public.bookings for each row execute function public.set_updated_at();
create index bookings_time_idx on public.bookings (starts_at);
create index bookings_user_idx on public.bookings (user_id, starts_at desc);

create table public.booking_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  actor_id uuid references auth.users(id),
  event text not null,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.booking_reschedule_requests (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  requested_by uuid not null references auth.users(id),
  proposed_starts_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','approved','declined')),
  reason text not null default '',
  created_at timestamptz not null default now()
);

-- RLS
alter table public.services enable row level security;
alter table public.availability_rules enable row level security;
alter table public.availability_exceptions enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_events enable row level security;
alter table public.booking_reschedule_requests enable row level security;

create policy "services: public read active" on public.services for select using (is_active or public.is_admin());
create policy "services: admin write" on public.services for all using (public.is_admin()) with check (public.is_admin());

create policy "availability_rules: public read" on public.availability_rules for select using (true);
create policy "availability_rules: admin write" on public.availability_rules for all using (public.is_admin()) with check (public.is_admin());
create policy "availability_exceptions: public read" on public.availability_exceptions for select using (true);
create policy "availability_exceptions: admin write" on public.availability_exceptions for all using (public.is_admin()) with check (public.is_admin());

create policy "bookings: own read" on public.bookings for select using (user_id = auth.uid() or public.is_admin());
create policy "bookings: own create pending" on public.bookings for insert
  with check (user_id = auth.uid() and status = 'pending');
create policy "bookings: admin update" on public.bookings for update using (public.is_admin());

create policy "booking_events: own read" on public.booking_events for select
  using (public.is_admin() or exists (select 1 from public.bookings b where b.id = booking_id and b.user_id = auth.uid()));
create policy "booking_events: admin insert" on public.booking_events for insert with check (public.is_admin());

create policy "reschedules: own" on public.booking_reschedule_requests for select
  using (requested_by = auth.uid() or public.is_admin());
create policy "reschedules: own insert" on public.booking_reschedule_requests for insert
  with check (requested_by = auth.uid()
    and exists (select 1 from public.bookings b where b.id = booking_id and b.user_id = auth.uid()));
create policy "reschedules: admin update" on public.booking_reschedule_requests for update using (public.is_admin());
