-- 072: issued-intent and atomic binding for inspected protected uploads.
-- LOCAL ONLY. Apply after 071 on authorized Staging with a verified recovery
-- point and schema fingerprint. Never apply to Production from this workspace.

create table public.protected_upload_intents (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id) on delete cascade,
  upload_kind text not null check (upload_kind in ('book','lesson-video','lesson-resource','workshop-resource','workshop-recording')),
  entity_id uuid not null,
  storage_path text not null unique,
  path_hash text not null check (path_hash ~ '^[0-9a-f]{64}$'),
  declared_mime text not null check (length(declared_mime) between 1 and 120),
  declared_size bigint not null check (declared_size > 0),
  status text not null default 'issued' check (status in ('issued','finalized','rejected','quarantined','expired')),
  binding_id uuid,
  inspection_id uuid references public.protected_upload_inspections(id) on delete set null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index protected_upload_intents_actor_created_idx
  on public.protected_upload_intents(actor_id, created_at desc);
create index protected_upload_intents_expiry_idx
  on public.protected_upload_intents(status, expires_at)
  where status = 'issued';
create trigger protected_upload_intents_updated
  before update on public.protected_upload_intents
  for each row execute function public.set_updated_at();
alter table public.protected_upload_intents enable row level security;
revoke all on table public.protected_upload_intents from anon, authenticated;

revoke insert, update, delete on table public.book_versions from anon, authenticated;
revoke insert, update, delete on table public.book_files from anon, authenticated;
revoke insert, update, delete on table public.course_lessons from anon, authenticated;
revoke insert, update, delete on table public.lesson_resources from anon, authenticated;
revoke insert, update, delete on table public.workshop_resources from anon, authenticated;
revoke insert, update, delete on table public.workshop_recordings from anon, authenticated;

