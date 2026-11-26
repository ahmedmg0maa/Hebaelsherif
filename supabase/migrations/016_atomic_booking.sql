-- 016: create a booking + order atomically under one authenticated transaction.
-- The function re-validates every business rule and never trusts browser pricing.

create unique index if not exists availability_exceptions_service_date_unique
  on public.availability_exceptions (service_id, date);

create or replace function public.create_booking_order(
  p_service_id uuid,
  p_date date,
  p_time time,
  p_full_name text,
  p_phone text,
  p_notes text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_service record;
  v_start timestamptz;
  v_end timestamptz;
  v_minutes int;
  v_has_rules boolean;
  v_allowed boolean;
  v_exception record;
  v_offer_id uuid;
  v_offer_kind text;
  v_offer_value numeric(10,2);
  v_list_price numeric(10,2);
  v_total numeric(10,2);
  v_discount numeric(10,2) := 0;
  v_expiry_hours int := 72;
  v_expires_at timestamptz;
  v_order_id uuid;
  v_booking_id uuid;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_full_name, ''))) < 2 then
    raise exception 'INVALID_NAME' using errcode = '22023';
  end if;
  if trim(coalesce(p_phone, '')) !~ '^\+?[0-9[:space:]-]{8,18}$' then
    raise exception 'INVALID_PHONE' using errcode = '22023';
  end if;

  select s.id, s.product_id, s.duration_minutes, s.price, s.is_active,
         p.type as product_type, p.currency, p.is_published
    into v_service
    from public.services s
    join public.products p on p.id = s.product_id
   where s.id = p_service_id;

  if v_service.id is null or not v_service.is_active or not v_service.is_published then
    raise exception 'SERVICE_UNAVAILABLE' using errcode = '22023';
  end if;

  if p_date < (now() at time zone 'Africa/Cairo')::date
     or p_date > (now() at time zone 'Africa/Cairo')::date + 30 then
    raise exception 'DATE_OUT_OF_RANGE' using errcode = '22023';
  end if;

  v_start := make_timestamptz(
    extract(year from p_date)::int,
    extract(month from p_date)::int,
    extract(day from p_date)::int,
    extract(hour from p_time)::int,
    extract(minute from p_time)::int,
    0,
    'Africa/Cairo'
  );
  v_end := v_start + make_interval(mins => v_service.duration_minutes);
  if v_start < now() + interval '30 minutes' then
    raise exception 'TIME_IN_PAST' using errcode = '22023';
  end if;

  -- Serialize reservations for one service/day before checking overlap.
  perform pg_advisory_xact_lock(hashtextextended(v_service.id::text || ':' || p_date::text, 0));

  select exists (
    select 1 from public.availability_rules where service_id = v_service.id
  ) into v_has_rules;

  if v_has_rules then
    select exists (
      select 1
        from public.availability_rules r
       where r.service_id = v_service.id
         and r.weekday = extract(dow from p_date)::int
         and p_time >= r.start_time
         and p_time + make_interval(mins => v_service.duration_minutes) <= r.end_time
    ) into v_allowed;
  else
    v_minutes := extract(hour from p_time)::int * 60 + extract(minute from p_time)::int;
    v_allowed := extract(dow from p_date)::int <> 5
      and v_minutes >= 600
      and v_minutes + v_service.duration_minutes <= 1200;
  end if;
  if not v_allowed then
    raise exception 'OUTSIDE_AVAILABILITY' using errcode = '22023';
  end if;

  select is_closed, start_time, end_time
    into v_exception
    from public.availability_exceptions
   where service_id = v_service.id and date = p_date
   limit 1;
  if found and (
    v_exception.is_closed
    or (v_exception.start_time is not null and p_time < v_exception.start_time)
    or (v_exception.end_time is not null and p_time + make_interval(mins => v_service.duration_minutes) > v_exception.end_time)
  ) then
    raise exception 'DAY_CLOSED' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.bookings b
     where b.service_id = v_service.id
       and b.status in ('pending', 'confirmed')
       and tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(v_start, v_end, '[)')
  ) then
    raise exception 'SLOT_TAKEN' using errcode = '23P01';
  end if;

  v_list_price := v_service.price;
  select o.id, o.discount_kind, o.discount_value
    into v_offer_id, v_offer_kind, v_offer_value
    from public.offers o
   where o.is_active
     and o.starts_at <= now()
     and (o.ends_at is null or o.ends_at > now())
     and o.discount_kind is not null
     and o.discount_value is not null
     and (
       not exists (select 1 from public.offer_targets ot where ot.offer_id = o.id)
       or exists (
         select 1 from public.offer_targets ot
          where ot.offer_id = o.id
            and (ot.product_id = v_service.product_id or ot.product_type = v_service.product_type)
       )
     )
   order by case
     when o.discount_kind = 'percent' then v_list_price * o.discount_value / 100
     else o.discount_value
   end desc
   limit 1;

  if v_offer_id is not null then
    v_discount := least(v_list_price, case
      when v_offer_kind = 'percent' then round(v_list_price * v_offer_value / 100, 2)
      else v_offer_value
    end);
  end if;
  v_total := greatest(0, v_list_price - v_discount);

  select coalesce((value->>'hours')::int, 72)
    into v_expiry_hours
    from public.site_settings
   where key = 'order_expiry_hours';
  v_expiry_hours := coalesce(v_expiry_hours, 72);
  v_expires_at := now() + make_interval(hours => v_expiry_hours);

  update public.profiles
     set full_name = trim(p_full_name), phone = trim(p_phone)
   where id = v_user_id;

  insert into public.orders (
    user_id, status, subtotal, discount, total, currency, offer_id, expires_at
  ) values (
    v_user_id, 'pending_payment', v_list_price, v_discount, v_total,
    v_service.currency, v_offer_id, v_expires_at
  ) returning id into v_order_id;

  insert into public.order_items (order_id, product_id, quantity, unit_price, total)
  values (v_order_id, v_service.product_id, 1, v_total, v_total);

  insert into public.bookings (
    user_id, service_id, order_id, starts_at, ends_at, status, customer_notes
  ) values (
    v_user_id, v_service.id, v_order_id, v_start, v_end, 'pending', nullif(trim(coalesce(p_notes, '')), '')
  ) returning id into v_booking_id;

  insert into public.booking_events (booking_id, actor_id, event, meta)
  values (v_booking_id, v_user_id, 'booking.created', jsonb_build_object('order_id', v_order_id));
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, meta)
  values (v_user_id, 'booking.created', 'booking', v_booking_id::text,
          jsonb_build_object('order_id', v_order_id, 'starts_at', v_start));

  return jsonb_build_object(
    'bookingId', v_booking_id,
    'orderId', v_order_id,
    'total', v_total,
    'expiresAt', v_expires_at
  );
exception
  when exclusion_violation then
    raise exception 'SLOT_TAKEN' using errcode = '23P01';
end;
$$;

revoke all on function public.create_booking_order(uuid, date, time, text, text, text) from public;
grant execute on function public.create_booking_order(uuid, date, time, text, text, text) to authenticated;
