-- 007: workshops, registrations, attendance, resources, recordings
create table public.workshops (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  slug text not null unique,
  title text not null,
  description text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  seats_total int not null default 0,
  seats_reserved int not null default 0,
  location_kind text not null default 'online' check (location_kind in ('online','in_person','hybrid')),
  location_text text,
  meeting_url text,
  cover_url text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger workshops_updated before update on public.workshops for each row execute function public.set_updated_at();

create table public.workshop_registrations (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid references public.orders(id),
  status text not null default 'registered' check (status in ('registered','cancelled','waitlisted')),
  created_at timestamptz not null default now(),
  unique (workshop_id, user_id)
);

create table public.workshop_attendance (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.workshop_registrations(id) on delete cascade,
  attended_at timestamptz not null default now(),
  minutes int not null default 0
);

create table public.workshop_resources (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  title text not null,
  file_path text not null,
  kind text not null default 'pdf' check (kind in ('pdf','zip','link','audio'))
);

create table public.workshop_recordings (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  title text not null,
  storage_path text not null,
  duration_seconds int not null default 0,
  published_at timestamptz
);

-- RLS
alter table public.workshops enable row level security;
alter table public.workshop_registrations enable row level security;
alter table public.workshop_attendance enable row level security;
alter table public.workshop_resources enable row level security;
alter table public.workshop_recordings enable row level security;

create policy "workshops: public read published" on public.workshops for select using (is_published or public.is_admin());
create policy "workshops: admin write" on public.workshops for all using (public.is_admin()) with check (public.is_admin());

create policy "ws_registrations: own read" on public.workshop_registrations for select
  using (user_id = auth.uid() or public.is_admin());
create policy "ws_registrations: admin write" on public.workshop_registrations for all
  using (public.is_admin()) with check (public.is_admin());

create policy "ws_attendance: own read" on public.workshop_attendance for select
  using (public.is_admin() or exists
    (select 1 from public.workshop_registrations r where r.id = registration_id and r.user_id = auth.uid()));
create policy "ws_attendance: admin write" on public.workshop_attendance for all
  using (public.is_admin()) with check (public.is_admin());

create policy "ws_resources: registered read" on public.workshop_resources for select
  using (public.is_admin() or exists
    (select 1 from public.workshop_registrations r
     where r.workshop_id = workshop_resources.workshop_id and r.user_id = auth.uid() and r.status = 'registered'));
create policy "ws_resources: admin write" on public.workshop_resources for all
  using (public.is_admin()) with check (public.is_admin());

create policy "ws_recordings: registered read" on public.workshop_recordings for select
  using (public.is_admin() or (published_at is not null and exists
    (select 1 from public.workshop_registrations r
     where r.workshop_id = workshop_recordings.workshop_id and r.user_id = auth.uid() and r.status = 'registered')));
create policy "ws_recordings: admin write" on public.workshop_recordings for all
  using (public.is_admin()) with check (public.is_admin());
