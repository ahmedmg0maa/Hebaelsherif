-- 065: governed customer admission for course/workshop protected delivery.
-- LOCAL ONLY. Apply after 064 on authorized Staging with a verified recovery
-- point and schema fingerprint. Never apply to Production from this workspace.

alter table public.protected_delivery_events
  drop constraint if exists protected_delivery_events_event_kind_check;
alter table public.protected_delivery_events
  add constraint protected_delivery_events_event_kind_check check (
    event_kind in (
      'book_download', 'video_admission', 'video_replaced', 'upload_inspection',
      'course_resource', 'workshop_resource', 'workshop_recording'
    )
  );

create index if not exists protected_delivery_events_admission_limit_idx
  on public.protected_delivery_events(user_id, event_kind, entity_id, created_at desc)
  where outcome = 'allowed';

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
     or p_delivery_kind is null
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
     where resource.id = p_entity_id;
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
     where resource.id = p_entity_id
       and (p_scope_slug is null or workshop.slug = p_scope_slug);
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
     where recording.id = p_entity_id
       and recording.published_at is not null
       and (p_scope_slug is null or workshop.slug = p_scope_slug);
    v_entity_found := found;
    v_bucket := 'workshop-recordings';
    v_limit := 60;
  end if;

  if v_entity_found and p_delivery_kind in ('course_resource', 'workshop_resource') and v_resource_kind = 'link' then
    if length(v_path) > 2048 or v_path !~* '^https://[^[:space:]]+$' then
      v_has_access := false;
    else
      v_external_url := v_path;
      v_path := null;
      v_bucket := null;
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
        where prior.user_id = p_actor_id
          and prior.event_kind = p_delivery_kind
          and prior.entity_id = p_entity_id
          and prior.outcome = 'denied'
          and prior.detail->>'reason' = 'access'
          and prior.created_at >= now() - interval '5 minutes'
     );
    return jsonb_build_object('status', 'access_denied');
  end if;

  select count(*)::integer into v_count
    from public.protected_delivery_events event
   where event.user_id = p_actor_id
     and event.event_kind = p_delivery_kind
     and event.entity_id = p_entity_id
     and event.outcome = 'allowed'
     and event.created_at >= now() - interval '24 hours';

  if v_count >= v_limit then
    insert into public.protected_delivery_events(user_id, event_kind, entity_id, outcome, request_fingerprint, detail)
    select p_actor_id, p_delivery_kind, p_entity_id, 'denied', p_request_fingerprint,
           jsonb_build_object('reason', 'rate_limit', 'windowHours', 24, 'limit', v_limit)
     where not exists (
       select 1 from public.protected_delivery_events prior
        where prior.user_id = p_actor_id
          and prior.event_kind = p_delivery_kind
          and prior.entity_id = p_entity_id
          and prior.outcome = 'denied'
          and prior.detail->>'reason' = 'rate_limit'
          and prior.created_at >= now() - interval '15 minutes'
     );
    return jsonb_build_object('status', 'rate_limited', 'remaining', 0);
  end if;

  insert into public.protected_delivery_events(user_id, event_kind, entity_id, outcome, request_fingerprint, detail)
  values (
    p_actor_id, p_delivery_kind, p_entity_id, 'allowed', p_request_fingerprint,
    jsonb_build_object('phase', 'authorized', 'remaining', v_limit - v_count - 1)
  ) returning id into v_event_id;

  return jsonb_strip_nulls(jsonb_build_object(
    'status', 'allowed',
    'eventId', v_event_id,
    'bucket', v_bucket,
    'path', v_path,
    'title', v_title,
    'resourceKind', v_resource_kind,
    'externalUrl', v_external_url,
    'remaining', v_limit - v_count - 1
  ));
end $$;

revoke all on function public.authorize_customer_protected_delivery(uuid,text,uuid,text,text)
  from public, anon, authenticated;
grant execute on function public.authorize_customer_protected_delivery(uuid,text,uuid,text,text)
  to service_role;

comment on function public.authorize_customer_protected_delivery(uuid,text,uuid,text,text) is
  'Service-only enrollment/registration admission for protected resources with a 24-hour mint limit and privacy-minimized evidence.';

-- Rollback-by-forward-fix: preserve admission evidence. Replace the function
-- or limit policy in a later migration; do not restore route-only entitlement.
