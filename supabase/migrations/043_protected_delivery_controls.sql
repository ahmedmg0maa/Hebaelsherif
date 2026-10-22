-- 043: fail-closed protected delivery admission, rate limits, and upload inspection audit

create table public.protected_delivery_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_kind text not null check (event_kind in ('book_download','video_admission','video_replaced','upload_inspection')),
  entity_id uuid,
  outcome text not null check (outcome in ('allowed','denied','validated','rejected','quarantined')),
  request_fingerprint text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index protected_delivery_events_user_created_idx
  on public.protected_delivery_events(user_id, created_at desc);
create index protected_delivery_events_kind_created_idx
  on public.protected_delivery_events(event_kind, created_at desc);

alter table public.protected_delivery_events enable row level security;
create policy "protected_delivery_events: permitted read"
  on public.protected_delivery_events for select
  using (public.has_permission('audit.view'));

create table public.delivery_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_hash text not null check (length(device_hash) = 64),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (user_id, device_hash)
);

create index delivery_devices_user_active_idx
  on public.delivery_devices(user_id, last_seen_at desc)
  where revoked_at is null;

alter table public.delivery_devices enable row level security;

create table public.video_admission_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.course_lessons(id) on delete cascade,
  device_id uuid not null references public.delivery_devices(id) on delete cascade,
  token_hash text not null unique check (length(token_hash) = 64),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);

create index video_admission_sessions_user_active_idx
  on public.video_admission_sessions(user_id, expires_at desc)
  where revoked_at is null;

alter table public.video_admission_sessions enable row level security;

create table public.protected_upload_inspections (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  upload_kind text not null,
  entity_id uuid not null,
  path_hash text not null check (length(path_hash) = 64),
  declared_mime text not null,
  observed_mime text,
  declared_size bigint not null check (declared_size > 0),
  observed_size bigint,
  outcome text not null check (outcome in ('validated','rejected','quarantined')),
  reason text,
  created_at timestamptz not null default now()
);

create index protected_upload_inspections_created_idx
  on public.protected_upload_inspections(created_at desc);

alter table public.protected_upload_inspections enable row level security;
create policy "protected_upload_inspections: permitted read"
  on public.protected_upload_inspections for select
  using (public.has_permission('audit.view'));

create index if not exists book_download_logs_user_file_created_idx
  on public.book_download_logs(user_id, book_file_id, created_at desc);

create or replace function public.authorize_book_download(
  p_user_id uuid,
  p_book_file_id uuid,
  p_request_fingerprint text default null
)
returns table(status text, remaining integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_book_id uuid;
  v_count integer;
begin
  select bf.book_id into v_book_id
  from public.book_files bf
  where bf.id = p_book_file_id;

  if v_book_id is null or not exists (
    select 1 from public.book_access ba
    where ba.user_id = p_user_id and ba.book_id = v_book_id
  ) then
    insert into public.protected_delivery_events(user_id,event_kind,entity_id,outcome,request_fingerprint)
    values (p_user_id,'book_download',p_book_file_id,'denied',left(p_request_fingerprint,128));
    return query select 'access_denied'::text, 0;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || v_book_id::text, 0));

  select count(*)::integer into v_count
  from public.book_download_logs bdl
  join public.book_files bf on bf.id = bdl.book_file_id
  where bdl.user_id = p_user_id
    and bf.book_id = v_book_id
    and bdl.created_at >= now() - interval '24 hours';

  if v_count >= 5 then
    insert into public.protected_delivery_events(user_id,event_kind,entity_id,outcome,request_fingerprint,detail)
    values (p_user_id,'book_download',p_book_file_id,'denied',left(p_request_fingerprint,128),jsonb_build_object('reason','rate_limit'));
    return query select 'rate_limited'::text, 0;
    return;
  end if;

  insert into public.book_download_logs(user_id,book_file_id)
  values (p_user_id,p_book_file_id);
  insert into public.protected_delivery_events(user_id,event_kind,entity_id,outcome,request_fingerprint)
  values (p_user_id,'book_download',p_book_file_id,'allowed',left(p_request_fingerprint,128));
  return query select 'allowed'::text, 4 - v_count;
end;
$$;

