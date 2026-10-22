-- 063: explicit checkout idempotency and inspected direct payment-proof upload.
-- LOCAL ONLY. Apply after 062 on authorized Staging with a verified recovery
-- point and schema fingerprint. Never apply to Production from this workspace.

alter table public.orders
  add column if not exists checkout_request_id uuid,
  add column if not exists requested_payment_method text;

alter table public.orders drop constraint if exists orders_requested_payment_method_check;
alter table public.orders add constraint orders_requested_payment_method_check
  check (requested_payment_method is null or requested_payment_method in ('instapay','wallet','bank_transfer'));

create unique index if not exists orders_user_checkout_request_uidx
  on public.orders(user_id, checkout_request_id)
  where checkout_request_id is not null;

create unique index if not exists payments_one_pending_per_order_uidx
  on public.payments(order_id)
  where status = 'pending';

create unique index if not exists payment_proofs_storage_path_uidx
  on public.payment_proofs(storage_path);

create table if not exists public.payment_proof_upload_intents (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete set null,
  method text not null check (method in ('instapay','wallet','bank_transfer')),
  storage_path text not null unique,
  declared_mime text not null check (declared_mime in ('image/png','image/jpeg','image/webp')),
  declared_size bigint not null check (declared_size between 1 and 5242880),
  status text not null default 'issued' check (status in ('issued','finalized','superseded','rejected','expired')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, request_id)
);

create index if not exists payment_proof_upload_intents_expiry_idx
  on public.payment_proof_upload_intents(status, expires_at)
  where status = 'issued';

drop trigger if exists payment_proof_upload_intents_updated on public.payment_proof_upload_intents;
create trigger payment_proof_upload_intents_updated
  before update on public.payment_proof_upload_intents
  for each row execute function public.set_updated_at();

alter table public.payment_proof_upload_intents enable row level security;
revoke all on table public.payment_proof_upload_intents from anon, authenticated;

create or replace function public.consume_action_rate_limit(
  p_scope text,
  p_max_hits integer,
  p_window_seconds integer
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_window_start timestamptz;
  v_hits integer;
  v_retry_after integer;
begin
  if v_user_id is null then raise exception using errcode = '42501', message = 'auth_required'; end if;
  if p_scope not in ('coupon','payment_proof','checkout')
     or p_max_hits < 1 or p_max_hits > 100
     or p_window_seconds < 10 or p_window_seconds > 86400 then
    raise exception using errcode = '22023', message = 'invalid_rate_limit';
  end if;
  v_window_start := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds
  );
  insert into public.action_rate_limits(user_id, scope, window_started_at, hits)
  values (v_user_id, p_scope, v_window_start, 1)
  on conflict(user_id, scope, window_started_at)
  do update set hits = public.action_rate_limits.hits + 1, updated_at = now()
  returning hits into v_hits;
  v_retry_after := greatest(
    1,
    ceil(extract(epoch from (v_window_start + make_interval(secs => p_window_seconds) - clock_timestamp())))::integer
  );
  delete from public.action_rate_limits where updated_at < now() - interval '2 days';
  return jsonb_build_object(
    'allowed', v_hits <= p_max_hits,
    'retryAfterSec', case when v_hits <= p_max_hits then 0 else v_retry_after end
  );
end $$;

revoke all on function public.consume_action_rate_limit(text,integer,integer) from public, anon;
grant execute on function public.consume_action_rate_limit(text,integer,integer) to authenticated;

