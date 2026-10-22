-- 002: profiles, roles, audit, notifications, user notes/tags
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), coalesce(new.email, ''));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.admin_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','support','editor')),
  granted_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create table public.admin_permissions (
  id uuid primary key default gen_random_uuid(),
  role text not null,
  permission text not null,
  unique (role, permission)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index audit_logs_created_idx on public.audit_logs (created_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null default '',
  kind text not null default 'info',
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.user_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  note text not null,
  created_at timestamptz not null default now()
);

create table public.user_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tag text not null,
  created_at timestamptz not null default now(),
  unique (user_id, tag)
);

-- RLS
alter table public.profiles enable row level security;
alter table public.admin_roles enable row level security;
alter table public.admin_permissions enable row level security;
alter table public.audit_logs enable row level security;
alter table public.notifications enable row level security;
alter table public.user_notes enable row level security;
alter table public.user_tags enable row level security;

create policy "profiles: own read" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profiles: own update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles: admin update" on public.profiles for update using (public.is_admin());

create policy "admin_roles: admin read" on public.admin_roles for select using (public.is_admin());
create policy "admin_roles: owner manages" on public.admin_roles for all
  using (public.has_role('owner')) with check (public.has_role('owner'));

create policy "admin_permissions: admin read" on public.admin_permissions for select using (public.is_admin());
create policy "admin_permissions: owner manages" on public.admin_permissions for all
  using (public.has_role('owner')) with check (public.has_role('owner'));

create policy "audit_logs: admin read" on public.audit_logs for select using (public.is_admin());
create policy "audit_logs: admin insert" on public.audit_logs for insert with check (public.is_admin());

create policy "notifications: own read" on public.notifications for select using (user_id = auth.uid());
create policy "notifications: own mark-read" on public.notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications: admin insert" on public.notifications for insert with check (public.is_admin());

create policy "user_notes: admin only" on public.user_notes for all using (public.is_admin()) with check (public.is_admin());
create policy "user_tags: admin only" on public.user_tags for all using (public.is_admin()) with check (public.is_admin());
