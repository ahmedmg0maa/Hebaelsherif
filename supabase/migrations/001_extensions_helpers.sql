-- 001: extensions + shared helper functions
create extension if not exists "pgcrypto";

-- role helper bodies reference tables created in later migrations
set check_function_bodies = off;

-- updated_at maintenance
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- role helpers (security definer so RLS policies can call them without recursion)
create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_roles where user_id = uid);
$$;

create or replace function public.has_role(role_name text, uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_roles where user_id = uid and role = role_name);
$$;
