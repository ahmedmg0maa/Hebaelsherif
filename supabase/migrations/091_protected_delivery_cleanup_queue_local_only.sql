-- 091 LOCAL ONLY: durable cleanup authority; no provider call in a transaction.
-- Conservative 24-hour quarantine after intent expiry before physical deletion.
-- Old unmanaged paths require separate reconciliation; never infer ownership from shape.
create table public.protected_cleanup_jobs (
 id uuid primary key default gen_random_uuid(), bucket text not null,
 storage_path text not null, path_hash text not null,
 upload_kind text not null, entity_id uuid not null,
 status text not null default 'pending' check(status in ('pending','running','removed','blocked')),
 reason text not null, attempts integer not null default 0,
 not_before timestamptz not null default now(), lease_until timestamptz,
 lease_token uuid, claimed_by uuid references auth.users(id),
 created_at timestamptz not null default now(), completed_at timestamptz,
 unique(bucket,storage_path), check(path_hash ~ '^[0-9a-f]{64}$')
);
alter table public.protected_cleanup_jobs enable row level security;
revoke all on public.protected_cleanup_jobs from public,anon,authenticated;
grant select on public.protected_cleanup_jobs to service_role;
create index protected_cleanup_due_idx on public.protected_cleanup_jobs(status,not_before);

create function public.protected_path_in_use(p_bucket text,p_path text) returns boolean language sql stable security definer set search_path='' as $$
 select case p_bucket
 when 'protected-books' then exists(select 1 from public.book_files where storage_path=p_path and archived_at is null)
 when 'course-videos' then exists(select 1 from public.course_lessons where video_path=p_path)
 when 'course-resources' then exists(select 1 from public.lesson_resources where file_path=p_path and archived_at is null) or exists(select 1 from public.workshop_resources where file_path=p_path and archived_at is null)
 when 'workshop-recordings' then exists(select 1 from public.workshop_recordings where storage_path=p_path and archived_at is null)
 else true end
$$;
create function public.queue_protected_cleanup(p_kind text,p_entity uuid,p_path text,p_reason text) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_bucket text; v_intent public.protected_upload_intents%rowtype; v_id uuid;
begin
 if p_path is null or p_path='' then return null; end if;
 v_bucket:=case p_kind when 'book' then 'protected-books' when 'lesson-video' then 'course-videos' when 'lesson-resource' then 'course-resources' when 'workshop-resource' then 'course-resources' when 'workshop-recording' then 'workshop-recordings' end;
 if v_bucket is null then raise exception 'cleanup_kind_invalid'; end if;
 perform pg_advisory_xact_lock(hashtextextended('protected-cleanup:'||v_bucket||':'||p_path,0));
 select * into v_intent from public.protected_upload_intents where storage_path=p_path and upload_kind=p_kind and entity_id=p_entity;
 insert into public.protected_cleanup_jobs(bucket,storage_path,path_hash,upload_kind,entity_id,status,reason,not_before)
 values(v_bucket,p_path,encode(extensions.digest(p_path,'sha256'),'hex'),p_kind,p_entity,
  case when v_intent.id is null then 'blocked' else 'pending' end,
  case when v_intent.id is null then 'unmanaged_path' else p_reason end,
  greatest(now(),coalesce(v_intent.expires_at,now())+interval '24 hours'))
 on conflict(bucket,storage_path) do nothing returning id into v_id;
 if v_id is null then select id into v_id from public.protected_cleanup_jobs where bucket=v_bucket and storage_path=p_path; end if;
 return v_id;
end $$;

create function public.track_protected_cleanup() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='protected_upload_intents' then
  if new.status in ('rejected','quarantined','expired') and new.status is distinct from old.status then
   perform public.queue_protected_cleanup(new.upload_kind,new.entity_id,new.storage_path,'upload_'||new.status);
  end if;
 elsif tg_table_name='course_lessons' then
  if old.video_path is not null and new.video_path is distinct from old.video_path then
   perform public.queue_protected_cleanup('lesson-video',old.id,old.video_path,'video_replaced_or_removed');
   update public.video_admission_sessions set revoked_at=now() where lesson_id=old.id and revoked_at is null;
  end if;
 elsif old.archived_at is null and new.archived_at is not null then
  if tg_table_name='book_files' then perform public.queue_protected_cleanup('book',old.book_id,old.storage_path,'binding_archived');
  elsif tg_table_name='lesson_resources' then perform public.queue_protected_cleanup('lesson-resource',old.lesson_id,old.file_path,'binding_archived');
  elsif tg_table_name='workshop_resources' then perform public.queue_protected_cleanup('workshop-resource',old.workshop_id,old.file_path,'binding_archived');
  elsif tg_table_name='workshop_recordings' then perform public.queue_protected_cleanup('workshop-recording',old.workshop_id,old.storage_path,'binding_archived'); end if;
 end if;
 return new;
