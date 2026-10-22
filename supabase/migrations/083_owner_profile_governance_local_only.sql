-- 083: canonical public owner profile. LOCAL ONLY; no database execution implied.
-- Preserve historical revisions and require content.manage at both boundaries.
create or replace function public.manage_owner_profile(p_actor_id uuid, p_value jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_previous public.site_settings%rowtype; v_field record; v_item jsonb; v_max integer;
begin
  if p_actor_id is null or not public.has_permission('content.manage', p_actor_id) then
    raise exception using errcode='42501', message='content_management_required';
  end if;
  if p_value is null or jsonb_typeof(p_value) <> 'object' or octet_length(p_value::text)>12000 then
    raise exception using errcode='22023', message='owner_profile_invalid';
  end if;
  if (select count(*) from jsonb_object_keys(p_value)) <> 7 or not (p_value ?& array['eyebrow','title','lead','method','professionalLine','values','credentials']) then
    raise exception using errcode='22023', message='owner_profile_fields_invalid';
  end if;
  for v_field in select * from jsonb_each(p_value) where key not in ('values','credentials') loop
    v_max := case v_field.key when 'eyebrow' then 80 when 'title' then 160 when 'lead' then 700 when 'method' then 500 when 'professionalLine' then 180 else 0 end;
    if jsonb_typeof(v_field.value)<>'string' or length(btrim(p_value->>v_field.key)) not between 2 and v_max or (p_value->>v_field.key) ~ '[<>[:cntrl:]]' then
      raise exception using errcode='22023', message='owner_profile_text_invalid';
    end if;
  end loop;
  if jsonb_typeof(p_value->'values')<>'array' or jsonb_typeof(p_value->'credentials')<>'array' then raise exception using errcode='22023',message='owner_profile_lists_invalid'; end if;
  if jsonb_array_length(p_value->'values')<>3 or jsonb_array_length(p_value->'credentials')>3 then raise exception using errcode='22023',message='owner_profile_counts_invalid'; end if;
  for v_item in select value from jsonb_array_elements(p_value->'values') loop
    if jsonb_typeof(v_item)<>'object' then raise exception using errcode='22023',message='owner_value_invalid'; end if;
    if (select count(*) from jsonb_object_keys(v_item))<>2 or not(v_item ?& array['title','text']) then raise exception using errcode='22023',message='owner_value_fields_invalid'; end if;
    for v_field in select * from jsonb_each(v_item) loop
      v_max:=case v_field.key when 'title' then 70 else 240 end;
      if jsonb_typeof(v_field.value)<>'string' or length(btrim(v_item->>v_field.key)) not between 2 and v_max or (v_item->>v_field.key)~'[<>[:cntrl:]]' then raise exception using errcode='22023',message='owner_value_text_invalid'; end if;
    end loop;
  end loop;
  for v_item in select value from jsonb_array_elements(p_value->'credentials') loop
    if jsonb_typeof(v_item)<>'object' then raise exception using errcode='22023',message='owner_credential_invalid'; end if;
    if (select count(*) from jsonb_object_keys(v_item))<>3 or not(v_item ?& array['value','label','verified']) or jsonb_typeof(v_item->'verified')<>'boolean' then raise exception using errcode='22023',message='owner_credential_fields_invalid'; end if;
    for v_field in select * from jsonb_each(v_item) where key<>'verified' loop
      v_max:=case v_field.key when 'value' then 40 else 100 end;
      if jsonb_typeof(v_field.value)<>'string' or length(btrim(v_item->>v_field.key)) not between 2 and v_max or (v_item->>v_field.key)~'[<>[:cntrl:]]' then raise exception using errcode='22023',message='owner_credential_text_invalid'; end if;
    end loop;
  end loop;
  perform pg_advisory_xact_lock(hashtextextended('site_setting:owner_profile',0));
  select * into v_previous from public.site_settings where key='owner_profile' for update;
  if found then
    insert into public.site_setting_revisions(setting_key,snapshot,is_public,created_by) values('owner_profile',v_previous.value,v_previous.is_public,p_actor_id);
    insert into public.content_revisions(entity_type,entity_id,snapshot,created_by) values('owner_profile','00000000-0000-0000-0000-000000000001',v_previous.value,p_actor_id);
  end if;
  insert into public.site_settings(key,value,is_public,updated_by) values('owner_profile',p_value,true,p_actor_id)
    on conflict(key) do update set value=excluded.value,is_public=true,updated_by=excluded.updated_by;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta) values(p_actor_id,'owner_profile.updated','site_settings','owner_profile',jsonb_build_object('credentialCount',jsonb_array_length(p_value->'credentials')));
  return jsonb_build_object('updated',true);
end $$;
revoke all on function public.manage_owner_profile(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.manage_owner_profile(uuid,jsonb) to service_role;
