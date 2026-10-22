-- 054: governed media archive, restore and replacement lifecycle.
-- LOCAL ONLY. Apply after 053 on authorized Staging. Storage objects are never
-- deleted by this migration; archive/replace preserves a recoverable source.

alter table public.media_assets
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references auth.users(id) on delete set null,
  add column if not exists replaced_by uuid references public.media_assets(id) on delete set null;

do $$ begin
  alter table public.media_assets add constraint media_assets_not_self_replaced
    check (replaced_by is null or replaced_by <> id);
exception when duplicate_object then null; end $$;

create index if not exists media_assets_active_library_idx
  on public.media_assets(created_at desc) where archived_at is null;
create index if not exists media_assets_archived_idx
  on public.media_assets(archived_at desc) where archived_at is not null;

drop policy if exists "media: public or permitted read" on public.media_assets;
drop policy if exists "media: public active or permitted read" on public.media_assets;
create policy "media: public active or permitted read" on public.media_assets for select
  using ((visibility = 'public' and archived_at is null) or public.has_permission('media.view'));

create or replace function public.manage_media_asset_lifecycle(
  p_asset_id uuid,
  p_action text,
  p_replacement_id uuid,
  p_replacement_url text,
  p_actor_id uuid
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_asset public.media_assets%rowtype;
  v_replacement public.media_assets%rowtype;
  v_usage public.media_usages%rowtype;
  v_usage_count integer := 0;
  v_press_count integer := 0;
  v_resource_count integer := 0;
begin
  if p_action not in ('archive', 'restore', 'replace') then
    raise exception using errcode = '22023', message = 'media_lifecycle_action_invalid';
  end if;
  if not public.has_permission('media.manage', p_actor_id) then
    raise exception using errcode = '42501', message = 'media_manage_permission_required';
  end if;

  select * into v_asset from public.media_assets where id = p_asset_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'media_asset_not_found'; end if;

  select count(*) into v_usage_count from public.media_usages where asset_id = p_asset_id;
  select count(*) into v_press_count from public.press_mentions where image_media_id = p_asset_id;
  select count(*) into v_resource_count from public.resources where media_asset_id = p_asset_id;

  if p_action = 'archive' then
    if v_asset.archived_at is not null then return true; end if;
    if v_usage_count + v_press_count + v_resource_count > 0 then
      raise exception using errcode = '23503', message = 'media_in_use_requires_replacement';
    end if;
    update public.media_assets
      set archived_at = now(), archived_by = p_actor_id, replaced_by = null, visibility = 'private'
      where id = p_asset_id;
    insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
      values (p_actor_id, 'media.archived', 'media_asset', p_asset_id::text,
        jsonb_build_object('kind', v_asset.kind, 'bucket', v_asset.bucket));
    return true;
  end if;

  if p_action = 'restore' then
    if v_asset.archived_at is null then return true; end if;
    if v_asset.replaced_by is not null then
      raise exception using errcode = '55000', message = 'replaced_media_cannot_restore';
    end if;
    update public.media_assets
      set archived_at = null, archived_by = null,
          visibility = case when bucket = 'public-media' then 'public' else 'private' end
      where id = p_asset_id;
    insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
      values (p_actor_id, 'media.restored', 'media_asset', p_asset_id::text,
        jsonb_build_object('kind', v_asset.kind, 'bucket', v_asset.bucket));
    return true;
  end if;

  if v_asset.archived_at is not null then
    raise exception using errcode = '55000', message = 'media_asset_already_archived';
  end if;
  if p_replacement_id is null or p_replacement_id = p_asset_id then
    raise exception using errcode = '22023', message = 'media_replacement_invalid';
  end if;
  select * into v_replacement from public.media_assets where id = p_replacement_id for update;
  if not found or v_replacement.archived_at is not null
     or v_replacement.bucket <> v_asset.bucket
     or v_replacement.kind <> v_asset.kind
     or v_replacement.visibility <> v_asset.visibility then
    raise exception using errcode = '22023', message = 'media_replacement_incompatible';
  end if;
  if v_usage_count > 0 and (
    p_replacement_url is null
    or p_replacement_url !~ '^https://'
    or right(p_replacement_url, char_length('/storage/v1/object/public/' || v_replacement.bucket || '/' || v_replacement.path))
      <> '/storage/v1/object/public/' || v_replacement.bucket || '/' || v_replacement.path
  ) then
    raise exception using errcode = '22023', message = 'media_replacement_url_invalid';
  end if;

  for v_usage in
    select * from public.media_usages where asset_id = p_asset_id for update
  loop
    if v_usage.entity_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      raise exception using errcode = '22023', message = 'media_usage_entity_invalid';
    end if;
    if v_usage.field <> 'cover_url' then
      raise exception using errcode = '0A000', message = 'media_usage_field_unsupported';
    end if;
    case v_usage.entity_type
      when 'product' then update public.products set cover_url = p_replacement_url where id = v_usage.entity_id::uuid;
      when 'course' then update public.courses set cover_url = p_replacement_url where id = v_usage.entity_id::uuid;
      when 'book' then update public.books set cover_url = p_replacement_url where id = v_usage.entity_id::uuid;
      when 'workshop' then update public.workshops set cover_url = p_replacement_url where id = v_usage.entity_id::uuid;
      when 'article' then update public.articles set cover_url = p_replacement_url where id = v_usage.entity_id::uuid;
      when 'service' then null; -- the linked product owns the public cover URL
      else raise exception using errcode = '0A000', message = 'media_usage_entity_unsupported';
    end case;
    insert into public.media_usages(asset_id, entity_type, entity_id, field, created_by)
      values (p_replacement_id, v_usage.entity_type, v_usage.entity_id, v_usage.field, p_actor_id)
      on conflict (asset_id, entity_type, entity_id, field) do nothing;
    delete from public.media_usages where id = v_usage.id;
  end loop;

  update public.press_mentions set image_media_id = p_replacement_id where image_media_id = p_asset_id;
  update public.resources set media_asset_id = p_replacement_id where media_asset_id = p_asset_id;
  update public.media_assets
    set archived_at = now(), archived_by = p_actor_id, replaced_by = p_replacement_id, visibility = 'private'
    where id = p_asset_id;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
    values (p_actor_id, 'media.replaced', 'media_asset', p_asset_id::text,
      jsonb_build_object('replacementId', p_replacement_id, 'usageCount', v_usage_count,
        'pressCount', v_press_count, 'resourceCount', v_resource_count, 'kind', v_asset.kind));
  return true;
end $$;

revoke all on function public.manage_media_asset_lifecycle(uuid, text, uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.manage_media_asset_lifecycle(uuid, text, uuid, text, uuid) to service_role;

comment on function public.manage_media_asset_lifecycle(uuid, text, uuid, text, uuid) is
  'Service-only atomic media archive/restore/replace with permission recheck, reference transfer and minimized audit.';
comment on column public.media_assets.archived_at is 'Soft-delete boundary; archived assets are excluded from every public media read.';
comment on column public.media_assets.replaced_by is 'Active successor selected by an authorized Admin replacement operation.';
