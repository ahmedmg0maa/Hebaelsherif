-- 069: governed customer cancellation and reschedule requests.
-- LOCAL ONLY. Apply after 068 on authorized Staging with a verified recovery
-- point and schema fingerprint. Never apply to Production from this workspace.

drop policy if exists "reschedules: own insert" on public.booking_reschedule_requests;
drop policy if exists "reschedules: permitted update" on public.booking_reschedule_requests;
drop policy if exists "booking_events: permitted insert" on public.booking_events;

revoke insert, update, delete on table public.booking_reschedule_requests from anon, authenticated;
revoke insert, update, delete on table public.booking_events from anon, authenticated;

-- Retire the auth.uid()-derived entry points after the application moves to the
-- explicit-actor, service-only contracts below.
revoke all on function public.cancel_my_booking(uuid,text)
  from public, anon, authenticated, service_role;
revoke all on function public.request_booking_reschedule(uuid,timestamptz,text)
  from public, anon, authenticated, service_role;

create or replace function public.cancel_customer_booking_governed(
  p_actor_id uuid,
  p_booking_id uuid,
  p_reason text default ''
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings%rowtype;
  v_policy jsonb;
  v_reason text := btrim(coalesce(p_reason, ''));
  v_order_cancelled boolean := false;
  v_credit_restored boolean := false;
begin
  if p_actor_id is null or p_booking_id is null then
    raise exception using errcode = '22023', message = 'customer_booking_cancel_invalid';
  end if;
  if char_length(v_reason) > 1000
     or regexp_replace(v_reason, E'[\r\n\t]', '', 'g') ~ '[[:cntrl:]]' then
    raise exception using errcode = '22023', message = 'customer_booking_reason_invalid';
  end if;

  select * into v_booking
    from public.bookings
   where id = p_booking_id and user_id = p_actor_id
   for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'booking_not_found';
  end if;
  if v_booking.status = 'cancelled' then
    select exists(
      select 1 from public.subscription_credit_ledger
       where booking_id = v_booking.id and operation = 'reverse'
    ) into v_credit_restored;
    return jsonb_build_object('outcome', 'existing', 'creditRestored', v_credit_restored);
  end if;
  if v_booking.status not in ('pending', 'confirmed') then
    raise exception using errcode = '22023', message = 'booking_cannot_be_cancelled';
  end if;

  v_policy := public.booking_service_policy(v_booking.service_id);
  if v_policy is null then
    raise exception using errcode = 'P0002', message = 'booking_service_policy_not_found';
  end if;
  if v_booking.starts_at < now() + make_interval(hours => (v_policy->>'cancellation_notice_hours')::integer) then
    raise exception using errcode = '22023', message = 'cancellation_notice_required';
  end if;

  update public.bookings
     set status = 'cancelled',
         customer_notes = concat_ws(E'\n', nullif(v_booking.customer_notes, ''), nullif(v_reason, ''))
   where id = v_booking.id;
  if v_booking.order_id is not null then
    update public.orders set status = 'cancelled'
     where id = v_booking.order_id and status = 'pending_payment';
    v_order_cancelled := found;
  end if;
  select exists(
    select 1 from public.subscription_credit_ledger
     where booking_id = v_booking.id and operation = 'reverse'
  ) into v_credit_restored;

  insert into public.booking_events(booking_id, actor_id, event, meta)
  values (
    v_booking.id,
    p_actor_id,
    'customer.cancelled',
    jsonb_build_object(
      'reasonPresent', v_reason <> '',
      'reasonLength', char_length(v_reason),
      'orderCancelled', v_order_cancelled,
      'creditRestored', v_credit_restored
    )
  );
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
  values (
    p_actor_id,
    'booking.customer_cancelled',
    'booking',
    v_booking.id::text,
    jsonb_build_object(
      'reasonPresent', v_reason <> '',
      'reasonLength', char_length(v_reason),
      'orderCancelled', v_order_cancelled,
      'creditRestored', v_credit_restored
    )
  );
  return jsonb_build_object(
    'outcome', 'cancelled',
    'orderCancelled', v_order_cancelled,
    'creditRestored', v_credit_restored
  );
end $$;

create or replace function public.request_customer_booking_reschedule_governed(
  p_actor_id uuid,
  p_booking_id uuid,
  p_proposed_starts_at timestamptz,
  p_reason text default ''
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings%rowtype;
  v_existing public.booking_reschedule_requests%rowtype;
  v_policy jsonb;
  v_reason text := btrim(coalesce(p_reason, ''));
  v_local timestamp;
  v_id uuid;
begin
  if p_actor_id is null or p_booking_id is null or p_proposed_starts_at is null then
    raise exception using errcode = '22023', message = 'customer_reschedule_input_invalid';
  end if;
  if char_length(v_reason) > 1000
     or regexp_replace(v_reason, E'[\r\n\t]', '', 'g') ~ '[[:cntrl:]]' then
    raise exception using errcode = '22023', message = 'customer_booking_reason_invalid';
  end if;

  select * into v_booking
    from public.bookings
   where id = p_booking_id and user_id = p_actor_id
   for update;
  if not found or v_booking.status not in ('pending', 'confirmed') then
    raise exception using errcode = '22023', message = 'booking_cannot_be_rescheduled';
  end if;
  v_policy := public.booking_service_policy(v_booking.service_id);
  if v_policy is null then
    raise exception using errcode = 'P0002', message = 'booking_service_policy_not_found';
  end if;
  if v_booking.starts_at < now() + make_interval(hours => (v_policy->>'reschedule_notice_hours')::integer) then
    raise exception using errcode = '22023', message = 'reschedule_notice_required';
  end if;
  if p_proposed_starts_at = v_booking.starts_at then
    raise exception using errcode = '22023', message = 'reschedule_time_unchanged';
  end if;
  if (
    select count(*) from public.booking_reschedule_requests
     where booking_id = v_booking.id and status = 'approved'
  ) >= (v_policy->>'max_reschedules')::integer then
    raise exception using errcode = '22023', message = 'reschedule_limit_reached';
  end if;

  select * into v_existing
    from public.booking_reschedule_requests
   where booking_id = v_booking.id and status = 'pending'
   order by created_at desc
   limit 1;
  if found then
    if v_existing.requested_by = p_actor_id
       and v_existing.proposed_starts_at = p_proposed_starts_at
       and v_existing.reason = v_reason then
      return jsonb_build_object('outcome', 'existing', 'requestId', v_existing.id);
    end if;
    raise exception using errcode = '23505', message = 'reschedule_already_pending';
  end if;

  v_local := p_proposed_starts_at at time zone 'Africa/Cairo';
  perform pg_advisory_xact_lock(
    hashtextextended('booking-hold:' || v_booking.service_id::text || ':' || v_local::date::text, 0)
  );
  if not public.booking_slot_is_available(
    v_booking.service_id, v_local::date, v_local::time, v_booking.id, null
  ) then
    raise exception using errcode = '23P01', message = 'proposed_slot_unavailable';
  end if;

  insert into public.booking_reschedule_requests(booking_id, requested_by, proposed_starts_at, reason)
  values (v_booking.id, p_actor_id, p_proposed_starts_at, v_reason)
  returning id into v_id;
  insert into public.booking_events(booking_id, actor_id, event, meta)
  values (
    v_booking.id,
    p_actor_id,
    'customer.reschedule_requested',
    jsonb_build_object(
      'requestId', v_id,
      'proposedStartsAt', p_proposed_starts_at,
      'reasonPresent', v_reason <> '',
      'reasonLength', char_length(v_reason)
    )
  );
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
  values (
    p_actor_id,
    'booking.customer_reschedule_requested',
    'booking',
    v_booking.id::text,
    jsonb_build_object(
      'requestId', v_id,
      'proposedStartsAt', p_proposed_starts_at,
      'reasonPresent', v_reason <> '',
      'reasonLength', char_length(v_reason)
    )
  );
  return jsonb_build_object('outcome', 'requested', 'requestId', v_id);
end $$;

revoke all on function public.cancel_customer_booking_governed(uuid,uuid,text)
  from public, anon, authenticated;
revoke all on function public.request_customer_booking_reschedule_governed(uuid,uuid,timestamptz,text)
  from public, anon, authenticated;
grant execute on function public.cancel_customer_booking_governed(uuid,uuid,text) to service_role;
grant execute on function public.request_customer_booking_reschedule_governed(uuid,uuid,timestamptz,text) to service_role;

comment on function public.cancel_customer_booking_governed(uuid,uuid,text) is
  'Service-only customer-owned cancellation with current policy, row lock, package-credit/order effects and content-free atomic evidence.';
comment on function public.request_customer_booking_reschedule_governed(uuid,uuid,timestamptz,text) is
  'Service-only customer-owned, slot-validated and idempotent reschedule request with bounded private reason and content-free atomic evidence.';

-- Rollback-by-forward-fix: preserve booking, credit, request and audit history.
-- Replace these RPCs later; never restore browser-direct mutation privileges.
