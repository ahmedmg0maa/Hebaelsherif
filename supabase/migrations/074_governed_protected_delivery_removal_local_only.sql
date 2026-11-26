-- 074: governed removal of protected-delivery bindings and private objects.
-- LOCAL ONLY. Apply after 073 on authorized Staging with a verified recovery
-- point and schema fingerprint. Never apply to Production from this workspace.

alter table public.book_files
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references auth.users(id) on delete set null;
alter table public.lesson_resources
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references auth.users(id) on delete set null;
alter table public.workshop_resources
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references auth.users(id) on delete set null;
alter table public.workshop_recordings
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references auth.users(id) on delete set null;

create index if not exists book_files_active_book_created_idx
  on public.book_files(book_id, created_at desc) where archived_at is null;
create index if not exists lesson_resources_active_lesson_idx
  on public.lesson_resources(lesson_id) where archived_at is null;
create index if not exists workshop_resources_active_workshop_idx
  on public.workshop_resources(workshop_id) where archived_at is null;
create index if not exists workshop_recordings_active_workshop_idx
  on public.workshop_recordings(workshop_id, published_at desc) where archived_at is null;

create table public.protected_delivery_cleanup_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  delivery_kind text not null check (delivery_kind in ('book','lesson-video','lesson-resource','workshop-resource','workshop-recording')),
  entity_id uuid not null,
  record_id uuid not null,
  path_hash text not null check (path_hash ~ '^[0-9a-f]{64}$'),
  outcome text not null check (outcome in ('removed','not_managed','failed')),
  created_at timestamptz not null default now()
);
create index protected_delivery_cleanup_events_entity_created_idx
  on public.protected_delivery_cleanup_events(delivery_kind, entity_id, created_at desc);
alter table public.protected_delivery_cleanup_events enable row level security;
revoke all on table public.protected_delivery_cleanup_events from anon, authenticated;

drop policy if exists "book_files: access read" on public.book_files;
create policy "book_files: access read" on public.book_files for select
  using (
    public.has_permission('learning.manage')
    or (archived_at is null and exists (
      select 1 from public.book_access access
       where access.book_id = book_files.book_id and access.user_id = auth.uid()
    ))
  );

drop policy if exists "lesson_resources: enrolled read" on public.lesson_resources;
create policy "lesson_resources: enrolled read" on public.lesson_resources for select
  using (
    public.has_permission('learning.manage')
    or (archived_at is null and exists (
      select 1
        from public.course_lessons lesson
        join public.course_modules module on module.id = lesson.module_id
       where lesson.id = lesson_resources.lesson_id
         and public.is_enrolled(module.course_id)
    ))
  );

drop policy if exists "ws_resources: registered read" on public.workshop_resources;
create policy "ws_resources: registered read" on public.workshop_resources for select
  using (
    public.has_permission('learning.manage')
    or (archived_at is null and exists (
      select 1 from public.workshop_registrations registration
       where registration.workshop_id = workshop_resources.workshop_id
         and registration.user_id = auth.uid()
         and registration.status = 'registered'
    ))
  );

drop policy if exists "ws_recordings: registered read" on public.workshop_recordings;
create policy "ws_recordings: registered read" on public.workshop_recordings for select
  using (
    public.has_permission('learning.manage')
    or (archived_at is null and published_at is not null and exists (
      select 1 from public.workshop_registrations registration
       where registration.workshop_id = workshop_recordings.workshop_id
         and registration.user_id = auth.uid()
         and registration.status = 'registered'
    ))
  );

revoke insert, update, delete on table public.book_files from anon, authenticated;
revoke insert, update, delete on table public.lesson_resources from anon, authenticated;
revoke insert, update, delete on table public.workshop_resources from anon, authenticated;
revoke insert, update, delete on table public.workshop_recordings from anon, authenticated;
revoke update on table public.course_lessons from anon, authenticated;

