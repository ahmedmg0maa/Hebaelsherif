create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  avatar_url text,
  role public.app_role not null default 'user',
  status text not null default 'active' check (status in ('active', 'suspended', 'archived')),
  locale text not null default 'ar-EG',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.admin_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  permissions jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, role)
);

create table public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  is_public boolean not null default false,
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger trg_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger trg_admin_roles_updated_at before update on public.admin_roles for each row execute function public.set_updated_at();
create trigger trg_site_settings_updated_at before update on public.site_settings for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select ar.role from public.admin_roles ar where ar.user_id = auth.uid() and ar.is_active = true order by ar.created_at desc limit 1),
    (select p.role from public.profiles p where p.id = auth.uid()),
    'user'::public.app_role
  );
$$;

create or replace function public.is_admin(allowed public.app_role[] default array['owner','super_admin','admin','support','content_manager','finance','viewer']::public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() = any(allowed);
$$;
