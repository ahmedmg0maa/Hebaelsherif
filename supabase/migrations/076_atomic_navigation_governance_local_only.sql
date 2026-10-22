-- 076: atomic navigation mutation and audit governance.
-- LOCAL ONLY. Apply after 075 on authorized Staging with a verified recovery
-- point and schema fingerprint. Never apply to Production from this workspace.

drop policy if exists "navigation: permitted write" on public.navigation_items;
revoke insert, update, delete on table public.navigation_items from anon, authenticated;

alter table public.navigation_items
  add constraint navigation_label_bounds_076
  check (length(btrim(label)) between 2 and 80 and label !~ '[[:cntrl:]]') not valid,
  add constraint navigation_href_internal_076
  check (
    length(href) between 1 and 180
    and left(href, 1) = '/'
    and left(href, 2) <> '//'
    and href !~ '[[:space:]]'
    and position(chr(92) in href) = 0
  ) not valid,
  add constraint navigation_sort_bounds_076
  check (sort between 0 and 1000) not valid;

create or replace function public.manage_navigation_item(
  p_actor_id uuid,
  p_action text,
  p_item_id uuid default null,
  p_menu text default null,
  p_label text default null,
  p_href text default null,
  p_sort integer default null,
  p_is_visible boolean default true
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.navigation_items%rowtype;
  v_id uuid;
  v_label text := btrim(coalesce(p_label, ''));
  v_href text := btrim(coalesce(p_href, ''));
  v_count integer;
  v_children integer;
  v_action text;
begin
  if p_actor_id is null or not public.has_permission('settings.manage', p_actor_id) then
    raise exception using errcode = '42501', message = 'settings_management_required';
  end if;
  if p_action is null or p_action not in ('create', 'update', 'delete') then
    raise exception using errcode = '22023', message = 'navigation_operation_invalid';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('navigation-items', 0));

  if p_action <> 'delete' then
    if p_menu is null
       or p_menu not in ('header','footer_platform','footer_about','footer_legal')
       or length(v_label) not between 2 and 80
       or v_label ~ '[[:cntrl:]]'
       or length(v_href) not between 1 and 180
       or left(v_href, 1) <> '/'
       or left(v_href, 2) = '//'
       or v_href ~ '[[:space:]]'
       or position(chr(92) in v_href) > 0
       or p_sort is null
       or p_sort not between 0 and 1000 then
      raise exception using errcode = '22023', message = 'navigation_payload_invalid';
    end if;
  end if;

  if p_action = 'create' then
    if p_item_id is not null then
      raise exception using errcode = '22023', message = 'navigation_create_identity_invalid';
    end if;
    select count(*)::integer into v_count from public.navigation_items;
    if v_count >= 200 then
      raise exception using errcode = '54000', message = 'navigation_limit_reached';
    end if;
    insert into public.navigation_items(menu, label, href, sort, is_visible, parent_id)
    values (p_menu, v_label, v_href, p_sort, coalesce(p_is_visible, true), null)
    returning id into v_id;
    v_action := 'navigation.created';
  else
    if p_item_id is null then
      raise exception using errcode = '22023', message = 'navigation_identity_required';
    end if;
    select * into v_item from public.navigation_items where id = p_item_id for update;
    if not found then
      raise exception using errcode = 'P0002', message = 'navigation_item_not_found';
    end if;

    if p_action = 'delete' then
      select count(*)::integer into v_children
        from public.navigation_items where parent_id = v_item.id;
      if v_children > 0 then
        raise exception using errcode = '23503', message = 'navigation_item_has_children';
      end if;
      delete from public.navigation_items where id = v_item.id;
      v_id := v_item.id;
      v_action := 'navigation.deleted';
    else
      if v_item.parent_id is not null and not exists (
        select 1 from public.navigation_items parent
         where parent.id = v_item.parent_id and parent.menu = p_menu
      ) then
        raise exception using errcode = '23514', message = 'navigation_parent_menu_mismatch';
      end if;
      update public.navigation_items
         set menu = p_menu,
             label = v_label,
             href = v_href,
             sort = p_sort,
             is_visible = coalesce(p_is_visible, false)
       where id = v_item.id
       returning id into v_id;
      v_action := 'navigation.updated';
    end if;
  end if;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
  values (
    p_actor_id,
    v_action,
    'navigation_item',
    v_id::text,
    jsonb_build_object(
      'menu', case when p_action = 'delete' then v_item.menu else p_menu end,
      'sort', case when p_action = 'delete' then v_item.sort else p_sort end,
      'visible', case when p_action = 'delete' then v_item.is_visible else coalesce(p_is_visible, false) end,
      'hadParent', case when p_action = 'delete' then v_item.parent_id is not null else coalesce(v_item.parent_id is not null, false) end
    )
  );

  return jsonb_build_object('id', v_id, 'action', v_action);
end $$;

revoke all on function public.manage_navigation_item(uuid,text,uuid,text,text,text,integer,boolean)
  from public, anon, authenticated;
grant execute on function public.manage_navigation_item(uuid,text,uuid,text,text,text,integer,boolean)
  to service_role;

comment on function public.manage_navigation_item(uuid,text,uuid,text,text,text,integer,boolean) is
  'Service-only bounded navigation create/update/delete with repeated permission, aggregate serialization and metadata-only audit in one transaction.';

-- Rollback-by-forward-fix: preserve audit history. Replace this function or
-- constraints in a later migration; never restore browser-direct writes.