create or replace function public.archive_protected_delivery_binding(
  p_actor_id uuid,
  p_delivery_kind text,
  p_entity_id uuid,
  p_record_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_path text;
  v_path_hash text;
  v_bucket text;
  v_storage_eligible boolean := false;
  v_revoked_sessions integer := 0;
begin
  if p_actor_id is null or not public.has_permission('learning.manage', p_actor_id) then
    raise exception using errcode = '42501', message = 'learning_management_required';
  end if;
  if p_entity_id is null or p_record_id is null
     or p_delivery_kind not in ('book','lesson-video','lesson-resource','workshop-resource','workshop-recording') then
    raise exception using errcode = '22023', message = 'protected_delivery_archive_invalid';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    'protected-delivery-archive:' || p_delivery_kind || ':' || p_record_id::text,
    0
  ));

  if p_delivery_kind = 'book' then
    select file.storage_path into v_path
      from public.book_files file
     where file.id = p_record_id and file.book_id = p_entity_id and file.archived_at is null
     for update;
    if not found then raise exception using errcode = 'P0002', message = 'protected_delivery_binding_not_found'; end if;
    update public.book_files set archived_at = now(), archived_by = p_actor_id where id = p_record_id;
    v_bucket := 'protected-books';
  elsif p_delivery_kind = 'lesson-video' then
    if p_record_id <> p_entity_id then
      raise exception using errcode = '22023', message = 'protected_delivery_video_identity_invalid';
    end if;
    select lesson.video_path into v_path
      from public.course_lessons lesson
     where lesson.id = p_entity_id
     for update;
    if not found or v_path is null then raise exception using errcode = 'P0002', message = 'protected_delivery_binding_not_found'; end if;
    update public.course_lessons set video_path = null where id = p_entity_id;
    update public.video_admission_sessions
       set revoked_at = now()
     where lesson_id = p_entity_id and revoked_at is null;
    get diagnostics v_revoked_sessions = row_count;
    v_bucket := 'course-videos';
  elsif p_delivery_kind = 'lesson-resource' then
    select resource.file_path into v_path
      from public.lesson_resources resource
     where resource.id = p_record_id and resource.lesson_id = p_entity_id and resource.archived_at is null
     for update;
    if not found then raise exception using errcode = 'P0002', message = 'protected_delivery_binding_not_found'; end if;
    update public.lesson_resources set archived_at = now(), archived_by = p_actor_id where id = p_record_id;
    v_bucket := 'course-resources';
  elsif p_delivery_kind = 'workshop-resource' then
    select resource.file_path into v_path
      from public.workshop_resources resource
     where resource.id = p_record_id and resource.workshop_id = p_entity_id and resource.archived_at is null
     for update;
    if not found then raise exception using errcode = 'P0002', message = 'protected_delivery_binding_not_found'; end if;
    update public.workshop_resources set archived_at = now(), archived_by = p_actor_id where id = p_record_id;
    v_bucket := 'course-resources';
  else
    select recording.storage_path into v_path
      from public.workshop_recordings recording
     where recording.id = p_record_id and recording.workshop_id = p_entity_id and recording.archived_at is null
     for update;
    if not found then raise exception using errcode = 'P0002', message = 'protected_delivery_binding_not_found'; end if;
    update public.workshop_recordings set archived_at = now(), archived_by = p_actor_id where id = p_record_id;
    v_bucket := 'workshop-recordings';
  end if;

  if length(v_path) not between 1 and 1024 then
    raise exception using errcode = '22023', message = 'protected_delivery_storage_path_invalid';
  end if;
  v_path_hash := encode(extensions.digest(v_path, 'sha256'), 'hex');
  v_storage_eligible := v_path ~ '^[A-Za-z0-9][A-Za-z0-9._/-]{0,1023}$'
    and v_path !~ '(^|/)\.\.(/|$)';

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
  values (
    p_actor_id, 'delivery.' || p_delivery_kind || '.archived',
    p_delivery_kind, p_entity_id::text,
    jsonb_build_object(
      'recordId', p_record_id,
      'pathHash', v_path_hash,
      'storageCleanupEligible', v_storage_eligible,
      'revokedVideoSessions', v_revoked_sessions
    )
  );

  return jsonb_build_object(
    'outcome', 'archived', 'recordId', p_record_id,
    'bucket', v_bucket, 'storagePath', v_path, 'pathHash', v_path_hash,
    'storageCleanupEligible', v_storage_eligible
  );
end $$;

