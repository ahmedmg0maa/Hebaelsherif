-- 060: owner-only, atomic and race-safe role/permission governance.
-- LOCAL ONLY. Apply after 059 on authorized Staging.

drop policy if exists "admin_roles: owner manages" on public.admin_roles;
drop policy if exists "admin_permissions: owner manages" on public.admin_permissions;
drop policy if exists "admin_roles: admin read" on public.admin_roles;
drop policy if exists "admin_permissions: admin read" on public.admin_permissions;
create policy "admin roles: own or role managers read" on public.admin_roles for select
  using (user_id = auth.uid() or public.has_permission('roles.manage'));
create policy "admin permissions: role managers read" on public.admin_permissions for select
  using (public.has_permission('roles.manage'));
revoke insert, update, delete on table public.admin_roles from anon, authenticated;
revoke insert, update, delete on table public.admin_permissions from anon, authenticated;

create or replace function public.get_admin_role_governance(p_actor_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
  v_role_count integer;
  v_permission_count integer;
begin
  if p_actor_id is null
     or not public.has_role('owner', p_actor_id)
     or not public.has_permission('roles.manage', p_actor_id) then
    raise exception using errcode = '42501', message = 'owner_role_management_required';
  end if;

  select count(*) into v_role_count from public.admin_roles;
  select count(*) into v_permission_count from public.admin_permissions;
  v_result := jsonb_build_object(
    'assignments', (
      select coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.created_at), '[]'::jsonb)
      from (
        select ar.id, ar.user_id, ar.role, ar.created_at, p.email
          from public.admin_roles ar
          left join public.profiles p on p.id = ar.user_id
         order by ar.created_at
         limit 500
      ) row_data
    ),
    'permissions', (
      select coalesce(jsonb_agg(to_jsonb(row_data) order by row_data.role, row_data.permission), '[]'::jsonb)
      from (
        select ap.role, ap.permission
          from public.admin_permissions ap
         order by ap.role, ap.permission
         limit 1000
      ) row_data
    ),
    'counts', jsonb_build_object(
      'assignments', v_role_count,
      'permissions', v_permission_count,
      'owners', (select count(*) from public.admin_roles where role = 'owner')
    )
  );

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
  values (p_actor_id, 'roles.matrix_viewed', 'admin_role_matrix', null,
    jsonb_build_object('assignmentCount', v_role_count, 'permissionCount', v_permission_count, 'includesPii', true, 'bounded', true));
  return v_result;
end $$;

create or replace function public.manage_admin_role(
  p_actor_id uuid,
  p_action text,
  p_target_user_id uuid default null,
  p_role text default null,
  p_role_id uuid default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := lower(btrim(coalesce(p_role, '')));
  v_target public.admin_roles%rowtype;
  v_id uuid;
begin
  if p_actor_id is null
     or not public.has_role('owner', p_actor_id)
     or not public.has_permission('roles.manage', p_actor_id) then
    raise exception using errcode = '42501', message = 'owner_role_management_required';
  end if;
  if p_action not in ('grant', 'revoke') then
    raise exception using errcode = '22023', message = 'role_action_invalid';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('admin-role-governance', 0));
  if p_action = 'grant' then
    if p_target_user_id is null or not exists (select 1 from public.profiles where id = p_target_user_id) then
      raise exception using errcode = 'P0002', message = 'role_target_not_found';
    end if;
    if v_role not in ('owner','admin','operations','finance','content','marketing','support','editor') then
      raise exception using errcode = '22023', message = 'role_name_invalid';
    end if;
    if p_target_user_id = p_actor_id then
      raise exception using errcode = '42501', message = 'self_role_change_forbidden';
    end if;

    select * into v_target from public.admin_roles
     where user_id = p_target_user_id and role = v_role;
    if found then return v_target.id; end if;
    insert into public.admin_roles(user_id, role, granted_by)
    values (p_target_user_id, v_role, p_actor_id)
    returning id into v_id;
  else
    if p_role_id is null then
      raise exception using errcode = '22023', message = 'role_id_required';
    end if;
    select * into v_target from public.admin_roles where id = p_role_id for update;
    if not found then raise exception using errcode = 'P0002', message = 'role_assignment_not_found'; end if;
    if v_target.user_id = p_actor_id then
      raise exception using errcode = '42501', message = 'self_role_change_forbidden';
    end if;
    if v_target.role = 'owner' and (select count(*) from public.admin_roles where role = 'owner') <= 1 then
      raise exception using errcode = '23514', message = 'last_owner_removal_forbidden';
    end if;
    delete from public.admin_roles where id = v_target.id returning id into v_id;
    v_role := v_target.role;
    p_target_user_id := v_target.user_id;
  end if;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
  values (
    p_actor_id,
    'role.' || p_action,
    'admin_role',
    v_id::text,
    jsonb_build_object('role', v_role, 'targetUserId', p_target_user_id)
  );
  return v_id;