create or replace function public.begin_protected_upload_intent(
  p_actor_id uuid,
  p_upload_kind text,
  p_entity_id uuid,
  p_storage_path text,
  p_path_hash text,
  p_declared_mime text,
  p_declared_size bigint
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_path_parts text[];
  v_extension text;
  v_allowed_mimes text[];
  v_max_size bigint;
  v_id uuid;
begin
  if p_actor_id is null or not public.has_permission('learning.manage', p_actor_id) then
    raise exception using errcode = '42501', message = 'learning_management_required';
  end if;
  if p_upload_kind not in ('book','lesson-video','lesson-resource','workshop-resource','workshop-recording')
     or p_entity_id is null
     or p_path_hash !~ '^[0-9a-f]{64}$'
     or encode(extensions.digest(coalesce(p_storage_path, ''), 'sha256'), 'hex') <> p_path_hash
     or p_declared_mime is null
     or p_declared_size is null or p_declared_size < 1 then
    raise exception using errcode = '22023', message = 'protected_upload_intent_invalid';
  end if;
  v_path_parts := regexp_match(
    coalesce(p_storage_path, ''),
    '^([a-z-]+)/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.([a-z0-9]{2,8})$',
    'i'
  );
  if v_path_parts is null
     or lower(v_path_parts[1]) <> p_upload_kind
     or v_path_parts[2]::uuid <> p_entity_id then
    raise exception using errcode = '22023', message = 'protected_upload_path_invalid';
  end if;
  v_extension := lower(v_path_parts[4]);

  if p_upload_kind = 'book' and v_extension = 'pdf' then
    v_allowed_mimes := array['application/pdf']; v_max_size := 157286400;
  elsif p_upload_kind = 'book' and v_extension = 'epub' then
    v_allowed_mimes := array['application/epub+zip']; v_max_size := 157286400;
  elsif p_upload_kind in ('lesson-video','workshop-recording') and v_extension = 'mp4' then
    v_allowed_mimes := array['video/mp4']; v_max_size := 2147483648;
  elsif p_upload_kind in ('lesson-video','workshop-recording') and v_extension = 'webm' then
    v_allowed_mimes := array['video/webm']; v_max_size := 2147483648;
  elsif p_upload_kind in ('lesson-video','workshop-recording') and v_extension = 'mov' then
    v_allowed_mimes := array['video/quicktime']; v_max_size := 2147483648;
  elsif p_upload_kind in ('lesson-resource','workshop-resource') and v_extension = 'pdf' then
    v_allowed_mimes := array['application/pdf']; v_max_size := 262144000;
  elsif p_upload_kind in ('lesson-resource','workshop-resource') and v_extension = 'zip' then
    v_allowed_mimes := array['application/zip','application/x-zip-compressed']; v_max_size := 262144000;
  elsif p_upload_kind in ('lesson-resource','workshop-resource') and v_extension = 'mp3' then
    v_allowed_mimes := array['audio/mpeg']; v_max_size := 262144000;
  elsif p_upload_kind in ('lesson-resource','workshop-resource') and v_extension = 'wav' then
    v_allowed_mimes := array['audio/wav','audio/x-wav']; v_max_size := 262144000;
  elsif p_upload_kind in ('lesson-resource','workshop-resource') and v_extension = 'm4a' then
    v_allowed_mimes := array['audio/mp4','audio/x-m4a']; v_max_size := 262144000;
  else
    raise exception using errcode = '22023', message = 'protected_upload_kind_extension_invalid';
  end if;
  if p_declared_mime <> all(v_allowed_mimes) or p_declared_size > v_max_size then
    raise exception using errcode = '22023', message = 'protected_upload_declaration_invalid';
  end if;

  if p_upload_kind = 'book' then
    perform 1 from public.books where id = p_entity_id for share;
  elsif p_upload_kind in ('lesson-video','lesson-resource') then
    perform 1 from public.course_lessons where id = p_entity_id for share;
  else
    perform 1 from public.workshops where id = p_entity_id for share;
  end if;
  if not found then raise exception using errcode = 'P0002', message = 'protected_upload_target_not_found'; end if;

  perform pg_advisory_xact_lock(hashtextextended('protected-upload-intent:' || p_path_hash, 0));
  insert into public.protected_upload_intents(
    actor_id, upload_kind, entity_id, storage_path, path_hash,
    declared_mime, declared_size, expires_at
  ) values (
    p_actor_id, p_upload_kind, p_entity_id, p_storage_path, p_path_hash,
    p_declared_mime, p_declared_size, now() + interval '30 minutes'
  ) returning id into v_id;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
  values (
    p_actor_id, 'delivery.upload_intent.issued', p_upload_kind, p_entity_id::text,
    jsonb_build_object('intentId', v_id, 'declaredMime', p_declared_mime, 'declaredSize', p_declared_size)
  );
  return v_id;
end $$;

create or replace function public.authorize_protected_upload_finalization(
  p_actor_id uuid,
  p_intent_id uuid,
  p_upload_kind text,
  p_entity_id uuid,
  p_storage_path text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_intent public.protected_upload_intents%rowtype;
begin
  if p_actor_id is null or not public.has_permission('learning.manage', p_actor_id) then
    raise exception using errcode = '42501', message = 'learning_management_required';
  end if;
  select * into v_intent
    from public.protected_upload_intents
   where id = p_intent_id and actor_id = p_actor_id
     and upload_kind = p_upload_kind and entity_id = p_entity_id
     and storage_path = p_storage_path
   for update;
  if not found then raise exception using errcode = 'P0002', message = 'protected_upload_intent_not_found'; end if;
  if v_intent.status = 'finalized' and v_intent.binding_id is not null then
    return jsonb_build_object('outcome', 'finalized', 'id', v_intent.binding_id);
  end if;
  if v_intent.status <> 'issued' then
    raise exception using errcode = '55000', message = 'protected_upload_intent_unavailable';
  end if;
  if v_intent.expires_at <= now() then
    update public.protected_upload_intents set status = 'expired' where id = v_intent.id;
    insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
    values (p_actor_id, 'delivery.upload_intent.expired', p_upload_kind, p_entity_id::text, jsonb_build_object('intentId', v_intent.id));
    return jsonb_build_object('outcome', 'expired', 'authorized', false);
  end if;
  return jsonb_build_object(
    'outcome', 'authorized', 'authorized', true,
    'declaredMime', v_intent.declared_mime, 'declaredSize', v_intent.declared_size
  );
end $$;

create or replace function public.bind_validated_protected_upload(
  p_actor_id uuid,
  p_intent_id uuid,
  p_title text,
  p_version text,
  p_observed_mime text,
  p_observed_size bigint,
  p_validation_method text,
  p_published boolean default false
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_intent public.protected_upload_intents%rowtype;
  v_path_parts text[];
  v_extension text;
  v_allowed_mimes text[];
  v_max_size bigint;
  v_title text := btrim(coalesce(p_title, ''));
  v_version text := btrim(coalesce(p_version, ''));
  v_record_id uuid;
  v_version_id uuid;
  v_previous_path text;
  v_existing_id uuid;
  v_resource_kind text;
  v_inspection_id uuid;
begin
  if p_actor_id is null or not public.has_permission('learning.manage', p_actor_id) then
    raise exception using errcode = '42501', message = 'learning_management_required';
  end if;
  select * into v_intent
    from public.protected_upload_intents
   where id = p_intent_id and actor_id = p_actor_id
   for update;
  if not found then raise exception using errcode = 'P0002', message = 'protected_upload_intent_not_found'; end if;
  if v_intent.status = 'finalized' and v_intent.binding_id is not null then
    return jsonb_build_object('outcome', 'existing', 'id', v_intent.binding_id, 'replacedPath', null);
  end if;
  if v_intent.status <> 'issued' or v_intent.expires_at <= now() then
    raise exception using errcode = '55000', message = 'protected_upload_intent_unavailable';
  end if;
  if encode(extensions.digest(v_intent.storage_path, 'sha256'), 'hex') <> v_intent.path_hash
     or p_observed_mime is null or p_observed_size is null
     or p_observed_size is distinct from v_intent.declared_size
     or p_validation_method not in ('magic_bytes_validation','magic_bytes_and_external_scan') then
    raise exception using errcode = '22023', message = 'protected_upload_observation_invalid';
  end if;
  v_path_parts := regexp_match(
    v_intent.storage_path,
    '^([a-z-]+)/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.([a-z0-9]{2,8})$',
    'i'
  );
  if v_path_parts is null
     or lower(v_path_parts[1]) <> v_intent.upload_kind
     or v_path_parts[2]::uuid <> v_intent.entity_id then
    raise exception using errcode = '22023', message = 'protected_upload_path_invalid';
  end if;
  v_extension := lower(v_path_parts[4]);

  if v_intent.upload_kind = 'book' and v_extension = 'pdf' then
    v_allowed_mimes := array['application/pdf']; v_max_size := 157286400;
  elsif v_intent.upload_kind = 'book' and v_extension = 'epub' then
    v_allowed_mimes := array['application/epub+zip']; v_max_size := 157286400;
  elsif v_intent.upload_kind in ('lesson-video','workshop-recording') and v_extension = 'mp4' then
    v_allowed_mimes := array['video/mp4']; v_max_size := 2147483648;
  elsif v_intent.upload_kind in ('lesson-video','workshop-recording') and v_extension = 'webm' then
    v_allowed_mimes := array['video/webm']; v_max_size := 2147483648;
  elsif v_intent.upload_kind in ('lesson-video','workshop-recording') and v_extension = 'mov' then
    v_allowed_mimes := array['video/quicktime']; v_max_size := 2147483648;
  elsif v_intent.upload_kind in ('lesson-resource','workshop-resource') and v_extension = 'pdf' then
    v_allowed_mimes := array['application/pdf']; v_max_size := 262144000;
  elsif v_intent.upload_kind in ('lesson-resource','workshop-resource') and v_extension = 'zip' then
    v_allowed_mimes := array['application/zip','application/x-zip-compressed']; v_max_size := 262144000;
  elsif v_intent.upload_kind in ('lesson-resource','workshop-resource') and v_extension = 'mp3' then
    v_allowed_mimes := array['audio/mpeg']; v_max_size := 262144000;
  elsif v_intent.upload_kind in ('lesson-resource','workshop-resource') and v_extension = 'wav' then
    v_allowed_mimes := array['audio/wav','audio/x-wav']; v_max_size := 262144000;
  elsif v_intent.upload_kind in ('lesson-resource','workshop-resource') and v_extension = 'm4a' then
    v_allowed_mimes := array['audio/mp4','audio/x-m4a']; v_max_size := 262144000;
  else
    raise exception using errcode = '22023', message = 'protected_upload_kind_extension_invalid';
  end if;
  if v_intent.declared_mime <> all(v_allowed_mimes)
     or p_observed_mime <> all(v_allowed_mimes)
     or p_observed_size > v_max_size then
    raise exception using errcode = '22023', message = 'protected_upload_observation_invalid';
  end if;
  if v_intent.upload_kind <> 'book'
     and (length(v_title) not between 1 and 180 or v_title ~ '[[:cntrl:]]') then
    raise exception using errcode = '22023', message = 'protected_upload_title_invalid';
  end if;
  if v_intent.upload_kind = 'book'
     and (length(v_version) not between 1 and 30 or v_version ~ '[[:cntrl:]]') then
    raise exception using errcode = '22023', message = 'protected_upload_version_invalid';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('protected-upload:' || v_intent.path_hash, 0));
  if v_intent.upload_kind = 'book' then
    perform 1 from public.books where id = v_intent.entity_id for share;
  elsif v_intent.upload_kind in ('lesson-video','lesson-resource') then
    perform 1 from public.course_lessons where id = v_intent.entity_id for update;
  else
    perform 1 from public.workshops where id = v_intent.entity_id for share;
  end if;
  if not found then raise exception using errcode = 'P0002', message = 'protected_upload_target_not_found'; end if;

  if v_intent.upload_kind = 'book' then
    select id into v_existing_id from public.book_files where storage_path = v_intent.storage_path limit 1;
  elsif v_intent.upload_kind = 'lesson-video' then
    select id into v_existing_id from public.course_lessons where video_path = v_intent.storage_path limit 1;
  elsif v_intent.upload_kind = 'lesson-resource' then
    select id into v_existing_id from public.lesson_resources where file_path = v_intent.storage_path limit 1;
  elsif v_intent.upload_kind = 'workshop-resource' then
    select id into v_existing_id from public.workshop_resources where file_path = v_intent.storage_path limit 1;
  else
    select id into v_existing_id from public.workshop_recordings where storage_path = v_intent.storage_path limit 1;
  end if;
  if v_existing_id is not null then
    raise exception using errcode = '23505', message = 'protected_upload_path_already_bound';
  end if;

  if v_intent.upload_kind = 'book' then
    insert into public.book_versions(book_id, version, changelog)
    values (v_intent.entity_id, v_version, 'رفع محمي من لوحة الإدارة')
    on conflict(book_id, version) do update set version = excluded.version
    returning id into v_version_id;
    insert into public.book_files(book_id, version_id, format, storage_path, size_bytes)
    values (v_intent.entity_id, v_version_id, v_extension, v_intent.storage_path, p_observed_size)
    returning id into v_record_id;
  elsif v_intent.upload_kind = 'lesson-video' then
    select video_path into v_previous_path from public.course_lessons where id = v_intent.entity_id for update;
    update public.course_lessons set video_path = v_intent.storage_path where id = v_intent.entity_id returning id into v_record_id;
  elsif v_intent.upload_kind = 'lesson-resource' then
    v_resource_kind := case when v_extension in ('mp3','wav','m4a') then 'audio' else v_extension end;
    insert into public.lesson_resources(lesson_id, title, file_path, kind, size_bytes)
    values (v_intent.entity_id, v_title, v_intent.storage_path, v_resource_kind, p_observed_size)
    returning id into v_record_id;
  elsif v_intent.upload_kind = 'workshop-resource' then
    v_resource_kind := case when v_extension in ('mp3','wav','m4a') then 'audio' else v_extension end;
    insert into public.workshop_resources(workshop_id, title, file_path, kind)
    values (v_intent.entity_id, v_title, v_intent.storage_path, v_resource_kind)
    returning id into v_record_id;
  else
    insert into public.workshop_recordings(workshop_id, title, storage_path, published_at)
    values (v_intent.entity_id, v_title, v_intent.storage_path, case when coalesce(p_published, false) then now() else null end)
    returning id into v_record_id;
  end if;

  insert into public.protected_upload_inspections(
    actor_id, upload_kind, entity_id, path_hash, declared_mime, observed_mime,
    declared_size, observed_size, outcome, reason
  ) values (
    p_actor_id, v_intent.upload_kind, v_intent.entity_id, v_intent.path_hash,
    v_intent.declared_mime, p_observed_mime, v_intent.declared_size,
    p_observed_size, 'validated', p_validation_method
  ) returning id into v_inspection_id;
  insert into public.protected_delivery_events(user_id, event_kind, entity_id, outcome, detail)
  values (
    p_actor_id, 'upload_inspection', v_intent.entity_id, 'validated',
    jsonb_build_object('kind', v_intent.upload_kind, 'recordId', v_record_id, 'observedSize', p_observed_size, 'intentId', v_intent.id)
  );
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
  values (
    p_actor_id, 'delivery.' || v_intent.upload_kind || '.uploaded', v_intent.upload_kind, v_intent.entity_id::text,
    jsonb_build_object(
      'recordId', v_record_id, 'intentId', v_intent.id, 'observedSize', p_observed_size,
      'observedMime', p_observed_mime, 'inspection', 'validated',
      'replacedExisting', v_previous_path is not null
    )
  );
  update public.protected_upload_intents
     set status = 'finalized', binding_id = v_record_id, inspection_id = v_inspection_id
   where id = v_intent.id;
  return jsonb_build_object(
    'outcome', 'bound', 'id', v_record_id,
    'replacedPath', case when v_previous_path is distinct from v_intent.storage_path then v_previous_path else null end
  );
end $$;

create or replace function public.record_protected_upload_rejection(
  p_actor_id uuid,
  p_intent_id uuid,
  p_observed_mime text,
  p_observed_size bigint,
  p_outcome text,
  p_reason text,
  p_cleanup_confirmed boolean
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_intent public.protected_upload_intents%rowtype;
  v_id uuid;
begin
  if p_actor_id is null or not public.has_permission('learning.manage', p_actor_id) then
    raise exception using errcode = '42501', message = 'learning_management_required';
  end if;
  select * into v_intent
    from public.protected_upload_intents
   where id = p_intent_id and actor_id = p_actor_id
   for update;
  if not found then raise exception using errcode = 'P0002', message = 'protected_upload_intent_not_found'; end if;
  if v_intent.status = 'finalized' then
    raise exception using errcode = '55000', message = 'finalized_upload_cannot_be_rejected';
  end if;
  if v_intent.status in ('rejected','quarantined') and v_intent.inspection_id is not null then
    return v_intent.inspection_id;
  end if;
  if length(coalesce(p_observed_mime, '')) > 120
     or p_observed_size is not null and p_observed_size < 0
     or p_outcome not in ('rejected','quarantined')
     or p_reason not in (
       'signed_upload_issue_failed','direct_storage_upload_failed','server_metadata_or_magic_mismatch',
       'configured_scanner_unavailable','scanner_did_not_return_clean',
       'database_binding_failed','operator_metadata_invalid'
     ) then
    raise exception using errcode = '22023', message = 'protected_upload_rejection_invalid';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('protected-upload-rejection:' || v_intent.path_hash, 0));
  insert into public.protected_upload_inspections(
    actor_id, upload_kind, entity_id, path_hash, declared_mime, observed_mime,
    declared_size, observed_size, outcome, reason
  ) values (
    p_actor_id, v_intent.upload_kind, v_intent.entity_id, v_intent.path_hash,
    v_intent.declared_mime, nullif(p_observed_mime, ''), v_intent.declared_size,
    p_observed_size, p_outcome, p_reason
  ) returning id into v_id;
  update public.protected_upload_intents
     set status = p_outcome, inspection_id = v_id
   where id = v_intent.id;
  insert into public.protected_delivery_events(user_id, event_kind, entity_id, outcome, detail)
  values (
    p_actor_id, 'upload_inspection', v_intent.entity_id, p_outcome,
    jsonb_build_object('kind', v_intent.upload_kind, 'reason', p_reason, 'cleanupConfirmed', coalesce(p_cleanup_confirmed, false), 'intentId', v_intent.id)
  );
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
  values (
    p_actor_id, 'delivery.' || v_intent.upload_kind || '.' || p_outcome,
    v_intent.upload_kind, v_intent.entity_id::text,
    jsonb_build_object('reason', p_reason, 'cleanupConfirmed', coalesce(p_cleanup_confirmed, false), 'inspectionId', v_id, 'intentId', v_intent.id)
  );
  if coalesce(p_cleanup_confirmed, false) is not true then
    insert into public.system_events(level, source, message, meta)
    values (
      'warn', 'protected-upload', 'Private unbound object requires storage reconciliation',
      jsonb_build_object('kind', v_intent.upload_kind, 'entityId', v_intent.entity_id, 'pathHash', v_intent.path_hash, 'reason', p_reason, 'intentId', v_intent.id)
    );
  end if;
  return v_id;
end $$;

create or replace function public.record_protected_upload_cleanup_failure(
  p_actor_id uuid,
  p_upload_kind text,
  p_entity_id uuid,
  p_path_hash text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_actor_id is null or not public.has_permission('learning.manage', p_actor_id) then
    raise exception using errcode = '42501', message = 'learning_management_required';
  end if;
  if p_upload_kind not in ('book','lesson-video','lesson-resource','workshop-resource','workshop-recording')
     or p_entity_id is null or p_path_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'protected_upload_cleanup_invalid';
  end if;
  insert into public.system_events(level, source, message, meta)
  values (
    'warn', 'protected-upload', 'Replaced private object requires storage reconciliation',
    jsonb_build_object('kind', p_upload_kind, 'entityId', p_entity_id, 'pathHash', p_path_hash)
  ) returning id into v_id;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
  values (
    p_actor_id, 'delivery.replaced_object.cleanup_failed', p_upload_kind, p_entity_id::text,
    jsonb_build_object('pathHash', p_path_hash, 'systemEventId', v_id)
  );
  return v_id;
end $$;

revoke all on function public.begin_protected_upload_intent(uuid,text,uuid,text,text,text,bigint) from public, anon, authenticated;
revoke all on function public.authorize_protected_upload_finalization(uuid,uuid,text,uuid,text) from public, anon, authenticated;
revoke all on function public.bind_validated_protected_upload(uuid,uuid,text,text,text,bigint,text,boolean) from public, anon, authenticated;
revoke all on function public.record_protected_upload_rejection(uuid,uuid,text,bigint,text,text,boolean) from public, anon, authenticated;
revoke all on function public.record_protected_upload_cleanup_failure(uuid,text,uuid,text) from public, anon, authenticated;
grant execute on function public.begin_protected_upload_intent(uuid,text,uuid,text,text,text,bigint) to service_role;
grant execute on function public.authorize_protected_upload_finalization(uuid,uuid,text,uuid,text) to service_role;
grant execute on function public.bind_validated_protected_upload(uuid,uuid,text,text,text,bigint,text,boolean) to service_role;
grant execute on function public.record_protected_upload_rejection(uuid,uuid,text,bigint,text,text,boolean) to service_role;
grant execute on function public.record_protected_upload_cleanup_failure(uuid,text,uuid,text) to service_role;

comment on table public.protected_upload_intents is
  'Private service-only authority ledger binding an Admin, target and declared object before a signed Storage upload is issued.';
comment on function public.begin_protected_upload_intent(uuid,text,uuid,text,text,text,bigint) is
  'Service-only target/path/declaration validation and audited intent issuance before Storage signing.';
comment on function public.authorize_protected_upload_finalization(uuid,uuid,text,uuid,text) is
  'Service-only exact actor/intent/kind/entity/path authorization before privileged Storage inspection or removal.';
comment on function public.bind_validated_protected_upload(uuid,uuid,text,text,text,bigint,text,boolean) is
  'Service-only inspected intent binding; target mutation, inspection, delivery event, intent and metadata-only audit commit atomically.';
comment on function public.record_protected_upload_rejection(uuid,uuid,text,bigint,text,text,boolean) is
  'Service-only intent rejection/quarantine evidence with explicit private-object cleanup outcome.';
comment on function public.record_protected_upload_cleanup_failure(uuid,text,uuid,text) is
  'Service-only metadata-safe reconciliation evidence when a replaced private Storage object cannot be removed.';

-- Rollback-by-forward-fix: preserve intents, delivery records, inspections and
-- audits. Replace these functions in a later migration; never restore
-- browser-direct protected-delivery writes or bind an unissued object.