create or replace function public.record_protected_delivery_cleanup_result(
  p_actor_id uuid,
  p_delivery_kind text,
  p_entity_id uuid,
  p_record_id uuid,
  p_path_hash text,
  p_outcome text
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
  if p_entity_id is null or p_record_id is null
     or p_delivery_kind not in ('book','lesson-video','lesson-resource','workshop-resource','workshop-recording')
     or p_path_hash !~ '^[0-9a-f]{64}$'
     or p_outcome not in ('removed','not_managed','failed') then
    raise exception using errcode = '22023', message = 'protected_delivery_cleanup_result_invalid';
  end if;
  insert into public.protected_delivery_cleanup_events(
    actor_id, delivery_kind, entity_id, record_id, path_hash, outcome
  ) values (
    p_actor_id, p_delivery_kind, p_entity_id, p_record_id, p_path_hash, p_outcome
  ) returning id into v_id;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
  values (
    p_actor_id, 'delivery.archived_object.cleanup_' || p_outcome,
    p_delivery_kind, p_entity_id::text,
    jsonb_build_object('recordId', p_record_id, 'pathHash', p_path_hash, 'cleanupEventId', v_id)
  );
  if p_outcome = 'failed' then
    insert into public.system_events(level, source, message, meta)
    values (
      'warn', 'protected-delivery', 'Archived private object requires storage reconciliation',
      jsonb_build_object(
        'kind', p_delivery_kind, 'entityId', p_entity_id,
        'recordId', p_record_id, 'pathHash', p_path_hash, 'cleanupEventId', v_id
      )
    );
  end if;
  return v_id;
end $$;

create or replace function public.authorize_book_download(
  p_user_id uuid,
  p_book_file_id uuid,
  p_request_fingerprint text default null
) returns table(status text, remaining integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_book_id uuid;
  v_count integer;
begin
  select file.book_id into v_book_id
    from public.book_files file
   where file.id = p_book_file_id and file.archived_at is null;
  if v_book_id is null or not exists (
    select 1 from public.book_access access
     where access.user_id = p_user_id and access.book_id = v_book_id
  ) then
    insert into public.protected_delivery_events(user_id,event_kind,entity_id,outcome,request_fingerprint)
    values (p_user_id,'book_download',p_book_file_id,'denied',left(p_request_fingerprint,128));
    return query select 'access_denied'::text, 0;
    return;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || v_book_id::text, 0));
  select count(*)::integer into v_count
    from public.book_download_logs download
    join public.book_files file on file.id = download.book_file_id
   where download.user_id = p_user_id
     and file.book_id = v_book_id
     and download.created_at >= now() - interval '24 hours';
  if v_count >= 5 then
    insert into public.protected_delivery_events(user_id,event_kind,entity_id,outcome,request_fingerprint,detail)
    values (p_user_id,'book_download',p_book_file_id,'denied',left(p_request_fingerprint,128),jsonb_build_object('reason','rate_limit'));
    return query select 'rate_limited'::text, 0;
    return;
  end if;
  insert into public.book_download_logs(user_id,book_file_id) values (p_user_id,p_book_file_id);
  insert into public.protected_delivery_events(user_id,event_kind,entity_id,outcome,request_fingerprint)
  values (p_user_id,'book_download',p_book_file_id,'allowed',left(p_request_fingerprint,128));
  return query select 'allowed'::text, 4 - v_count;
end $$;