end $$;
create trigger upload_cleanup_queue after update on public.protected_upload_intents for each row execute function public.track_protected_cleanup();
create trigger lesson_video_cleanup_queue after update on public.course_lessons for each row execute function public.track_protected_cleanup();
create trigger book_cleanup_queue after update on public.book_files for each row execute function public.track_protected_cleanup();
create trigger lesson_resource_cleanup_queue after update on public.lesson_resources for each row execute function public.track_protected_cleanup();
create trigger workshop_resource_cleanup_queue after update on public.workshop_resources for each row execute function public.track_protected_cleanup();
create trigger recording_cleanup_queue after update on public.workshop_recordings for each row execute function public.track_protected_cleanup();

-- Tombstones prevent a new reference while Storage removal is in flight or finished.
create function public.guard_cleanup_rebinding() returns trigger language plpgsql security definer set search_path='' as $$
declare v_path text; v_old text; v_bucket text; v_active boolean:=true; v_old_active boolean:=false;
begin
 if tg_table_name='course_lessons' then v_path:=new.video_path; v_bucket:='course-videos'; if tg_op='UPDATE' then v_old:=old.video_path; v_old_active:=true; end if;
 else
  v_active:=new.archived_at is null;
  if tg_op='UPDATE' then v_old_active:=old.archived_at is null; end if;
  if tg_table_name='book_files' then v_path:=new.storage_path; v_bucket:='protected-books'; if tg_op='UPDATE' then v_old:=old.storage_path; end if;
  elsif tg_table_name='workshop_recordings' then v_path:=new.storage_path; v_bucket:='workshop-recordings'; if tg_op='UPDATE' then v_old:=old.storage_path; end if;
  else v_path:=new.file_path; v_bucket:='course-resources'; if tg_op='UPDATE' then v_old:=old.file_path; end if; end if;
 end if;
 if v_active and v_path is not null and not(v_old_active and v_path is not distinct from v_old) then
  perform pg_advisory_xact_lock(hashtextextended('protected-cleanup:'||v_bucket||':'||v_path,0));
  if exists(select 1 from public.protected_cleanup_jobs where bucket=v_bucket and storage_path=v_path) then raise exception 'protected_path_retired'; end if;
 end if;
 return new;
end $$;
create trigger book_cleanup_guard before insert or update on public.book_files for each row execute function public.guard_cleanup_rebinding();
create trigger video_cleanup_guard before insert or update on public.course_lessons for each row execute function public.guard_cleanup_rebinding();
create trigger lesson_resource_cleanup_guard before insert or update on public.lesson_resources for each row execute function public.guard_cleanup_rebinding();
create trigger workshop_resource_cleanup_guard before insert or update on public.workshop_resources for each row execute function public.guard_cleanup_rebinding();
create trigger recording_cleanup_guard before insert or update on public.workshop_recordings for each row execute function public.guard_cleanup_rebinding();

create function public.archive_protected_delivery_v2(p_actor_id uuid,p_delivery_kind text,p_entity_id uuid,p_record_id uuid,p_expected_hash text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_path text; v_result jsonb; v_job uuid;
begin
 if p_actor_id is null or public.has_permission('learning.manage',p_actor_id) is not true then raise exception using errcode='42501',message='learning_management_required'; end if;
 if p_delivery_kind='lesson-video' then
  select video_path into v_path from public.course_lessons where id=p_entity_id for update;
  if p_expected_hash is null or v_path is null or encode(extensions.digest(v_path,'sha256'),'hex')<>p_expected_hash then raise exception 'protected_delivery_version_conflict'; end if;
 end if;
 v_result:=public.archive_protected_delivery_binding(p_actor_id,p_delivery_kind,p_entity_id,p_record_id);
 select id into v_job from public.protected_cleanup_jobs where bucket=v_result->>'bucket' and storage_path=v_result->>'storagePath';
 if v_job is null then raise exception 'cleanup_job_required'; end if;
 return jsonb_build_object('outcome','archived','recordId',p_record_id,'jobId',v_job);
end $$;
revoke all on function public.archive_protected_delivery_binding(uuid,text,uuid,uuid) from service_role;

create function public.claim_protected_cleanup(p_actor_id uuid,p_job_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.protected_cleanup_jobs%rowtype; v_token uuid;
begin
 if p_actor_id is null or public.has_permission('learning.manage',p_actor_id) is not true then raise exception using errcode='42501',message='learning_management_required'; end if;
 select * into j from public.protected_cleanup_jobs where id=p_job_id for update;
 if not found then raise exception 'cleanup_job_not_found'; end if;
 if j.status='removed' then return jsonb_build_object('outcome','removed'); end if;
 if j.reason='unmanaged_path' then return jsonb_build_object('outcome','unmanaged'); end if;
 if j.not_before>now() or (j.status='running' and j.lease_until>now()) then return jsonb_build_object('outcome','waiting'); end if;
 perform pg_advisory_xact_lock(hashtextextended('protected-cleanup:'||j.bucket||':'||j.storage_path,0));
 if public.protected_path_in_use(j.bucket,j.storage_path) then
  update public.protected_cleanup_jobs set status='blocked',reason='still_referenced' where id=j.id;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta) values(p_actor_id,'delivery.cleanup.blocked','cleanup_job',j.id::text,jsonb_build_object('pathHash',j.path_hash));
  return jsonb_build_object('outcome','referenced');
 end if;
 v_token:=gen_random_uuid();
 update public.protected_cleanup_jobs set status='running',lease_token=v_token,claimed_by=p_actor_id,lease_until=now()+interval '10 minutes',attempts=attempts+1 where id=j.id;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta) values(p_actor_id,'delivery.cleanup.claimed','cleanup_job',j.id::text,jsonb_build_object('pathHash',j.path_hash));
 return jsonb_build_object('outcome','claimed','token',v_token,'bucket',j.bucket,'storagePath',j.storage_path,'pathHash',j.path_hash);
