-- 053: fail-closed publication for bundles, VIP plans and free-resource wrappers.
-- LOCAL ONLY. Apply after 052 on authorized Staging. It reuses existing commerce,
-- subscription, resource and media-rights domains without inventing delivery data.

create or replace function public.program_product_ready(p_product_id uuid)
returns boolean language plpgsql stable security definer set search_path=public as $$
declare v_product public.products%rowtype;
begin
  select * into v_product from public.products where id=p_product_id;
  if not found or v_product.type not in ('bundle','vip','free_resource')
     or char_length(btrim(v_product.title))<3 or char_length(btrim(coalesce(v_product.subtitle,'')))<3
     or char_length(btrim(v_product.description))<24 or v_product.price<0
     or v_product.currency!~'^[A-Z]{3}$' then return false;end if;
  if v_product.cover_url is not null and not exists(
    select 1 from public.media_usages usage join public.media_assets asset on asset.id=usage.asset_id
    where usage.entity_type='product' and usage.entity_id=v_product.id::text and usage.field='cover_url'
      and asset.bucket='public-media' and asset.visibility='public'
      and asset.rights_status in ('owned','licensed','public_domain') and asset.rights_reference<>''
  ) then return false;end if;
  if v_product.type='bundle' then
    if not exists(select 1 from public.product_bundles where bundle_product_id=v_product.id) then return false;end if;
    if exists(
      select 1 from public.product_bundles bundle join public.products child on child.id=bundle.child_product_id
      where bundle.bundle_product_id=v_product.id and (
        not child.is_published or child.type not in ('course','book','workshop','session') or
        (child.type='course' and not exists(select 1 from public.courses item where item.product_id=child.id and item.is_published)) or
        (child.type='book' and not exists(select 1 from public.books item where item.product_id=child.id and item.is_published)) or
        (child.type='workshop' and not exists(select 1 from public.workshops item where item.product_id=child.id and item.is_published and item.ends_at>now() and item.seats_total>item.seats_reserved)) or
        (child.type='session' and not exists(select 1 from public.services item where item.product_id=child.id and item.is_active and exists(select 1 from public.availability_rules availability where availability.service_id=item.id)))
      )
    ) then return false;end if;
  elsif v_product.type='vip' then
    if not exists(select 1 from public.subscription_plans plan where plan.product_id=v_product.id and plan.archived_at is null
      and plan.is_active and plan.is_published and (plan.starts_at is null or plan.starts_at<=now()) and (plan.ends_at is null or plan.ends_at>now())
      and plan.price=v_product.price and plan.currency=v_product.currency) then return false;end if;
  elsif v_product.type='free_resource' then
    if v_product.price<>0 or not exists(select 1 from public.resources resource where resource.related_product_id=v_product.id
      and resource.status='published' and coalesce(resource.publish_at,now())<=now()) then return false;end if;
  end if;
  return true;
end $$;

-- Legacy rows created through the former generic toggle remain preserved as drafts,
-- but cannot stay publicly discoverable without satisfying the new delivery contract.
update public.products product set is_published=false
where product.type in ('bundle','vip','free_resource') and product.is_published
  and not public.program_product_ready(product.id);

create or replace function public.set_program_product_publication(p_product_id uuid,p_publish boolean,p_actor_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_type text;
begin
  if not public.has_permission('catalog.publish',p_actor_id) then raise exception using errcode='42501',message='catalog_publish_permission_required';end if;
  select type into v_type from public.products where id=p_product_id for update;
  if not found or v_type not in ('bundle','vip','free_resource') then raise exception using errcode='22023',message='program_product_required';end if;
  if p_publish and not public.program_product_ready(p_product_id) then raise exception using errcode='22023',message='program_product_not_ready';end if;
  update public.products set is_published=p_publish where id=p_product_id;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta) values(p_actor_id,case when p_publish then 'program_product.published' else 'program_product.unpublished' end,'product',p_product_id::text,jsonb_build_object('type',v_type));
  return true;
end $$;

create or replace function public.set_program_bundle_children(p_bundle_product_id uuid,p_child_ids uuid[],p_actor_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_published boolean;v_count integer;
begin
  if not public.has_permission('catalog.manage',p_actor_id) then raise exception using errcode='42501',message='catalog_manage_permission_required';end if;
  select is_published into v_published from public.products where id=p_bundle_product_id and type='bundle' for update;
  if not found or coalesce(array_length(p_child_ids,1),0)<1 or coalesce(array_length(p_child_ids,1),0)>50 then raise exception using errcode='22023',message='invalid_bundle_composition';end if;
  select count(distinct id) into v_count from public.products where id=any(p_child_ids) and id<>p_bundle_product_id and type in ('course','book','workshop','session');
  if v_count<>array_length(p_child_ids,1) then raise exception using errcode='22023',message='invalid_bundle_child';end if;
  delete from public.product_bundles where bundle_product_id=p_bundle_product_id;
  insert into public.product_bundles(bundle_product_id,child_product_id) select p_bundle_product_id,id from unnest(p_child_ids) id;
  if v_published and not public.program_product_ready(p_bundle_product_id) then raise exception using errcode='22023',message='published_bundle_not_ready';end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta) values(p_actor_id,'bundle.composition_updated','product',p_bundle_product_id::text,jsonb_build_object('childCount',v_count,'remainedPublished',v_published));
  return true;
end $$;

revoke all on function public.program_product_ready(uuid) from public,anon,authenticated;grant execute on function public.program_product_ready(uuid) to service_role;
revoke all on function public.set_program_product_publication(uuid,boolean,uuid) from public,anon,authenticated;grant execute on function public.set_program_product_publication(uuid,boolean,uuid) to service_role;
revoke all on function public.set_program_bundle_children(uuid,uuid[],uuid) from public,anon,authenticated;grant execute on function public.set_program_bundle_children(uuid,uuid[],uuid) to service_role;

comment on function public.program_product_ready(uuid) is 'Fail-closed readiness for governed public programme discovery and checkout.';