create or replace function public.checkout_product_ready(p_product_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_product public.products%rowtype;
begin
  select * into v_product from public.products where id = p_product_id;
  if not found or not v_product.is_published then return false; end if;

  if v_product.type = 'course' then
    return exists(select 1 from public.courses item where item.product_id = v_product.id and item.is_published);
  elsif v_product.type = 'book' then
    return exists(select 1 from public.books item where item.product_id = v_product.id and item.is_published);
  elsif v_product.type = 'workshop' then
    return exists(
      select 1 from public.workshops item
       where item.product_id = v_product.id and item.is_published
         and item.ends_at > now() and item.seats_total > item.seats_reserved
    );
  elsif v_product.type = 'session' then
    return exists(
      select 1 from public.services item
       where item.product_id = v_product.id and item.is_active
         and exists(select 1 from public.availability_rules availability where availability.service_id = item.id)
    );
  elsif v_product.type in ('bundle','vip','free_resource') then
    return public.program_product_ready(v_product.id);
  end if;
  return false;
end $$;

create or replace function public.calculate_checkout_quote(
  p_actor_id uuid,
  p_product_id uuid,
  p_variant_id uuid,
  p_coupon_code text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product public.products%rowtype;
  v_variant public.product_variants%rowtype;
  v_offer public.offers%rowtype;
  v_coupon public.coupons%rowtype;
  v_code text := upper(btrim(coalesce(p_coupon_code, '')));
  v_list numeric(10,2);
  v_offer_discount numeric(10,2) := 0;
  v_coupon_discount numeric(10,2) := 0;
  v_after_offer numeric(10,2);
  v_total numeric(10,2);
begin
  if p_actor_id is null or not exists(select 1 from auth.users where id = p_actor_id) then
    raise exception using errcode = '42501', message = 'auth_required';
  end if;
  if not public.checkout_product_ready(p_product_id) then
    raise exception using errcode = 'P0002', message = 'product_unavailable';
  end if;
  select * into v_product from public.products where id = p_product_id and is_published for share;
  if not found then raise exception using errcode = 'P0002', message = 'product_unavailable'; end if;

  v_list := v_product.price;
  if p_variant_id is not null then
    select * into v_variant
      from public.product_variants
     where id = p_variant_id and product_id = p_product_id and is_active
     for share;
    if not found then raise exception using errcode = 'P0002', message = 'variant_unavailable'; end if;
    v_list := v_variant.price;
  end if;

  select offer.* into v_offer
    from public.offers offer
   where offer.is_active and offer.starts_at <= now()
     and (offer.ends_at is null or offer.ends_at > now())
     and offer.discount_kind is not null and offer.discount_value is not null
     and (
       not exists(select 1 from public.offer_targets target where target.offer_id = offer.id)
       or exists(
         select 1 from public.offer_targets target
          where target.offer_id = offer.id
            and (target.product_id = v_product.id or target.product_type = v_product.type)
       )
     )
   order by case when offer.discount_kind = 'percent' then v_list * offer.discount_value / 100 else offer.discount_value end desc,
            offer.id
   limit 1;
  if found then
    v_offer_discount := least(v_list, case when v_offer.discount_kind = 'percent'
      then round(v_list * v_offer.discount_value / 100, 2) else v_offer.discount_value end);
  end if;
  v_after_offer := greatest(0, v_list - v_offer_discount);

  if v_code <> '' then
    select * into v_coupon
      from public.coupons
     where code = v_code and is_active
       and (starts_at is null or starts_at <= now())
       and (ends_at is null or ends_at > now())
     for share;
    if not found then raise exception using errcode = '22023', message = 'coupon_invalid'; end if;
    if v_offer.id is not null and not v_coupon.allow_with_offers then
      raise exception using errcode = '22023', message = 'coupon_stacking_not_allowed';
    end if;
    if exists(select 1 from public.coupon_targets where coupon_id = v_coupon.id)
       and not exists(
         select 1 from public.coupon_targets
          where coupon_id = v_coupon.id
            and (product_id = v_product.id or product_type = v_product.type)
       ) then
      raise exception using errcode = '22023', message = 'coupon_scope_mismatch';
    end if;
    if v_coupon.max_uses is not null
       and (select count(*) from public.coupon_redemptions where coupon_id = v_coupon.id) >= v_coupon.max_uses then
      raise exception using errcode = '22023', message = 'coupon_exhausted';
    end if;
    if (select count(*) from public.coupon_redemptions where coupon_id = v_coupon.id and user_id = p_actor_id) >= v_coupon.max_uses_per_user then
      raise exception using errcode = '22023', message = 'coupon_user_limit';
    end if;
    v_coupon_discount := least(v_after_offer, case when v_coupon.kind = 'percent'
      then round(v_after_offer * v_coupon.value / 100, 2) else v_coupon.value end);
  end if;
  v_total := greatest(0, v_after_offer - v_coupon_discount);

  return jsonb_build_object(
    'productId', v_product.id,
    'variantId', p_variant_id,
    'currency', v_product.currency,
    'listPrice', v_list,
    'offerId', v_offer.id,
    'offerDiscount', v_offer_discount,
    'couponId', v_coupon.id,
    'couponCode', nullif(v_code, ''),
    'couponDiscount', v_coupon_discount,
    'total', v_total
  );
end $$;

create or replace function public.create_product_order_v3(
  p_actor_id uuid,
  p_product_id uuid,
  p_variant_id uuid,
  p_coupon_code text,
  p_method text,
  p_request_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quote jsonb;
  v_existing public.orders%rowtype;
  v_existing_product uuid;
  v_existing_variant uuid;
  v_order_id uuid;
  v_expiry_hours integer := 72;
  v_expiry timestamptz;
  v_total numeric(10,2);
begin
  if p_actor_id is null or p_request_id is null
     or not exists(select 1 from auth.users where id = p_actor_id) then
    raise exception using errcode = '42501', message = 'auth_required';
  end if;
  if p_method not in ('instapay','wallet','bank_transfer') then
    raise exception using errcode = '22023', message = 'invalid_payment_method';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('checkout-v3:' || p_actor_id::text || ':' || p_request_id::text, 0));
  select * into v_existing
    from public.orders order_row
   where order_row.user_id = p_actor_id and order_row.checkout_request_id = p_request_id
   for update;
  if found then
    select item.product_id, item.variant_id
      into v_existing_product, v_existing_variant
      from public.order_items item
     where item.order_id = v_existing.id
     limit 1;
    if not found then raise exception using errcode = '23514', message = 'checkout_order_item_missing'; end if;
    if v_existing_product <> p_product_id
       or v_existing_variant is distinct from p_variant_id
       or v_existing.requested_payment_method is distinct from p_method then
      raise exception using errcode = '23505', message = 'checkout_idempotency_conflict';
    end if;
    return jsonb_build_object(
      'outcome', 'existing', 'order_id', v_existing.id, 'total', v_existing.total,
      'expires_at', v_existing.expires_at, 'status', v_existing.status
    );
  end if;

  v_quote := public.calculate_checkout_quote(p_actor_id, p_product_id, p_variant_id, p_coupon_code);
  v_total := (v_quote->>'total')::numeric;
  if v_total > 0 and not public.payment_method_is_configured(p_method) then
    raise exception using errcode = '22023', message = 'invalid_payment_method';
  end if;
  select coalesce((value->>'hours')::integer, 72) into v_expiry_hours
    from public.site_settings where key = 'order_expiry_hours';
  v_expiry := now() + make_interval(hours => coalesce(v_expiry_hours, 72));

  insert into public.orders(
    user_id, status, subtotal, discount, total, currency, coupon_id, offer_id,
    expires_at, checkout_request_id, requested_payment_method
  ) values (
    p_actor_id, 'pending_payment', (v_quote->>'listPrice')::numeric,
    (v_quote->>'offerDiscount')::numeric + (v_quote->>'couponDiscount')::numeric,
    v_total, v_quote->>'currency', nullif(v_quote->>'couponId','')::uuid,
    nullif(v_quote->>'offerId','')::uuid, v_expiry, p_request_id, p_method
  ) returning id into v_order_id;
  insert into public.order_items(order_id, product_id, variant_id, quantity, unit_price, total)
  values (
    v_order_id, p_product_id, p_variant_id, 1,
    (v_quote->>'listPrice')::numeric - (v_quote->>'offerDiscount')::numeric,
    v_total
  );
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
  values (
    p_actor_id, 'order.created', 'order', v_order_id::text,
    jsonb_build_object(
      'productId', p_product_id, 'variantPresent', p_variant_id is not null,
      'method', p_method, 'total', v_total, 'couponPresent', (v_quote->>'couponId') is not null,
      'requestId', p_request_id
    )
  );
  return jsonb_build_object(
    'outcome', 'created', 'order_id', v_order_id, 'total', v_total,
    'expires_at', v_expiry, 'status', (select status from public.orders where id = v_order_id)
  );
end $$;

create or replace function public.begin_payment_proof_upload_intent(
  p_actor_id uuid,
  p_order_id uuid,
  p_method text,
  p_declared_mime text,
  p_declared_size bigint,
  p_request_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_intent public.payment_proof_upload_intents%rowtype;
  v_extension text;
begin
  if p_actor_id is null or p_request_id is null
     or not exists(select 1 from auth.users where id = p_actor_id) then
    raise exception using errcode = '42501', message = 'auth_required';
  end if;
  if p_method not in ('instapay','wallet','bank_transfer')
     or p_declared_mime not in ('image/png','image/jpeg','image/webp')
     or p_declared_size not between 1 and 5242880 then
    raise exception using errcode = '22023', message = 'invalid_proof';
  end if;
  v_extension := case p_declared_mime when 'image/png' then 'png' when 'image/webp' then 'webp' else 'jpg' end;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.user_id <> p_actor_id then
    raise exception using errcode = 'P0002', message = 'order_not_found';
  end if;
  if v_order.status <> 'pending_payment' then
    raise exception using errcode = 'P0001', message = 'order_not_pending';
  end if;
  if v_order.expires_at is not null and v_order.expires_at <= now() then
    raise exception using errcode = '22023', message = 'order_expired';
  end if;
  if v_order.total <= 0 then raise exception using errcode = '22023', message = 'proof_not_required'; end if;
  if not public.payment_method_is_configured(p_method)
     or (v_order.requested_payment_method is not null and v_order.requested_payment_method <> p_method) then
    raise exception using errcode = '22023', message = 'invalid_payment_method';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('payment-proof-intent:' || p_actor_id::text || ':' || p_request_id::text, 0));
  select * into v_intent
    from public.payment_proof_upload_intents
   where user_id = p_actor_id and request_id = p_request_id
   for update;
  if found then
    if v_intent.order_id <> p_order_id or v_intent.method <> p_method
       or v_intent.declared_mime <> p_declared_mime or v_intent.declared_size <> p_declared_size then
      raise exception using errcode = '23505', message = 'payment_proof_intent_conflict';
    end if;
    if v_intent.status <> 'issued' or v_intent.expires_at <= now() then
      raise exception using errcode = '55000', message = 'payment_proof_intent_unavailable';
    end if;
    return jsonb_build_object(
      'outcome', 'existing', 'intentId', v_intent.id, 'storagePath', v_intent.storage_path,
      'expiresAt', v_intent.expires_at
    );
  end if;

  insert into public.payment_proof_upload_intents(
    request_id, user_id, order_id, method, storage_path, declared_mime, declared_size, expires_at
  ) values (
    p_request_id, p_actor_id, p_order_id, p_method,
    p_actor_id::text || '/' || p_order_id::text || '/' || p_request_id::text || '.' || v_extension,
    p_declared_mime, p_declared_size, now() + interval '10 minutes'
  ) returning * into v_intent;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
  values (
    p_actor_id, 'payment.proof_upload_issued', 'order', p_order_id::text,
    jsonb_build_object('intentId', v_intent.id, 'method', p_method, 'declaredMime', p_declared_mime, 'declaredSize', p_declared_size)
  );
  return jsonb_build_object(
    'outcome', 'issued', 'intentId', v_intent.id, 'storagePath', v_intent.storage_path,
    'expiresAt', v_intent.expires_at
  );
end $$;

create or replace function public.authorize_payment_proof_upload_finalization(
  p_actor_id uuid,
  p_intent_id uuid,
  p_storage_path text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_intent public.payment_proof_upload_intents%rowtype;
begin
  select * into v_intent
    from public.payment_proof_upload_intents
   where id = p_intent_id and user_id = p_actor_id and storage_path = p_storage_path;
  if not found then raise exception using errcode = 'P0002', message = 'payment_proof_intent_not_found'; end if;
  return jsonb_build_object(
    'authorized', true, 'status', v_intent.status, 'expired', v_intent.expires_at <= now(),
    'orderId', v_intent.order_id, 'method', v_intent.method,
    'declaredMime', v_intent.declared_mime, 'declaredSize', v_intent.declared_size
  );
end $$;

create or replace function public.complete_payment_proof_upload_intent(
  p_actor_id uuid,
  p_intent_id uuid,
  p_storage_path text,
  p_observed_mime text,
  p_observed_size bigint,
  p_magic_valid boolean
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_intent public.payment_proof_upload_intents%rowtype;
  v_order public.orders%rowtype;
  v_payment_id uuid;
begin
  select * into v_intent
    from public.payment_proof_upload_intents
   where id = p_intent_id
   for update;
  if not found or v_intent.user_id <> p_actor_id or v_intent.storage_path <> p_storage_path then
    raise exception using errcode = 'P0002', message = 'payment_proof_intent_not_found';
  end if;
  if v_intent.status = 'finalized' then
    return jsonb_build_object('outcome', 'existing', 'paymentId', v_intent.payment_id, 'removeObject', false);
  end if;
  if v_intent.status in ('superseded','rejected','expired') then
    return jsonb_build_object('outcome', v_intent.status, 'paymentId', v_intent.payment_id, 'removeObject', true);
  end if;

  if v_intent.expires_at <= now() then
    update public.payment_proof_upload_intents set status = 'expired' where id = v_intent.id;
    insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
    values (p_actor_id, 'payment.proof_upload_expired', 'order', v_intent.order_id::text, jsonb_build_object('intentId', v_intent.id));
    return jsonb_build_object('outcome', 'expired', 'removeObject', true);
  end if;
  if coalesce(p_magic_valid, false) is not true
     or p_observed_mime is distinct from v_intent.declared_mime
     or p_observed_size is distinct from v_intent.declared_size
     or p_observed_size not between 1 and 5242880 then
    update public.payment_proof_upload_intents set status = 'rejected' where id = v_intent.id;
    insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
    values (
      p_actor_id, 'payment.proof_upload_rejected', 'order', v_intent.order_id::text,
      jsonb_build_object(
        'intentId', v_intent.id, 'magicValid', coalesce(p_magic_valid, false),
        'mimeMatched', p_observed_mime is not distinct from v_intent.declared_mime,
        'sizeMatched', p_observed_size is not distinct from v_intent.declared_size
      )
    );
    return jsonb_build_object('outcome', 'rejected', 'removeObject', true);
  end if;

  select * into v_order from public.orders where id = v_intent.order_id for update;
  if not found or v_order.user_id <> p_actor_id then
    raise exception using errcode = 'P0002', message = 'order_not_found';
  end if;
  select payment.id into v_payment_id
    from public.payments payment
   where payment.order_id = v_order.id and payment.status = 'pending'
     and exists(select 1 from public.payment_proofs proof where proof.payment_id = payment.id)
   order by payment.created_at desc limit 1;
  if v_payment_id is not null and v_order.status = 'awaiting_review' then
    update public.payment_proof_upload_intents
       set status = 'superseded', payment_id = v_payment_id
     where id = v_intent.id;
    insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
    values (
      p_actor_id, 'payment.proof_upload_superseded', 'order', v_order.id::text,
      jsonb_build_object('intentId', v_intent.id, 'paymentId', v_payment_id)
    );
    return jsonb_build_object('outcome', 'existing', 'paymentId', v_payment_id, 'removeObject', true);
  end if;
  if v_order.status <> 'pending_payment' then
    raise exception using errcode = 'P0001', message = 'order_not_pending';
  end if;
  if v_order.expires_at is not null and v_order.expires_at <= now() then
    raise exception using errcode = '22023', message = 'order_expired';
  end if;
  if v_order.total <= 0 then raise exception using errcode = '22023', message = 'proof_not_required'; end if;
  if not public.payment_method_is_configured(v_intent.method)
     or (v_order.requested_payment_method is not null and v_order.requested_payment_method <> v_intent.method) then
    raise exception using errcode = '22023', message = 'invalid_payment_method';
  end if;

  insert into public.payments(order_id, user_id, method, amount, status)
  values (v_order.id, p_actor_id, v_intent.method, v_order.total, 'pending')
  returning id into v_payment_id;
  insert into public.payment_proofs(payment_id, storage_path, uploaded_by)
  values (v_payment_id, v_intent.storage_path, p_actor_id);
  update public.orders set status = 'awaiting_review' where id = v_order.id;
  update public.payment_proof_upload_intents
     set status = 'finalized', payment_id = v_payment_id
   where id = v_intent.id;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
  values (
    p_actor_id, 'payment.proof_submitted', 'payment', v_payment_id::text,
    jsonb_build_object(
      'orderId', v_order.id, 'intentId', v_intent.id, 'method', v_intent.method,
      'observedMime', p_observed_mime, 'observedSize', p_observed_size, 'inspection', 'magic_and_metadata_validated'
    )
  );
  return jsonb_build_object('outcome', 'submitted', 'paymentId', v_payment_id, 'removeObject', false);
end $$;

revoke all on function public.create_product_order_v2(uuid,uuid,text,text) from public, anon, authenticated, service_role;
revoke all on function public.submit_payment_proof_atomic(uuid,text,text) from public, anon, authenticated, service_role;

revoke all on function public.checkout_product_ready(uuid) from public, anon, authenticated;
revoke all on function public.calculate_checkout_quote(uuid,uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.create_product_order_v3(uuid,uuid,uuid,text,text,uuid) from public, anon, authenticated;
revoke all on function public.begin_payment_proof_upload_intent(uuid,uuid,text,text,bigint,uuid) from public, anon, authenticated;
revoke all on function public.authorize_payment_proof_upload_finalization(uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.complete_payment_proof_upload_intent(uuid,uuid,text,text,bigint,boolean) from public, anon, authenticated;

grant execute on function public.checkout_product_ready(uuid) to service_role;
grant execute on function public.calculate_checkout_quote(uuid,uuid,uuid,text) to service_role;
grant execute on function public.create_product_order_v3(uuid,uuid,uuid,text,text,uuid) to service_role;
grant execute on function public.begin_payment_proof_upload_intent(uuid,uuid,text,text,bigint,uuid) to service_role;
grant execute on function public.authorize_payment_proof_upload_finalization(uuid,uuid,text) to service_role;
grant execute on function public.complete_payment_proof_upload_intent(uuid,uuid,text,text,bigint,boolean) to service_role;

comment on table public.payment_proof_upload_intents is
  'Private service-only intent ledger for direct-to-Storage payment-proof upload and inspected finalization.';
comment on function public.calculate_checkout_quote(uuid,uuid,uuid,text) is
  'Service-only authoritative product/variant/offer/coupon quote; client price is never an input.';
comment on function public.create_product_order_v3(uuid,uuid,uuid,text,text,uuid) is
  'Service-only checkout with explicit verified actor, request idempotency and database-authoritative price.';
comment on function public.begin_payment_proof_upload_intent(uuid,uuid,text,text,bigint,uuid) is
  'Service-only order-owned upload intent issued before a direct signed Storage upload.';
comment on function public.authorize_payment_proof_upload_finalization(uuid,uuid,text) is
  'Service-only authorization preflight required before any privileged Storage inspection or removal.';
comment on function public.complete_payment_proof_upload_intent(uuid,uuid,text,text,bigint,boolean) is
  'Service-only inspected and idempotent proof finalization; state, payment, proof and metadata-only audit commit atomically.';

-- Rollback-by-forward-fix: preserve orders, request identities, upload intents,
-- proofs and audits. Replace these RPCs in a later migration; never restore
-- browser-direct checkout/proof mutation or bind an uninspected object.
