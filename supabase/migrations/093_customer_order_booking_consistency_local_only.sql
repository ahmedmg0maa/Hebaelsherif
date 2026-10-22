-- 093: customer commerce/booking consistency. LOCAL ONLY after 092.
-- No money transfer is initiated. Existing financial governance and MFA entry points remain intact.

create or replace function public.sync_paid_booking_insert_093()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='pending' and exists(select 1 from public.orders where id=new.order_id and status='paid') then
   new.status:='confirmed';
 end if;
 return new;
end $$;
create trigger booking_paid_insert_093 before insert on public.bookings
 for each row execute function public.sync_paid_booking_insert_093();

create or replace function public.sync_order_booking_status_093()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_booking record;
begin
 if new.status is not distinct from old.status then return new; end if;
 if new.status='paid' then
   -- Reject the entire approval (including grants/audit) if its booking cannot be fulfilled.
   for v_booking in select * from public.bookings where order_id=new.id order by id for update loop
     if v_booking.status='cancelled' or (v_booking.status='pending' and v_booking.starts_at<=now()) then
       raise exception using errcode='23514',message='booking_payment_requires_review';
     end if;
     if v_booking.status='pending' then
       update public.bookings set status='confirmed' where id=v_booking.id;
       insert into public.booking_events(booking_id,actor_id,event,meta)
         values(v_booking.id,auth.uid(),'booking.payment_confirmed',jsonb_build_object('order_id',new.id));
     end if;
   end loop;
 elsif new.status='refunded' then
   -- A purchased package must have its upcoming appointments resolved before refund completion.
   if exists(select 1 from public.bookings b join public.subscriptions s on s.id=b.subscription_id
     where s.order_id=new.id and b.status in ('pending','confirmed') and b.starts_at>now()) then
     raise exception using errcode='23514',message='subscription_future_bookings_require_cancellation';
   end if;
   for v_booking in select * from public.bookings where order_id=new.id
     and status in ('pending','confirmed') and starts_at>now() order by id for update loop
     update public.bookings set status='cancelled' where id=v_booking.id;
     insert into public.booking_events(booking_id,actor_id,event,meta)
       values(v_booking.id,auth.uid(),'booking.payment_refunded',jsonb_build_object('order_id',new.id));
   end loop;
 end if;
 return new;
end $$;
create trigger order_booking_status_093 after update of status on public.orders
 for each row execute function public.sync_order_booking_status_093();
revoke all on function public.sync_paid_booking_insert_093(),public.sync_order_booking_status_093() from public,anon,authenticated,service_role;

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

  -- Lock the order before the booking, consistently with payment approval/refund.
  perform 1 from public.orders o where o.id=(select b.order_id from public.bookings b where b.id=p_booking_id and b.user_id=p_actor_id) for update;
  if exists(select 1 from public.orders o join public.bookings b on b.order_id=o.id
      where b.id=p_booking_id and b.user_id=p_actor_id and b.status<>'cancelled' and o.status in ('awaiting_review','refund_pending')) then
    raise exception using errcode='23514',message='booking_payment_under_review';
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

create or replace function public.grant_order_entitlements(p_order_id uuid,p_actor_id uuid)
returns int language plpgsql security definer set search_path=public as $$
declare v_order public.orders%rowtype; v_target record; v_workshop public.workshops%rowtype; v_count int:=0; v_registration public.workshop_registrations%rowtype; v_plan public.subscription_plans%rowtype; v_subscription_id uuid;
begin
  select * into v_order from public.orders where id=p_order_id for update;
  if not found then raise exception using errcode='P0002',message='order_not_found'; end if;
  for v_target in
    with targets as(select oi.product_id,false bundle from public.order_items oi where oi.order_id=p_order_id union select pb.child_product_id,true from public.order_items oi join public.product_bundles pb on pb.bundle_product_id=oi.product_id where oi.order_id=p_order_id)
    select distinct t.product_id,t.bundle,p.type from targets t join public.products p on p.id=t.product_id order by t.product_id
  loop
    insert into public.entitlement_grants(user_id,product_id,order_id,source)
    values(v_order.user_id,v_target.product_id,p_order_id,case when v_order.total=0 then 'free' when v_target.bundle then 'bundle' else 'purchase' end)
    on conflict(order_id,product_id) do nothing;
    if not found then continue; end if;
    v_count:=v_count+1;
    insert into public.content_access(user_id,product_id,source,order_id,granted_by)
    values(v_order.user_id,v_target.product_id,case when v_order.total=0 then 'free' when v_target.bundle then 'bundle' else 'purchase' end,p_order_id,p_actor_id)
    on conflict(user_id,product_id) do nothing;
    insert into public.course_enrollments(user_id,course_id,source) select v_order.user_id,c.id,'purchase' from public.courses c where c.product_id=v_target.product_id on conflict(user_id,course_id) do nothing;
    insert into public.book_access(user_id,book_id,order_id) select v_order.user_id,b.id,p_order_id from public.books b where b.product_id=v_target.product_id on conflict(user_id,book_id) do nothing;
    select * into v_workshop from public.workshops where product_id=v_target.product_id for update;
    if found then
      select * into v_registration from public.workshop_registrations where workshop_id=v_workshop.id and user_id=v_order.user_id for update;
      if not found or v_registration.status<>'registered' then
        if v_workshop.seats_total>0 and v_workshop.seats_reserved>=v_workshop.seats_total then raise exception using errcode='23514',message='workshop_capacity_reached'; end if;
        insert into public.workshop_registrations(workshop_id,user_id,order_id,status) values(v_workshop.id,v_order.user_id,p_order_id,'registered') on conflict(workshop_id,user_id) do update set order_id=excluded.order_id,status='registered';
        update public.workshops set seats_reserved=seats_reserved+1 where id=v_workshop.id;
      end if;
    end if;
    select * into v_plan from public.subscription_plans where product_id=v_target.product_id and archived_at is null;
    if found and not exists(select 1 from public.subscriptions where order_id=p_order_id) then
      v_subscription_id:=public.create_managed_subscription(v_order.user_id,v_plan.id,'active',now(),now()+make_interval(days=>v_plan.duration_days),'تفعيل تلقائي من الطلب '||p_order_id::text,p_actor_id);
      update public.subscriptions set order_id=p_order_id where id=v_subscription_id;
    end if;
  end loop;
  return v_count;
