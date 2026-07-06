create or replace function public.validate_coupon(input_code text, input_amount numeric, input_scope text default 'all')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_coupon public.coupons%rowtype;
  calculated_discount numeric := 0;
begin
  if input_code is null or btrim(input_code) = '' then
    return jsonb_build_object('valid', false, 'appliedCode', '', 'discountAmount', 0, 'couponId', null);
  end if;

  select * into selected_coupon
  from public.coupons
  where upper(code) = upper(btrim(input_code))
    and is_active = true
    and (starts_at is null or starts_at <= now())
    and (expires_at is null or expires_at >= now())
    and (scope = 'all' or scope = input_scope)
    and min_amount <= input_amount
    and (usage_limit is null or usage_count < usage_limit)
  limit 1;

  if not found then
    return jsonb_build_object('valid', false, 'appliedCode', '', 'discountAmount', 0, 'couponId', null);
  end if;

  if selected_coupon.type = 'percentage' then
    calculated_discount := round((input_amount * selected_coupon.value / 100)::numeric, 2);
  else
    calculated_discount := selected_coupon.value;
  end if;

  calculated_discount := greatest(0, least(calculated_discount, input_amount));

  return jsonb_build_object(
    'valid', calculated_discount > 0,
    'appliedCode', selected_coupon.code,
    'discountAmount', calculated_discount,
    'couponId', selected_coupon.id
  );
end;
$$;

create or replace function public.create_booking_with_lock(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  auth_user uuid := auth.uid();
  requested_date date := (payload->>'date')::date;
  requested_start time := (payload->>'time')::time;
  requested_duration int := (payload->>'duration')::int;
  requested_end time;
  requested_start_at timestamptz;
  requested_end_at timestamptz;
  original_amount numeric := (payload->>'originalAmount')::numeric;
  discount_amount numeric := coalesce((payload->>'discountAmount')::numeric, 0);
  final_amount numeric := (payload->>'finalAmount')::numeric;
  coupon_uuid uuid := nullif(payload->>'couponId', '')::uuid;
  new_booking_id uuid;
  lock_key bigint;
begin
  if auth_user is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  if requested_date < ((now() at time zone 'Africa/Cairo')::date + 1) then
    raise exception 'BOOKING_DATE_TOO_SOON';
  end if;

  if requested_date > ((now() at time zone 'Africa/Cairo')::date + 30) then
    raise exception 'BOOKING_DATE_TOO_FAR';
  end if;

  if extract(dow from requested_date) = 5 then
    raise exception 'FRIDAY_BLOCKED';
  end if;

  if requested_duration not in (60, 90) then
    raise exception 'INVALID_DURATION';
  end if;

  requested_end := requested_start + make_interval(mins => requested_duration);
  requested_start_at := (requested_date::text || ' ' || requested_start::text || ' Africa/Cairo')::timestamptz;
  requested_end_at := (requested_date::text || ' ' || requested_end::text || ' Africa/Cairo')::timestamptz;

  lock_key := hashtext(requested_date::text || ':' || requested_start::text);
  perform pg_advisory_xact_lock(lock_key);

  insert into public.bookings (
    user_id, service_id, customer_name, customer_email, customer_phone,
    date, start_time, end_time, start_at, end_at, duration_minutes, timezone,
    status, payment_status, payment_method,
    original_amount, discount_amount, final_amount, coupon_id, notes
  ) values (
    auth_user,
    nullif(payload->>'serviceId', '')::uuid,
    payload->>'name',
    payload->>'email',
    payload->>'phone',
    requested_date,
    requested_start,
    requested_end,
    requested_start_at,
    requested_end_at,
    requested_duration,
    'Africa/Cairo',
    'payment_submitted',
    'submitted',
    (payload->>'paymentMethod')::public.payment_method,
    original_amount,
    discount_amount,
    final_amount,
    coupon_uuid,
    nullif(payload->>'notes', '')
  ) returning id into new_booking_id;

  insert into public.booking_events (booking_id, actor_id, event_type, new_status, payload)
  values (new_booking_id, auth_user, 'created', 'payment_submitted', payload);

  if coupon_uuid is not null and discount_amount > 0 then
    update public.coupons set usage_count = usage_count + 1 where id = coupon_uuid;
    insert into public.coupon_redemptions (coupon_id, user_id, booking_id, amount_discounted)
    values (coupon_uuid, auth_user, new_booking_id, discount_amount);
  end if;

  insert into public.notifications (user_id, audience, type, title, body, href)
  values (auth_user, 'user', 'booking_created', 'تم استلام طلب الحجز', 'سنراجع بيانات الدفع ونؤكد الموعد قريبًا.', '/dashboard/sessions');

  return jsonb_build_object('bookingId', new_booking_id, 'status', 'payment_submitted');
exception
  when exclusion_violation then
    raise exception 'BOOKING_SLOT_CONFLICT';
end;
$$;