end $$;

create or replace function public.set_admin_role_permissions(
  p_actor_id uuid,
  p_role text,
  p_permissions text[]
) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := lower(btrim(coalesce(p_role, '')));
  v_permissions text[];
  v_allowed constant text[] := array[
    'admin.access','roles.manage','users.view','users.manage','payments.view','payments.approve','payments.reject',
    'orders.view','orders.update','orders.refund','bookings.view','bookings.manage','availability.manage','packages.manage',
    'catalog.view','catalog.manage','catalog.publish','catalog.delete','content.view','content.manage','content.publish','content.delete','learning.manage',
    'media.view','media.manage','media.delete','settings.view','settings.manage','feature_flags.manage','inbox.view','inbox.manage','newsletter.manage',
    'reviews.manage','press.manage','resources.manage','assessments.manage','reports.view','reports.export','reports.snapshot','marketing.manage',
    'audit.view','system.view','notifications.send','admin.search'
  ];
begin
  if p_actor_id is null
     or not public.has_role('owner', p_actor_id)
     or not public.has_permission('roles.manage', p_actor_id) then
    raise exception using errcode = '42501', message = 'owner_role_management_required';
  end if;
  if v_role not in ('admin','operations','finance','content','marketing','support','editor') then
    raise exception using errcode = '22023', message = 'editable_role_required';
  end if;

  select coalesce(array_agg(distinct permission order by permission), array[]::text[])
    into v_permissions
    from unnest(coalesce(p_permissions, array[]::text[])) permission;
  if not ('admin.access' = any(v_permissions))
     or 'roles.manage' = any(v_permissions)
     or exists (select 1 from unnest(v_permissions) permission where not (permission = any(v_allowed))) then
    raise exception using errcode = '22023', message = 'role_permission_set_invalid';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('admin-permissions:' || v_role, 0));
  delete from public.admin_permissions where role = v_role;
  insert into public.admin_permissions(role, permission)
  select v_role, permission from unnest(v_permissions) permission;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
  values (p_actor_id, 'permissions.updated', 'admin_role', v_role,
    jsonb_build_object('permissionCount', cardinality(v_permissions), 'adminAccessRetained', true));
  return cardinality(v_permissions);
end $$;

revoke all on function public.get_admin_role_governance(uuid) from public, anon, authenticated;
revoke all on function public.manage_admin_role(uuid, text, uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.set_admin_role_permissions(uuid, text, text[]) from public, anon, authenticated;
grant execute on function public.get_admin_role_governance(uuid) to service_role;
grant execute on function public.manage_admin_role(uuid, text, uuid, text, uuid) to service_role;
grant execute on function public.set_admin_role_permissions(uuid, text, text[]) to service_role;

comment on function public.get_admin_role_governance(uuid) is 'Owner-only bounded role matrix with PII-access audit.';
comment on function public.manage_admin_role(uuid,text,uuid,text,uuid) is 'Owner-only atomic role grant/revoke with self-change and concurrent last-owner protection.';
comment on function public.set_admin_role_permissions(uuid,text,text[]) is 'Owner-only atomic permission replacement with explicit registry validation and metadata-only audit.';

-- Rollback-by-forward-fix: preserve role/audit history. Replace these functions
-- or policies in a later migration; never re-enable browser-direct mutations.