end $$;

create or replace function public.set_program_bundle_children(p_bundle_product_id uuid,p_child_ids uuid[],p_actor_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_published boolean;v_count integer;
begin
  if not public.has_permission('catalog.manage',p_actor_id) then raise exception using errcode='42501',message='catalog_manage_permission_required';end if;
  select is_published into v_published from public.products where id=p_bundle_product_id and type='bundle' for update;
  if not found or coalesce(array_length(p_child_ids,1),0)<1 or coalesce(array_length(p_child_ids,1),0)>50 then raise exception using errcode='22023',message='invalid_bundle_composition';end if;
  if v_published and public.has_permission('catalog.publish',p_actor_id) is not true then raise exception using errcode='42501',message='catalog_publish_permission_required';end if;
  insert into public.content_revisions(entity_type,entity_id,snapshot,created_by) select 'product',p_bundle_product_id,jsonb_build_object('children',coalesce(jsonb_agg(child_product_id),'[]'::jsonb)),p_actor_id from public.product_bundles where bundle_product_id=p_bundle_product_id;
  select count(distinct id) into v_count from public.products where id=any(p_child_ids) and id<>p_bundle_product_id and type in ('course','book','workshop','session');
  if v_count<>array_length(p_child_ids,1) then raise exception using errcode='22023',message='invalid_bundle_child';end if;
  if exists(select 1 from public.order_items i join public.orders o on o.id=i.order_id
    where i.product_id=p_bundle_product_id and o.status in ('pending_payment','awaiting_review')) then
    raise exception using errcode='23514',message='bundle_pending_orders';
  end if;
  delete from public.product_bundles where bundle_product_id=p_bundle_product_id;
  insert into public.product_bundles(bundle_product_id,child_product_id) select p_bundle_product_id,id from unnest(p_child_ids) id;
  if v_published and not public.program_product_ready(p_bundle_product_id) then raise exception using errcode='22023',message='published_bundle_not_ready';end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta) values(p_actor_id,'bundle.composition_updated','product',p_bundle_product_id::text,jsonb_build_object('childCount',v_count,'remainedPublished',v_published));
  return true;
end $$;

-- Store requested coupon identity, rather than re-reading a mutable coupon row on retries.
alter table public.orders add column checkout_coupon_code text;
update public.orders o set checkout_coupon_code=coalesce((select upper(btrim(c.code)) from public.coupons c where c.id=o.coupon_id),'')
 where o.checkout_request_id is not null;
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
       or v_existing.requested_payment_method is distinct from p_method
       or v_existing.checkout_coupon_code is distinct from upper(btrim(coalesce(p_coupon_code,''))) then
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
    expires_at, checkout_request_id, requested_payment_method, checkout_coupon_code
  ) values (
    p_actor_id, 'pending_payment', (v_quote->>'listPrice')::numeric,
    (v_quote->>'offerDiscount')::numeric + (v_quote->>'couponDiscount')::numeric,
    v_total, v_quote->>'currency', nullif(v_quote->>'couponId','')::uuid,
    nullif(v_quote->>'offerId','')::uuid, v_expiry, p_request_id, p_method, upper(btrim(coalesce(p_coupon_code,'')))
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
    'expires_at', (select expires_at from public.orders where id=v_order_id), 'status', (select status from public.orders where id = v_order_id)
  );
end $$;

revoke all on function public.cancel_customer_booking_governed(uuid,uuid,text),public.grant_order_entitlements(uuid,uuid),public.set_program_bundle_children(uuid,uuid[],uuid),public.create_product_order_v3(uuid,uuid,uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.cancel_customer_booking_governed(uuid,uuid,text),public.grant_order_entitlements(uuid,uuid),public.set_program_bundle_children(uuid,uuid[],uuid),public.create_product_order_v3(uuid,uuid,uuid,text,text,uuid) to service_role;

-- Add capabilities without breaking the old calendar contract identifier.
create or replace function public.booking_runtime_contract()
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('migration','044','timezone','Africa/Cairo','holds',true,'slot_overrides',true,'customerJourney','093')
$$;
revoke all on function public.booking_runtime_contract() from public;
grant execute on function public.booking_runtime_contract() to anon,authenticated;
