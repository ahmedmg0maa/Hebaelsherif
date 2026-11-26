-- 084: managed Home media with crop/alt, rights checks and atomic usages. LOCAL ONLY.
-- Old migrations remain immutable. Apply after 083 only on authorized Staging.

create or replace function public.master_v2_home_content_valid(p_kind text, p_content jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare
  v_field record;
  v_item jsonb;
  v_max integer;
begin
  if p_content is null or jsonb_typeof(p_content) <> 'object' then return false; end if;
  -- Placement validation and managed asset binding are enforced by the trigger.
  p_content := p_content - 'media';
  if p_kind = 'hero' then
    if (select count(*) from jsonb_object_keys(p_content)) <> 12 then return false; end if;
    for v_field in select * from jsonb_each(p_content) loop
      v_max := case v_field.key
        when 'eyebrow' then 100 when 'lead' then 320
        when 'imageTitle' then 80 when 'imageLead' then 160
        when 'headlineStart' then 40 when 'headlineAccent' then 40
        when 'headlineMiddle' then 40 when 'headlinePath' then 40
        when 'headlineEnd' then 40 when 'headlineAwareness' then 40
        when 'primaryCta' then 40 when 'secondaryCta' then 40 else 0 end;
      if v_max = 0 or jsonb_typeof(v_field.value) <> 'string'
         or length(btrim(p_content->>v_field.key)) not between 2 and v_max
         or (p_content->>v_field.key) ~ '[<>[:cntrl:]]' then return false; end if;
    end loop;
  elsif p_kind in ('manifesto','quote') then
    if (select count(*) from jsonb_object_keys(p_content)) <> 3
       or not (p_content ?& array['eyebrow','heading','body']) then return false; end if;
    for v_field in select * from jsonb_each(p_content) loop
      v_max := case v_field.key when 'eyebrow' then 80 when 'heading' then 160 else 500 end;
      if jsonb_typeof(v_field.value) <> 'string'
         or length(btrim(p_content->>v_field.key)) not between
            (case v_field.key when 'body' then 8 when 'heading' then 3 else 2 end) and v_max
         or (p_content->>v_field.key) ~ '[<>[:cntrl:]]' then return false; end if;
    end loop;
  elsif p_kind = 'pathways' then
    if not (p_content ?& array['eyebrow','heading','lead','items'])
       or jsonb_typeof(p_content->'items') <> 'array' then return false; end if;
    if jsonb_array_length(p_content->'items') not between 3 and 4 then return false; end if;
    for v_field in select key, value from jsonb_each(p_content) where key <> 'items' loop
      v_max := case v_field.key when 'eyebrow' then 80 when 'heading' then 120 when 'lead' then 240 else 0 end;
      if v_max = 0 or jsonb_typeof(v_field.value) <> 'string'
         or length(btrim(p_content->>v_field.key)) not between
            (case v_field.key when 'lead' then 8 when 'heading' then 3 else 2 end) and v_max
         or (p_content->>v_field.key) ~ '[<>[:cntrl:]]' then return false; end if;
    end loop;
    for v_item in select value from jsonb_array_elements(p_content->'items') loop
      if jsonb_typeof(v_item) <> 'object' or not (v_item ?& array['title','text','href','cta']) then return false; end if;
      for v_field in select * from jsonb_each(v_item) loop
        v_max := case v_field.key when 'title' then 70 when 'text' then 180 when 'href' then 180 when 'cta' then 60 else 0 end;
        if v_max = 0 or jsonb_typeof(v_field.value) <> 'string'
           or length(btrim(v_item->>v_field.key)) not between
              (case v_field.key when 'href' then 1 when 'text' then 8 else 2 end) and v_max
           or (v_item->>v_field.key) ~ '[<>[:cntrl:]]' then return false; end if;
      end loop;
      if left(v_item->>'href',1) <> '/' or left(v_item->>'href',2) = '//'
         or position(chr(92) in (v_item->>'href')) > 0
         or (v_item->>'href') ~* '[[:space:][:cntrl:]]|%(2f|5c|0[0-9a-f]|1[0-9a-f]|7f)' then return false; end if;
    end loop;
  end if;
  return true;
end $$;
revoke all on function public.master_v2_home_content_valid(text,jsonb) from public, anon, authenticated;
grant execute on function public.master_v2_home_content_valid(text,jsonb) to service_role;


create or replace function public.sync_home_section_media()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_slot record; v_ref jsonb; v_asset public.media_assets%rowtype; v_slots text[]; v_count integer;
begin
  if TG_OP = 'DELETE' then
    delete from public.media_usages where entity_type='page_section' and entity_id=OLD.id::text and field like 'home_media:%';
    return OLD;
  end if;
  if not exists(select 1 from public.pages where id=NEW.page_id and slug='home') then return NEW; end if;
  if NEW.content ? 'media' then
    if jsonb_typeof(NEW.content->'media') <> 'object' then raise exception using errcode='22023',message='home_media_invalid'; end if;
    v_slots:=case when NEW.kind in ('hero','manifesto','editorial_feature','cta') then array['main'] when NEW.kind='pathways' then array['portal0','portal1','portal2','portal3'] else array[]::text[] end;
    for v_slot in select * from jsonb_each(NEW.content->'media') order by value->>'assetId',key loop
      if not(v_slot.key=any(v_slots)) then raise exception using errcode='22023',message='home_media_slot_invalid'; end if;
      if NEW.kind='pathways' and v_slot.key='portal3' and jsonb_array_length(NEW.content->'items')<4 then raise exception using errcode='22023',message='home_media_portal_missing'; end if;
      v_ref:=v_slot.value;
      if jsonb_typeof(v_ref)<>'object' then raise exception using errcode='22023',message='home_media_reference_invalid'; end if;
      select count(*) into v_count from jsonb_object_keys(v_ref);
      if v_count<>4 or not(v_ref ?& array['assetId','alt','x','y']) then raise exception using errcode='22023',message='home_media_fields_invalid'; end if;
      if jsonb_typeof(v_ref->'assetId')<>'string' or (v_ref->>'assetId')!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        or jsonb_typeof(v_ref->'alt')<>'string' or length(btrim(v_ref->>'alt')) not between 2 and 240 or (v_ref->>'alt')~'[<>[:cntrl:]]'
        or jsonb_typeof(v_ref->'x')<>'number' or jsonb_typeof(v_ref->'y')<>'number' then raise exception using errcode='22023',message='home_media_value_invalid'; end if;
      if (v_ref->>'x')::numeric not between 0 and 100 or (v_ref->>'y')::numeric not between 0 and 100 then raise exception using errcode='22023',message='home_media_crop_invalid'; end if;
      select * into v_asset from public.media_assets where id=(v_ref->>'assetId')::uuid for share;
      if not found or v_asset.bucket<>'public-media' or v_asset.visibility<>'public' or v_asset.kind<>'image' or v_asset.archived_at is not null
        or v_asset.rights_status not in ('owned','licensed','public_domain') or length(btrim(coalesce(v_asset.rights_reference,'')))=0 then
        raise exception using errcode='23514',message='home_media_rights_required';
      end if;
    end loop;
  end if;
  delete from public.media_usages where entity_type='page_section' and entity_id=NEW.id::text and field like 'home_media:%';
  for v_slot in select * from jsonb_each(coalesce(NEW.content->'media','{}'::jsonb)) loop
    insert into public.media_usages(asset_id,entity_type,entity_id,field)
      values((v_slot.value->>'assetId')::uuid,'page_section',NEW.id::text,'home_media:'||v_slot.key);
  end loop;
  return NEW;
end $$;
revoke all on function public.sync_home_section_media() from public,anon,authenticated;
create trigger home_section_media_binding after insert or update or delete on public.page_sections
  for each row execute function public.sync_home_section_media();

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
    if v_usage.entity_type='page_section' and v_usage.field ~ '^home_media:(main|portal[0-3])$' then
      if not public.has_permission('content.manage',p_actor_id) then raise exception using errcode='42501',message='content_management_required'; end if;
      perform 1 from public.page_sections where id=v_usage.entity_id::uuid for update;
      insert into public.content_revisions(entity_type,entity_id,snapshot,created_by)
        select 'page_section',id,to_jsonb(section),p_actor_id from public.page_sections section where id=v_usage.entity_id::uuid;
      update public.page_sections set content=jsonb_set(content,array['media',split_part(v_usage.field,':',2),'assetId'],to_jsonb(p_replacement_id::text)),revision=revision+1 where id=v_usage.entity_id::uuid;
      continue; -- the binding trigger replaces usages and repeats rights checks atomically
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

revoke all on function public.manage_media_asset_lifecycle(uuid,text,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.manage_media_asset_lifecycle(uuid,text,uuid,text,uuid) to service_role;
