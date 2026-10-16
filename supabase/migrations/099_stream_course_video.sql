-- Optional private Cloudflare Stream delivery. Secrets and upload URLs are server-only.
create table public.lesson_stream_uploads (
 id uuid primary key, actor_id uuid not null references auth.users(id), lesson_id uuid not null references public.course_lessons(id),
 bytes bigint not null check(bytes between 1 and 10737418240), fingerprint text not null, max_seconds int not null check(max_seconds between 60 and 14400),
 previous_path text, uid text, upload_url text, status text not null default 'preparing' check(status in('preparing','uploading','bound','abandoned')),
 created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '6 hours'
);
alter table public.lesson_stream_uploads enable row level security;
revoke all on public.lesson_stream_uploads from public,anon,authenticated;
grant select on public.lesson_stream_uploads to service_role;
create function public.manage_lesson_stream_upload(p_actor uuid,p_lesson uuid,p_id uuid,p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare l public.course_lessons%rowtype; job public.lesson_stream_uploads%rowtype; published boolean; fresh boolean:=false;
begin
 if auth.role() is distinct from 'service_role' or not public.has_permission('learning.manage',p_actor) then raise exception 'stream_permission_required' using errcode='42501';end if;
 select * into strict l from public.course_lessons where id=p_lesson for update;
 select c.is_published into published from public.courses c join public.course_modules m on m.course_id=c.id where m.id=l.module_id;
 if published and not public.has_permission('catalog.publish',p_actor) then raise exception 'stream_publish_required' using errcode='42501';end if;
 select * into job from public.lesson_stream_uploads where id=p_id for update;
 if p_action='begin' and not found then
  if length(p_payload->>'fingerprint')<>64 then raise exception 'invalid fingerprint';end if;
  if exists(select 1 from public.lesson_stream_uploads where lesson_id=p_lesson and status in('preparing','uploading') and expires_at>now()) then raise exception 'stream_upload_in_progress';end if;
  insert into public.lesson_stream_uploads(id,actor_id,lesson_id,bytes,fingerprint,max_seconds,previous_path)
  values(p_id,p_actor,p_lesson,(p_payload->>'bytes')::bigint,p_payload->>'fingerprint',(p_payload->>'maxSeconds')::int,l.video_path) returning * into job;
  fresh:=true;
 end if;
 if job.id is null or job.actor_id<>p_actor or job.lesson_id<>p_lesson then raise exception 'stream_intent_missing';end if;
 if p_action='begin' and (job.bytes<>(p_payload->>'bytes')::bigint or job.fingerprint<>p_payload->>'fingerprint') then raise exception 'stream_file_mismatch';end if;
 if job.status='bound' then return jsonb_build_object('id',job.id,'status','bound');end if;
 if job.expires_at<=now() or job.status='abandoned' then raise exception 'stream_intent_expired';end if;
 if p_action='provision' then
  if job.status<>'preparing' or (p_payload->>'uid') !~ '^[0-9a-f]{32}$' or (p_payload->>'url') !~ '^https://upload[.]videodelivery[.]net/' then raise exception 'stream_provision_invalid';end if;
  update public.lesson_stream_uploads set uid=p_payload->>'uid',upload_url=p_payload->>'url',status='uploading' where id=p_id returning * into job;
 elsif p_action='bind' then
  if job.status<>'uploading' or job.uid is null then raise exception 'stream_not_ready';end if;
  if l.video_path is distinct from job.previous_path then raise exception 'stream_lesson_changed';end if;
  update public.course_lessons set video_path='stream/'||job.uid,duration_seconds=least(14400,greatest(1,(p_payload->>'duration')::int)) where id=p_lesson;
  update public.lesson_stream_uploads set status='bound',upload_url=null where id=p_id returning * into job;
 elsif p_action='abandon' then update public.lesson_stream_uploads set status='abandoned',upload_url=null where id=p_id returning * into job;
 elsif p_action<>'begin' then raise exception 'invalid action';end if;
 if fresh or p_action<>'begin' then insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta) values(p_actor,'lesson.stream_'||p_action,'lesson',p_lesson::text,jsonb_build_object('intent_id',p_id));end if;
 return jsonb_build_object('id',job.id,'status',job.status,'uid',job.uid,'uploadUrl',job.upload_url,'fresh',fresh);
end $$;
revoke all on function public.manage_lesson_stream_upload(uuid,uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.manage_lesson_stream_upload(uuid,uuid,uuid,text,jsonb) to service_role;
-- Stream references deliberately use a non-Storage namespace. Existing access,
-- curriculum completeness, replacement revocation and archive boundaries apply.
-- Unreferenced Stream videos are retained for explicit provider cleanup, never deleted by Storage jobs.