create or replace function public.authorize_customer_protected_delivery(
  p_actor_id uuid,
  p_delivery_kind text,
  p_entity_id uuid,
  p_scope_slug text default null,
  p_request_fingerprint text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text;
  v_path text;
  v_resource_kind text;
  v_bucket text;
  v_external_url text;
  v_entity_found boolean := false;
  v_has_access boolean := false;
  v_limit integer;
  v_count integer := 0;
  v_event_id uuid;
begin
  if p_actor_id is null or p_entity_id is null
     or p_delivery_kind not in ('course_resource', 'workshop_resource', 'workshop_recording')
     or (p_request_fingerprint is not null and length(p_request_fingerprint) <> 64)
     or (p_delivery_kind = 'course_resource' and p_scope_slug is not null)
     or (p_delivery_kind in ('workshop_resource', 'workshop_recording') and p_scope_slug is null)
     or (p_scope_slug is not null and (length(p_scope_slug) not between 1 and 160 or p_scope_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')) then
    raise exception using errcode = '22023', message = 'protected_delivery_input_invalid';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(
    'protected-delivery:' || p_actor_id::text || ':' || p_delivery_kind || ':' || p_entity_id::text,
    0
  ));
  if p_delivery_kind = 'course_resource' then
    select resource.title, resource.file_path, resource.kind,
           exists (
             select 1 from public.course_enrollments enrollment
              where enrollment.user_id = p_actor_id and enrollment.course_id = module.course_id
           )
      into v_title, v_path, v_resource_kind, v_has_access
      from public.lesson_resources resource
      join public.course_lessons lesson on lesson.id = resource.lesson_id
      join public.course_modules module on module.id = lesson.module_id
     where resource.id = p_entity_id and resource.archived_at is null;
    v_entity_found := found;
    v_bucket := 'course-resources';
    v_limit := 30;
  elsif p_delivery_kind = 'workshop_resource' then
    select resource.title, resource.file_path, resource.kind,
           exists (
             select 1 from public.workshop_registrations registration
              where registration.user_id = p_actor_id
                and registration.workshop_id = resource.workshop_id
                and registration.status = 'registered'
           )
      into v_title, v_path, v_resource_kind, v_has_access
      from public.workshop_resources resource
      join public.workshops workshop on workshop.id = resource.workshop_id
     where resource.id = p_entity_id and resource.archived_at is null
       and workshop.slug = p_scope_slug;
    v_entity_found := found;
    v_bucket := 'course-resources';
    v_limit := 30;
  else
    select recording.title, recording.storage_path, 'video',
           exists (
             select 1 from public.workshop_registrations registration
              where registration.user_id = p_actor_id
                and registration.workshop_id = recording.workshop_id
                and registration.status = 'registered'
           )
      into v_title, v_path, v_resource_kind, v_has_access
      from public.workshop_recordings recording
      join public.workshops workshop on workshop.id = recording.workshop_id
     where recording.id = p_entity_id and recording.archived_at is null
       and recording.published_at is not null and workshop.slug = p_scope_slug;
    v_entity_found := found;
    v_bucket := 'workshop-recordings';
    v_limit := 60;
  end if;
  if v_entity_found and p_delivery_kind in ('course_resource', 'workshop_resource') and v_resource_kind = 'link' then
    if length(v_path) > 2048 or v_path !~* '^https://[^[:space:]]+$' then
      v_has_access := false;
    else
      v_external_url := v_path; v_path := null; v_bucket := null;
    end if;
  end if;
  if not v_entity_found or not v_has_access
     or (v_path is not null and length(v_path) not between 1 and 1024)
     or (v_path is null and v_external_url is null) then
    insert into public.protected_delivery_events(user_id, event_kind, entity_id, outcome, request_fingerprint, detail)
    select p_actor_id, p_delivery_kind, p_entity_id, 'denied', p_request_fingerprint,
           jsonb_build_object('reason', 'access')
     where not exists (
       select 1 from public.protected_delivery_events prior
        where prior.user_id = p_actor_id and prior.event_kind = p_delivery_kind
          and prior.entity_id = p_entity_id and prior.outcome = 'denied'
          and prior.detail->>'reason' = 'access' and prior.created_at >= now() - interval '5 minutes'
     );
    return jsonb_build_object('status', 'access_denied');
  end if;
  select count(*)::integer into v_count
    from public.protected_delivery_events event
   where event.user_id = p_actor_id and event.event_kind = p_delivery_kind
     and event.entity_id = p_entity_id and event.outcome = 'allowed'
     and event.created_at >= now() - interval '24 hours';
  if v_count >= v_limit then
    insert into public.protected_delivery_events(user_id, event_kind, entity_id, outcome, request_fingerprint, detail)
    select p_actor_id, p_delivery_kind, p_entity_id, 'denied', p_request_fingerprint,
           jsonb_build_object('reason', 'rate_limit', 'windowHours', 24, 'limit', v_limit)
     where not exists (
       select 1 from public.protected_delivery_events prior
        where prior.user_id = p_actor_id and prior.event_kind = p_delivery_kind
          and prior.entity_id = p_entity_id and prior.outcome = 'denied'
          and prior.detail->>'reason' = 'rate_limit' and prior.created_at >= now() - interval '15 minutes'
     );
    return jsonb_build_object('status', 'rate_limited', 'remaining', 0);
  end if;
  insert into public.protected_delivery_events(user_id, event_kind, entity_id, outcome, request_fingerprint, detail)
  values (
    p_actor_id, p_delivery_kind, p_entity_id, 'allowed', p_request_fingerprint,
    jsonb_build_object('phase', 'authorized', 'remaining', v_limit - v_count - 1)
  ) returning id into v_event_id;
  return jsonb_strip_nulls(jsonb_build_object(
    'status', 'allowed', 'eventId', v_event_id, 'bucket', v_bucket, 'path', v_path,
    'title', v_title, 'resourceKind', v_resource_kind, 'externalUrl', v_external_url,
    'remaining', v_limit - v_count - 1
  ));
end $$;

revoke all on function public.archive_protected_delivery_binding(uuid,text,uuid,uuid) from public, anon, authenticated;
revoke all on function public.record_protected_delivery_cleanup_result(uuid,text,uuid,uuid,text,text) from public, anon, authenticated;
revoke all on function public.authorize_book_download(uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.authorize_customer_protected_delivery(uuid,text,uuid,text,text) from public, anon, authenticated;
grant execute on function public.archive_protected_delivery_binding(uuid,text,uuid,uuid) to service_role;
grant execute on function public.record_protected_delivery_cleanup_result(uuid,text,uuid,uuid,text,text) to service_role;
grant execute on function public.authorize_book_download(uuid,uuid,text) to service_role;
grant execute on function public.authorize_customer_protected_delivery(uuid,text,uuid,text,text) to service_role;

comment on table public.protected_delivery_cleanup_events is
  'Service-only hash-safe evidence for post-commit private Storage cleanup after a protected delivery binding is archived.';
comment on function public.archive_protected_delivery_binding(uuid,text,uuid,uuid) is
  'Permission-rechecked archival of a protected delivery binding with metadata-only audit; returns the private path only to the service caller for post-commit cleanup.';
comment on function public.record_protected_delivery_cleanup_result(uuid,text,uuid,uuid,text,text) is
  'Service-only result of the non-transactional Storage cleanup phase; failures create hash-only reconciliation evidence.';

-- Rollback-by-forward-fix: preserve archived rows, download/admission history,
-- cleanup evidence and audits. Never re-enable archived customer delivery.
