-- 061: atomic Admin booking, reschedule and availability governance.
-- LOCAL ONLY. Apply after 060 on an authorized Staging project with a verified
-- recovery point and schema fingerprint. Never apply this migration to
-- Production from this workspace.

-- Browser sessions must use the server actions below. Keeping all mutations in
-- SECURITY DEFINER RPCs lets the database re-check the explicit Admin actor and
-- commit the business change together with its content-free audit evidence.
drop policy if exists "bookings: admin update" on public.bookings;
drop policy if exists "availability_rules: admin write" on public.availability_rules;
drop policy if exists "availability_exceptions: admin write" on public.availability_exceptions;
drop policy if exists "booking slot overrides: permitted write" on public.booking_slot_overrides;

revoke update on table public.bookings from anon, authenticated;
revoke insert, update, delete on table public.availability_rules from anon, authenticated;
revoke insert, update, delete on table public.availability_exceptions from anon, authenticated;
revoke insert, update, delete on table public.booking_slot_overrides from anon, authenticated;

create or replace function public.admin_update_booking_governed(
  p_actor_id uuid,
  p_booking_id uuid,
  p_starts_at timestamptz,
  p_status text,
  p_meeting_url text default null,
  p_admin_notes text default ''
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings%rowtype;
  v_service public.services%rowtype;
  v_status text := lower(btrim(coalesce(p_status, '')));
  v_meeting_url text := nullif(btrim(coalesce(p_meeting_url, '')), '');
  v_admin_notes text := btrim(coalesce(p_admin_notes, ''));
  v_target_ends timestamptz;
  v_local timestamp;
  v_schedule_changed boolean;
  v_status_changed boolean;
  v_notification_title text;
  v_notification_kind text;
begin
  if p_actor_id is null or not public.has_permission('bookings.manage', p_actor_id) then
    raise exception using errcode = '42501', message = 'bookings_manage_permission_required';
  end if;
  if p_booking_id is null or p_starts_at is null
     or v_status not in ('pending', 'confirmed', 'completed', 'cancelled', 'no_show') then
    raise exception using errcode = '22023', message = 'booking_update_invalid';
  end if;
  if char_length(v_admin_notes) > 4000
     or regexp_replace(v_admin_notes, E'[\\r\\n\\t]', '', 'g') ~ '[[:cntrl:]]' then
    raise exception using errcode = '22023', message = 'booking_admin_notes_invalid';
  end if;
  if v_meeting_url is not null
     and (char_length(v_meeting_url) > 500 or v_meeting_url !~* '^https://[^[:space:]]+$') then
    raise exception using errcode = '22023', message = 'booking_meeting_url_invalid';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'booking_not_found';
  end if;
  select * into v_service from public.services where id = v_booking.service_id;
  if not found or v_service.duration_minutes not between 15 and 1440 then
    raise exception using errcode = '23514', message = 'booking_service_duration_invalid';
  end if;

  if not (
    (v_booking.status = 'pending' and v_status in ('pending', 'confirmed', 'cancelled'))
    or (v_booking.status = 'confirmed' and v_status in ('confirmed', 'completed', 'cancelled', 'no_show'))
    or (v_booking.status in ('completed', 'cancelled', 'no_show') and v_status = v_booking.status)
  ) then
    raise exception using errcode = '22023', message = 'booking_status_transition_invalid';
  end if;

  v_target_ends := p_starts_at + make_interval(mins => v_service.duration_minutes);
  v_schedule_changed := p_starts_at is distinct from v_booking.starts_at
    or v_target_ends is distinct from v_booking.ends_at;
  v_status_changed := v_status is distinct from v_booking.status;

  if v_schedule_changed then
    if v_booking.status not in ('pending', 'confirmed') or v_status not in ('pending', 'confirmed') then
      raise exception using errcode = '22023', message = 'booking_schedule_change_forbidden';
    end if;
    v_local := p_starts_at at time zone 'Africa/Cairo';
    perform pg_advisory_xact_lock(
      hashtextextended('booking-hold:' || v_booking.service_id::text || ':' || v_local::date::text, 0)
    );
    if not public.booking_slot_is_available(
      v_booking.service_id, v_local::date, v_local::time, v_booking.id, null
    ) then
      raise exception using errcode = '23P01', message = 'booking_slot_unavailable';
    end if;
  end if;

  if not v_schedule_changed
     and not v_status_changed
     and v_meeting_url is not distinct from v_booking.meeting_url
     and v_admin_notes is not distinct from v_booking.admin_notes then
    return jsonb_build_object('outcome', 'existing', 'bookingId', v_booking.id);
  end if;

  update public.bookings
     set starts_at = p_starts_at,
         ends_at = v_target_ends,
         status = v_status,
         meeting_url = v_meeting_url,
         admin_notes = v_admin_notes
   where id = v_booking.id;

  insert into public.booking_events(booking_id, actor_id, event, meta)
  values (
    v_booking.id,
    p_actor_id,
    'admin.booking_updated',
    jsonb_build_object(
      'fromStatus', v_booking.status,
      'toStatus', v_status,
      'fromStartsAt', v_booking.starts_at,
      'toStartsAt', p_starts_at,
      'scheduleChanged', v_schedule_changed,
      'meetingLinkChanged', v_meeting_url is distinct from v_booking.meeting_url,
      'adminNotesChanged', v_admin_notes is distinct from v_booking.admin_notes
    )
  );
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
  values (
    p_actor_id,
    'booking.updated',
    'booking',
    v_booking.id::text,
    jsonb_build_object(
      'fromStatus', v_booking.status,
      'toStatus', v_status,
      'scheduleChanged', v_schedule_changed,
      'meetingLinkChanged', v_meeting_url is distinct from v_booking.meeting_url,
      'adminNotesChanged', v_admin_notes is distinct from v_booking.admin_notes
    )
  );

  if v_status_changed then
    v_notification_title := case v_status
      when 'confirmed' then 'تأكد موعد جلستك'
      when 'completed' then 'اكتملت جلستك — شكرًا لحضورك'
      when 'cancelled' then 'أُلغي موعد جلستك'
      when 'no_show' then 'سُجّل تغيّب عن الجلسة'
      else 'تحدّثت حالة جلستك'
    end;
    v_notification_kind := case when v_status in ('cancelled', 'no_show') then 'warning' else 'success' end;
    insert into public.notifications(user_id, title, body, kind, link, created_by)
    values (v_booking.user_id, v_notification_title, '', v_notification_kind, '/dashboard/bookings', p_actor_id);
  end if;

  return jsonb_build_object(
    'outcome', 'updated',
    'bookingId', v_booking.id,
    'startsAt', p_starts_at,
    'endsAt', v_target_ends,
    'status', v_status
  );
end $$;

create or replace function public.resolve_booking_reschedule_governed(
  p_actor_id uuid,
  p_request_id uuid,
  p_approve boolean,
  p_admin_note text default ''
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.booking_reschedule_requests%rowtype;
  v_booking public.bookings%rowtype;
  v_note text := btrim(coalesce(p_admin_note, ''));
  v_local timestamp;
  v_new_ends timestamptz;
  v_outcome text;
begin
  if p_actor_id is null or not public.has_permission('bookings.manage', p_actor_id) then
    raise exception using errcode = '42501', message = 'bookings_manage_permission_required';
  end if;
  if p_request_id is null or p_approve is null then
    raise exception using errcode = '22023', message = 'reschedule_resolution_invalid';
  end if;
  if char_length(v_note) > 1000
     or regexp_replace(v_note, E'[\\r\\n\\t]', '', 'g') ~ '[[:cntrl:]]' then
    raise exception using errcode = '22023', message = 'reschedule_admin_note_invalid';
  end if;

  select * into v_request
    from public.booking_reschedule_requests
   where id = p_request_id
   for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'reschedule_not_found';
  end if;
  if v_request.status <> 'pending' then
    return jsonb_build_object('outcome', 'existing', 'status', v_request.status, 'bookingId', v_request.booking_id);
  end if;

  select * into v_booking from public.bookings where id = v_request.booking_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'booking_not_found';
  end if;

  if p_approve then
    if v_booking.status not in ('pending', 'confirmed') then
      raise exception using errcode = '22023', message = 'booking_cannot_be_rescheduled';
    end if;
    v_local := v_request.proposed_starts_at at time zone 'Africa/Cairo';
    perform pg_advisory_xact_lock(
      hashtextextended('booking-hold:' || v_booking.service_id::text || ':' || v_local::date::text, 0)
    );
    if not public.booking_slot_is_available(
      v_booking.service_id, v_local::date, v_local::time, v_booking.id, null
    ) then
      raise exception using errcode = '23P01', message = 'proposed_slot_unavailable';
    end if;
    v_new_ends := v_request.proposed_starts_at + (v_booking.ends_at - v_booking.starts_at);
    update public.bookings
       set starts_at = v_request.proposed_starts_at,
           ends_at = v_new_ends,
           admin_notes = concat_ws(E'\n', nullif(v_booking.admin_notes, ''), nullif(v_note, ''))
     where id = v_booking.id;
    update public.booking_reschedule_requests set status = 'approved' where id = v_request.id;
    v_outcome := 'approved';
  else
    update public.bookings
       set admin_notes = concat_ws(E'\n', nullif(v_booking.admin_notes, ''), nullif(v_note, ''))
     where id = v_booking.id;
    update public.booking_reschedule_requests set status = 'declined' where id = v_request.id;
    v_new_ends := v_booking.ends_at;
    v_outcome := 'declined';
  end if;

  insert into public.booking_events(booking_id, actor_id, event, meta)
  values (
    v_booking.id,
    p_actor_id,
    'admin.reschedule_' || v_outcome,
    jsonb_build_object(
      'requestId', v_request.id,
      'fromStartsAt', v_booking.starts_at,
      'toStartsAt', case when p_approve then v_request.proposed_starts_at else v_booking.starts_at end,
      'adminNotePresent', v_note <> ''
    )
  );
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
  values (
    p_actor_id,
    'booking.reschedule_' || v_outcome,
    'booking',
    v_booking.id::text,
    jsonb_build_object(
      'requestId', v_request.id,
      'approved', p_approve,
      'adminNotePresent', v_note <> ''
    )
  );
  insert into public.notifications(user_id, title, body, kind, link, created_by)
  values (
    v_booking.user_id,
    case when p_approve then 'تم اعتماد الموعد الجديد' else 'تعذّر اعتماد الموعد المقترح' end,
    '',
    case when p_approve then 'success' else 'warning' end,
    '/dashboard/bookings',
    p_actor_id
  );

  return jsonb_build_object(
    'outcome', v_outcome,
    'bookingId', v_booking.id,
    'startsAt', case when p_approve then v_request.proposed_starts_at else v_booking.starts_at end,
    'endsAt', v_new_ends
  );
end $$;

create or replace function public.admin_create_availability_window(
  p_actor_id uuid,
  p_service_id uuid,
  p_weekday integer,
  p_start_time time,
  p_end_time time
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_id uuid;
begin
  if p_actor_id is null or not public.has_permission('availability.manage', p_actor_id) then
    raise exception using errcode = '42501', message = 'availability_manage_permission_required';
  end if;
  if p_service_id is null or not exists (select 1 from public.services where id = p_service_id) then
    raise exception using errcode = 'P0002', message = 'availability_service_not_found';
  end if;
  if p_weekday not between 0 and 6 or p_start_time is null or p_end_time is null or p_start_time >= p_end_time then
    raise exception using errcode = '22023', message = 'availability_window_invalid';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('availability:' || p_service_id::text || ':' || p_weekday::text, 0));
  insert into public.availability_rules(service_id, weekday, start_time, end_time, timezone)
  values (p_service_id, p_weekday, p_start_time, p_end_time, 'Africa/Cairo')
  returning id into v_id;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
  values (p_actor_id, 'availability.window_created', 'availability_rule', v_id::text,
    jsonb_build_object('serviceId', p_service_id, 'weekday', p_weekday, 'startTime', p_start_time, 'endTime', p_end_time));
  return v_id;
end $$;

create or replace function public.admin_delete_availability_window(
  p_actor_id uuid,
  p_window_id uuid
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_window public.availability_rules%rowtype;
begin
  if p_actor_id is null or not public.has_permission('availability.manage', p_actor_id) then
    raise exception using errcode = '42501', message = 'availability_manage_permission_required';
  end if;
  select * into v_window from public.availability_rules where id = p_window_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'availability_window_not_found'; end if;
  delete from public.availability_rules where id = v_window.id;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
  values (p_actor_id, 'availability.window_deleted', 'availability_rule', v_window.id::text,
    jsonb_build_object('serviceId', v_window.service_id, 'weekday', v_window.weekday,
      'startTime', v_window.start_time, 'endTime', v_window.end_time));
  return v_window.id;
end $$;

create or replace function public.admin_upsert_availability_exception(
  p_actor_id uuid,
  p_service_id uuid,
  p_date date,
  p_kind text,
  p_start_time time default null,
  p_end_time time default null,
  p_reason text default ''
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kind text := lower(btrim(coalesce(p_kind, '')));
  v_reason text := btrim(coalesce(p_reason, ''));
  v_id uuid;
begin
  if p_actor_id is null or not public.has_permission('availability.manage', p_actor_id) then
    raise exception using errcode = '42501', message = 'availability_manage_permission_required';
  end if;
  if p_service_id is null or not exists (select 1 from public.services where id = p_service_id) then
    raise exception using errcode = 'P0002', message = 'availability_service_not_found';
  end if;
  if p_date is null or v_kind not in ('closed', 'custom', 'holiday', 'blackout')
     or (v_kind = 'custom' and (p_start_time is null or p_end_time is null or p_start_time >= p_end_time))
     or (v_kind <> 'custom' and (p_start_time is not null or p_end_time is not null)) then
    raise exception using errcode = '22023', message = 'availability_exception_invalid';
  end if;
  if char_length(v_reason) > 500
     or regexp_replace(v_reason, E'[\\r\\n\\t]', '', 'g') ~ '[[:cntrl:]]' then
    raise exception using errcode = '22023', message = 'availability_reason_invalid';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('availability:' || p_service_id::text || ':' || p_date::text, 0));
  insert into public.availability_exceptions(service_id, date, is_closed, start_time, end_time, kind, reason)
  values (p_service_id, p_date, v_kind <> 'custom', p_start_time, p_end_time, v_kind, v_reason)
  on conflict (service_id, date) do update
    set is_closed = excluded.is_closed,
        start_time = excluded.start_time,
        end_time = excluded.end_time,
        kind = excluded.kind,
        reason = excluded.reason
  returning id into v_id;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
  values (p_actor_id, 'availability.exception_upserted', 'availability_exception', v_id::text,
    jsonb_build_object('serviceId', p_service_id, 'date', p_date, 'kind', v_kind,
      'reasonPresent', v_reason <> '', 'startTime', p_start_time, 'endTime', p_end_time));
  return v_id;
end $$;

create or replace function public.admin_delete_availability_exception(
  p_actor_id uuid,
  p_exception_id uuid
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_exception public.availability_exceptions%rowtype;
begin
  if p_actor_id is null or not public.has_permission('availability.manage', p_actor_id) then
    raise exception using errcode = '42501', message = 'availability_manage_permission_required';
  end if;
  select * into v_exception from public.availability_exceptions where id = p_exception_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'availability_exception_not_found'; end if;
  delete from public.availability_exceptions where id = v_exception.id;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
  values (p_actor_id, 'availability.exception_deleted', 'availability_exception', v_exception.id::text,
    jsonb_build_object('serviceId', v_exception.service_id, 'date', v_exception.date, 'kind', v_exception.kind));
  return v_exception.id;
end $$;

create or replace function public.admin_upsert_booking_slot_override(
  p_actor_id uuid,
  p_service_id uuid,
  p_date date,
  p_start_time time,
  p_mode text,
  p_reason text default ''
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mode text := lower(btrim(coalesce(p_mode, '')));
  v_reason text := btrim(coalesce(p_reason, ''));
  v_id uuid;
begin
  if p_actor_id is null or not public.has_permission('availability.manage', p_actor_id) then
    raise exception using errcode = '42501', message = 'availability_manage_permission_required';
  end if;
  if p_service_id is null or not exists (select 1 from public.services where id = p_service_id) then
    raise exception using errcode = 'P0002', message = 'availability_service_not_found';
  end if;
  if p_date is null or p_start_time is null or v_mode not in ('open', 'closed') then
    raise exception using errcode = '22023', message = 'booking_slot_override_invalid';
  end if;
  if char_length(v_reason) > 500
     or regexp_replace(v_reason, E'[\\r\\n\\t]', '', 'g') ~ '[[:cntrl:]]' then
    raise exception using errcode = '22023', message = 'availability_reason_invalid';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('availability:' || p_service_id::text || ':' || p_date::text, 0));
  insert into public.booking_slot_overrides(service_id, date, start_time, mode, reason, created_by)
  values (p_service_id, p_date, p_start_time, v_mode, v_reason, p_actor_id)
  on conflict (service_id, date, start_time) do update
    set mode = excluded.mode,
        reason = excluded.reason,
        created_by = excluded.created_by
  returning id into v_id;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
  values (p_actor_id, 'availability.slot_override_upserted', 'booking_slot_override', v_id::text,
    jsonb_build_object('serviceId', p_service_id, 'date', p_date, 'startTime', p_start_time,
      'mode', v_mode, 'reasonPresent', v_reason <> ''));
  return v_id;
end $$;

create or replace function public.admin_delete_booking_slot_override(
  p_actor_id uuid,
  p_override_id uuid
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_override public.booking_slot_overrides%rowtype;
begin
  if p_actor_id is null or not public.has_permission('availability.manage', p_actor_id) then
    raise exception using errcode = '42501', message = 'availability_manage_permission_required';
  end if;
  select * into v_override from public.booking_slot_overrides where id = p_override_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'booking_slot_override_not_found'; end if;
  delete from public.booking_slot_overrides where id = v_override.id;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
  values (p_actor_id, 'availability.slot_override_deleted', 'booking_slot_override', v_override.id::text,
    jsonb_build_object('serviceId', v_override.service_id, 'date', v_override.date,
      'startTime', v_override.start_time, 'mode', v_override.mode));
  return v_override.id;
end $$;

-- Retire the two 044 Admin entry points whose identity came from auth.uid().
-- Customer-facing 044 hold/reschedule-request contracts remain unchanged.
revoke all on function public.admin_update_booking(uuid, timestamptz, timestamptz, text, text, text, text)
  from public, anon, authenticated, service_role;
revoke all on function public.resolve_booking_reschedule(uuid, boolean, text)
  from public, anon, authenticated, service_role;

revoke all on function public.admin_update_booking_governed(uuid, uuid, timestamptz, text, text, text)
  from public, anon, authenticated;
revoke all on function public.resolve_booking_reschedule_governed(uuid, uuid, boolean, text)
  from public, anon, authenticated;
revoke all on function public.admin_create_availability_window(uuid, uuid, integer, time, time)
  from public, anon, authenticated;
revoke all on function public.admin_delete_availability_window(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.admin_upsert_availability_exception(uuid, uuid, date, text, time, time, text)
  from public, anon, authenticated;
revoke all on function public.admin_delete_availability_exception(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.admin_upsert_booking_slot_override(uuid, uuid, date, time, text, text)
  from public, anon, authenticated;
revoke all on function public.admin_delete_booking_slot_override(uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.admin_update_booking_governed(uuid, uuid, timestamptz, text, text, text)
  to service_role;
grant execute on function public.resolve_booking_reschedule_governed(uuid, uuid, boolean, text)
  to service_role;
grant execute on function public.admin_create_availability_window(uuid, uuid, integer, time, time)
  to service_role;
grant execute on function public.admin_delete_availability_window(uuid, uuid)
  to service_role;
grant execute on function public.admin_upsert_availability_exception(uuid, uuid, date, text, time, time, text)
  to service_role;
grant execute on function public.admin_delete_availability_exception(uuid, uuid)
  to service_role;
grant execute on function public.admin_upsert_booking_slot_override(uuid, uuid, date, time, text, text)
  to service_role;
grant execute on function public.admin_delete_booking_slot_override(uuid, uuid)
  to service_role;

comment on function public.admin_update_booking_governed(uuid,uuid,timestamptz,text,text,text) is
  'Service-only atomic Admin booking update. Rechecks explicit bookings.manage actor, preserves customer-authored notes, enforces transitions/availability and writes metadata-only evidence.';
comment on function public.resolve_booking_reschedule_governed(uuid,uuid,boolean,text) is
  'Service-only atomic reschedule resolution with explicit actor, row/advisory locks, customer notification and content-free evidence.';
comment on function public.admin_create_availability_window(uuid,uuid,integer,time,time) is
  'Service-only availability window creation with explicit actor and atomic audit.';
comment on function public.admin_upsert_availability_exception(uuid,uuid,date,text,time,time,text) is
  'Service-only availability exception upsert with bounded private reason and content-free audit.';
comment on function public.admin_upsert_booking_slot_override(uuid,uuid,date,time,text,text) is
  'Service-only slot override upsert with bounded private reason and content-free audit.';

-- Rollback-by-forward-fix: preserve bookings, availability, events,
-- notifications and audit history. Replace these RPCs in a later migration;
-- never restore browser-direct writes or the auth.uid()-based Admin contracts.