end $$;
create function public.complete_protected_cleanup(p_actor_id uuid,p_job_id uuid,p_token uuid,p_removed boolean) returns boolean language plpgsql security definer set search_path='' as $$
declare j public.protected_cleanup_jobs%rowtype;
begin
 if p_actor_id is null or public.has_permission('learning.manage',p_actor_id) is not true then raise exception using errcode='42501',message='learning_management_required'; end if;
 select * into j from public.protected_cleanup_jobs where id=p_job_id for update;
 if not found or j.status<>'running' or j.claimed_by is distinct from p_actor_id or j.lease_token is distinct from p_token or p_removed is null then raise exception 'cleanup_claim_invalid'; end if;
 update public.protected_cleanup_jobs set status=case when p_removed then 'removed' else 'pending' end,
  reason=case when p_removed then 'removed' else 'provider_failed' end,not_before=now()+interval '5 minutes',
  completed_at=case when p_removed then now() end,lease_token=null,lease_until=null where id=j.id;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta) values(p_actor_id,'delivery.cleanup.'||case when p_removed then 'removed' else 'failed' end,'cleanup_job',j.id::text,jsonb_build_object('pathHash',j.path_hash,'attempt',j.attempts));
 return true;
end $$;
create function public.expire_protected_uploads(p_actor_id uuid) returns integer language plpgsql security definer set search_path='' as $$
declare v_count integer;
begin
 if p_actor_id is null or public.has_permission('learning.manage',p_actor_id) is not true then raise exception using errcode='42501',message='learning_management_required'; end if;
 with expired as (select id from public.protected_upload_intents where status='issued' and expires_at<=now() order by expires_at limit 100 for update skip locked)
 update public.protected_upload_intents set status='expired' where id in(select id from expired);
 get diagnostics v_count=row_count;
 insert into public.audit_logs(actor_id,action,entity_type,meta) values(p_actor_id,'delivery.uploads.expired','upload_intent',jsonb_build_object('count',v_count));
 return v_count;
end $$;
-- Backfill known terminal/archived records without deleting any object.
select public.queue_protected_cleanup(upload_kind,entity_id,storage_path,'terminal_backfill') from public.protected_upload_intents where status in ('rejected','quarantined','expired');
select public.queue_protected_cleanup('book',book_id,storage_path,'archive_backfill') from public.book_files where archived_at is not null;
select public.queue_protected_cleanup('lesson-resource',lesson_id,file_path,'archive_backfill') from public.lesson_resources where archived_at is not null;
select public.queue_protected_cleanup('workshop-resource',workshop_id,file_path,'archive_backfill') from public.workshop_resources where archived_at is not null;
select public.queue_protected_cleanup('workshop-recording',workshop_id,storage_path,'archive_backfill') from public.workshop_recordings where archived_at is not null;

revoke all on function public.protected_path_in_use(text,text),public.queue_protected_cleanup(text,uuid,text,text),public.track_protected_cleanup(),public.guard_cleanup_rebinding() from public,anon,authenticated,service_role;
revoke all on function public.archive_protected_delivery_v2(uuid,text,uuid,uuid,text),public.claim_protected_cleanup(uuid,uuid),public.complete_protected_cleanup(uuid,uuid,uuid,boolean),public.expire_protected_uploads(uuid) from public,anon,authenticated;
grant execute on function public.archive_protected_delivery_v2(uuid,text,uuid,uuid,text),public.claim_protected_cleanup(uuid,uuid),public.complete_protected_cleanup(uuid,uuid,uuid,boolean),public.expire_protected_uploads(uuid) to service_role;

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
  if v_intent.status in ('rejected','quarantined','expired') then
    return jsonb_build_object('authorized', false, 'outcome', v_intent.status);
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


-- PostgreSQL ARE repetition counts are capped at 255; the separate length guard already enforces 1024.
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
  v_storage_eligible := v_path ~ '^[A-Za-z0-9][A-Za-z0-9._/-]*$'
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
