-- LOCAL ONLY. Catalog withdrawal preserves all customer entitlements and delivery bindings.
begin;
alter table public.products add column if not exists archived_at timestamptz;
alter table public.products add constraint archived_product_unpublished check(archived_at is null or not is_published);
create or replace function public.guard_archived_catalog_product() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  if old.archived_at is not null and new.archived_at is not null then raise exception using errcode='22023',message='catalog_restore_required'; end if;
  return new;
end $$;
create trigger archived_catalog_product_guard before update on public.products for each row execute function public.guard_archived_catalog_product();
create or replace function public.manage_catalog_lifecycle(p_actor_id uuid,p_kind text,p_id uuid,p_action text,p_expected_archived_at timestamptz default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare tbl text; d jsonb; p public.products%rowtype; published boolean;
begin
  tbl:=case p_kind when 'course' then 'courses' when 'book' then 'books' when 'workshop' then 'workshops' when 'service' then 'services' end;
  if tbl is null or p_action is null or p_action not in ('archive','restore') or p_id is null then raise exception using errcode='22023',message='catalog_action_invalid'; end if;
  if p_actor_id is null or public.has_permission('catalog.manage',p_actor_id) is not true then raise exception using errcode='42501',message='catalog_permission_required'; end if;
  execute format('select to_jsonb(d) from public.%I d where id=$1 for update',tbl) into d using p_id;
  if d is null then raise exception using errcode='P0002',message='catalog_not_found'; end if;
  select * into p from public.products where id=(d->>'product_id')::uuid for update;
  if not found or p.type<>(case when p_kind='service' then 'session' else p_kind end) then raise exception using errcode='22023',message='catalog_link_invalid'; end if;
  if p.archived_at is distinct from p_expected_archived_at then raise exception using errcode='40001',message='catalog_lifecycle_stale'; end if;
  published:=p.is_published or coalesce((d->>(case when p_kind='service' then 'is_active' else 'is_published' end))::boolean,false);
  if published and public.has_permission('catalog.publish',p_actor_id) is not true then raise exception using errcode='42501',message='catalog_publish_required'; end if;
  if(p_action='archive' and p.archived_at is not null)or(p_action='restore' and p.archived_at is null)then return jsonb_build_object('id',p_id,'slug',p.slug,'unchanged',true); end if;
  insert into public.content_revisions(entity_type,entity_id,snapshot,created_by)values(p_kind,p_id,jsonb_build_object('domain',d,'product',to_jsonb(p)),p_actor_id);
  update public.products set is_published=false,archived_at=case when p_action='archive' then clock_timestamp() else null end where id=p.id;
  execute format('update public.%I set %I=false where id=$1',tbl,case when p_kind='service' then 'is_active' else 'is_published' end)using p_id;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta)values(p_actor_id,'catalog.'||p_action,p_kind,p_id::text,jsonb_build_object('product_id',p.id,'previously_published',published));
  return jsonb_build_object('id',p_id,'slug',p.slug);
end $$;
revoke all on function public.manage_catalog_lifecycle(uuid,text,uuid,text,timestamptz)from public,anon,authenticated;
grant execute on function public.manage_catalog_lifecycle(uuid,text,uuid,text,timestamptz)to service_role;
revoke all on function public.guard_archived_catalog_product()from public,anon,authenticated;
commit;