create or replace function public.begin_video_admission(
  p_user_id uuid,
  p_lesson_id uuid,
  p_device_hash text,
  p_token_hash text
)
returns table(status text, admission_id uuid, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_device_id uuid;
  v_device_count integer;
  v_admission_id uuid;
  v_expires_at timestamptz := now() + interval '15 minutes';
  v_has_access boolean;
begin
  if length(p_device_hash) <> 64 or length(p_token_hash) <> 64 then
    return query select 'invalid_request'::text, null::uuid, null::timestamptz;
    return;
  end if;

  select exists (
    select 1
    from public.course_lessons l
    join public.course_modules m on m.id = l.module_id
    where l.id = p_lesson_id
      and l.video_path is not null
      and (l.is_preview or exists (
        select 1 from public.course_enrollments ce
        where ce.user_id = p_user_id and ce.course_id = m.course_id
      ))
  ) into v_has_access;

  if not v_has_access then
    insert into public.protected_delivery_events(user_id,event_kind,entity_id,outcome,detail)
    values (p_user_id,'video_admission',p_lesson_id,'denied',jsonb_build_object('reason','access'));
    return query select 'access_denied'::text, null::uuid, null::timestamptz;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select d.id into v_device_id
  from public.delivery_devices d
  where d.user_id = p_user_id and d.device_hash = p_device_hash and d.revoked_at is null;

  if v_device_id is null then
    select count(*)::integer into v_device_count
    from public.delivery_devices d
    where d.user_id = p_user_id
      and d.revoked_at is null
      and d.last_seen_at >= now() - interval '30 days';

    if v_device_count >= 2 then
      insert into public.protected_delivery_events(user_id,event_kind,entity_id,outcome,detail)
      values (p_user_id,'video_admission',p_lesson_id,'denied',jsonb_build_object('reason','device_limit'));
      return query select 'device_limit'::text, null::uuid, null::timestamptz;
      return;
    end if;

    insert into public.delivery_devices(user_id,device_hash)
    values (p_user_id,p_device_hash)
    on conflict (user_id,device_hash) do update
      set revoked_at = null, last_seen_at = now()
    returning id into v_device_id;
  else
    update public.delivery_devices set last_seen_at = now() where id = v_device_id;
  end if;

  update public.video_admission_sessions
  set revoked_at = now()
  where user_id = p_user_id and revoked_at is null and expires_at > now();
  if found then
    insert into public.protected_delivery_events(user_id,event_kind,entity_id,outcome,detail)
    values (p_user_id,'video_replaced',p_lesson_id,'allowed',jsonb_build_object('reason','single_concurrent_session'));
  end if;

  insert into public.video_admission_sessions(user_id,lesson_id,device_id,token_hash,expires_at)
  values (p_user_id,p_lesson_id,v_device_id,p_token_hash,v_expires_at)
  returning id into v_admission_id;

  insert into public.protected_delivery_events(user_id,event_kind,entity_id,outcome)
  values (p_user_id,'video_admission',p_lesson_id,'allowed');
  return query select 'allowed'::text, v_admission_id, v_expires_at;
end;
$$;

create or replace function public.validate_video_admission(
  p_user_id uuid,
  p_lesson_id uuid,
  p_token_hash text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
  v_device_id uuid;
begin
  update public.video_admission_sessions vas
  set last_seen_at = now()
  where vas.user_id = p_user_id
    and vas.lesson_id = p_lesson_id
    and vas.token_hash = p_token_hash
    and vas.revoked_at is null
    and vas.expires_at > now()
  returning vas.id, vas.device_id into v_session_id, v_device_id;

  if v_session_id is null then return false; end if;
  update public.delivery_devices set last_seen_at = now() where id = v_device_id and revoked_at is null;
  return found;
end;
$$;

revoke all on function public.authorize_book_download(uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.begin_video_admission(uuid,uuid,text,text) from public, anon, authenticated;
revoke all on function public.validate_video_admission(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.authorize_book_download(uuid,uuid,text) to service_role;
grant execute on function public.begin_video_admission(uuid,uuid,text,text) to service_role;
grant execute on function public.validate_video_admission(uuid,uuid,text) to service_role;

revoke all on public.protected_delivery_events from anon, authenticated;
revoke all on public.delivery_devices from anon, authenticated;
revoke all on public.video_admission_sessions from anon, authenticated;
revoke all on public.protected_upload_inspections from anon, authenticated;
