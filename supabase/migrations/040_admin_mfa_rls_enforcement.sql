-- 040: enforce AAL2 in the shared administrative authorization helpers.
-- Service-role server workflows retain their explicit, non-user-session access;
-- every browser/session-derived administrative decision now requires AAL2.
create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.role() = 'service_role' then exists (
      select 1 from public.admin_roles where user_id = uid
    )
    when uid is null or uid is distinct from auth.uid() then false
    when (select auth.jwt()->>'aal') <> 'aal2' then false
    else exists (select 1 from public.admin_roles where user_id = uid)
  end
$$;

create or replace function public.has_role(role_name text, uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.role() = 'service_role' then exists (
      select 1 from public.admin_roles where user_id = uid and role = role_name
    )
    when uid is null or uid is distinct from auth.uid() then false
    when (select auth.jwt()->>'aal') <> 'aal2' then false
    else exists (
      select 1 from public.admin_roles where user_id = uid and role = role_name
    )
  end
$$;

create or replace function public.has_permission(permission_name text, uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.role() <> 'service_role'
      and (uid is null or uid is distinct from auth.uid() or (select auth.jwt()->>'aal') <> 'aal2') then false
    else exists (
      select 1 from public.admin_roles ar
      where ar.user_id = uid and (
        ar.role = 'owner' or exists (
          select 1 from public.admin_permissions ap
          where ap.role = ar.role and ap.permission = permission_name
        )
      )
    )
  end
$$;

comment on function public.is_admin(uuid) is 'Administrative role check; authenticated user sessions require AAL2. Service-role calls remain server-only.';
comment on function public.has_role(text,uuid) is 'Administrative role check; authenticated user sessions require AAL2. Service-role calls remain server-only.';
comment on function public.has_permission(text,uuid) is 'Fail-closed permission check. Authenticated callers may evaluate only auth.uid() at AAL2; service-role workflows may pass an explicit uid.';

-- 039 protected only already-enrolled users. Replace it with a strict policy so
-- an AAL1 session can never read administrative role assignments.
drop policy if exists "admin roles: enrolled mfa requires aal2" on public.admin_roles;
create policy "admin roles: requires aal2" on public.admin_roles as restrictive to authenticated
using ((select auth.jwt()->>'aal') = 'aal2');

-- Rollback guidance: restore the prior helper definitions and drop this policy
-- only as part of a documented emergency-access procedure.
