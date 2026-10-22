-- 031: authenticated callers may only evaluate their own permissions.
create or replace function public.has_permission(permission_name text, uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public as $$
  select case
    when uid is null then false
    when auth.uid() is not null and uid <> auth.uid() then false
    else exists (
      select 1 from public.admin_roles ar
      where ar.user_id=uid and (
        ar.role='owner' or exists (
          select 1 from public.admin_permissions ap
          where ap.role=ar.role and ap.permission=permission_name
        )
      )
    )
  end
$$;
comment on function public.has_permission(text,uuid) is 'Fail-closed permission check. Authenticated callers can evaluate auth.uid() only; service-role workflows may pass an explicit uid.';
