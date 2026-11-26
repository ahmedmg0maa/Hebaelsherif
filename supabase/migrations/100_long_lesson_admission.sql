-- Fixed four-hour viewing admission; every new file range still checks enrollment and revocation.
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
  v_expires_at timestamptz := now() + interval '4 hours';
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

  update public.video_admission_sessions vas
  set revoked_at = now()
  where vas.user_id = p_user_id and vas.revoked_at is null and vas.expires_at > now();
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
    and exists(select 1 from public.course_lessons l join public.course_modules m on m.id=l.module_id
      join public.course_enrollments ce on ce.course_id=m.course_id and ce.user_id=p_user_id
      where l.id=p_lesson_id and l.video_path is not null)
  returning vas.id, vas.device_id into v_session_id, v_device_id;

  if v_session_id is null then return false; end if;
  update public.delivery_devices set last_seen_at = now() where id = v_device_id and revoked_at is null;
  return found;
end;
$$;

