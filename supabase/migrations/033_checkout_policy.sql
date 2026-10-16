-- 033: checkout validates configured payment methods and coupon targeting/stacking server-side.
create or replace function public.create_product_order_v2(p_product_id uuid,p_variant_id uuid,p_coupon_code text,p_method text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid();v_product public.products%rowtype;v_variant public.product_variants%rowtype;v_offer public.offers%rowtype;v_coupon public.coupons%rowtype;
v_list numeric(10,2);v_price numeric(10,2);v_offer_discount numeric(10,2):=0;v_coupon_discount numeric(10,2):=0;v_total numeric(10,2);v_expiry_hours int:=72;v_expiry timestamptz;v_order uuid;v_existing public.orders%rowtype;v_code text:=upper(btrim(coalesce(p_coupon_code,'')));
begin
  if v_user is null then raise exception using errcode='42501',message='auth_required'; end if;
  if not public.payment_method_is_configured(p_method) then raise exception using errcode='22023',message='invalid_payment_method'; end if;
  select * into v_product from public.products where id=p_product_id and is_published for share;
  if not found then raise exception using errcode='P0002',message='product_unavailable'; end if;
  v_list:=v_product.price;
  if p_variant_id is not null then
    select * into v_variant from public.product_variants where id=p_variant_id and product_id=p_product_id and is_active for share;
    if not found then raise exception using errcode='P0002',message='variant_unavailable'; end if;
    v_list:=v_variant.price;
  end if;
  select o.* into v_offer from public.offers o where o.is_active and o.starts_at<=now() and (o.ends_at is null or o.ends_at>now()) and o.discount_kind is not null and o.discount_value is not null
    and (not exists(select 1 from public.offer_targets t where t.offer_id=o.id) or exists(select 1 from public.offer_targets t where t.offer_id=o.id and (t.product_id=v_product.id or t.product_type=v_product.type)))
    order by case when o.discount_kind='percent' then v_list*o.discount_value/100 else o.discount_value end desc limit 1;
  if found then v_offer_discount:=least(v_list,case when v_offer.discount_kind='percent' then round(v_list*v_offer.discount_value/100,2) else v_offer.discount_value end); end if;
  v_price:=greatest(0,v_list-v_offer_discount);
  if v_code<>'' then
    perform pg_advisory_xact_lock(hashtextextended('coupon:'||v_code,0));
    select * into v_coupon from public.coupons where code=v_code and is_active and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now()) for update;
    if not found then raise exception using errcode='22023',message='coupon_invalid'; end if;
    if v_offer.id is not null and not v_coupon.allow_with_offers then raise exception using errcode='22023',message='coupon_stacking_not_allowed'; end if;
    if exists(select 1 from public.coupon_targets where coupon_id=v_coupon.id) and not exists(select 1 from public.coupon_targets where coupon_id=v_coupon.id and (product_id=v_product.id or product_type=v_product.type)) then raise exception using errcode='22023',message='coupon_scope_mismatch'; end if;
    if v_coupon.max_uses is not null and (select count(*) from public.coupon_redemptions where coupon_id=v_coupon.id)>=v_coupon.max_uses then raise exception using errcode='22023',message='coupon_exhausted'; end if;
    if (select count(*) from public.coupon_redemptions where coupon_id=v_coupon.id and user_id=v_user)>=v_coupon.max_uses_per_user then raise exception using errcode='22023',message='coupon_user_limit'; end if;
    v_coupon_discount:=least(v_price,case when v_coupon.kind='percent' then round(v_price*v_coupon.value/100,2) else v_coupon.value end);
  end if;
  v_total:=greatest(0,v_price-v_coupon_discount);
  select coalesce((value->>'hours')::int,72) into v_expiry_hours from public.site_settings where key='order_expiry_hours';v_expiry:=now()+make_interval(hours=>coalesce(v_expiry_hours,72));
  perform pg_advisory_xact_lock(hashtextextended('checkout-v2:'||v_user::text||':'||p_product_id::text||':'||coalesce(p_variant_id::text,'base')||':'||coalesce(v_coupon.id::text,'none')||':'||coalesce(v_offer.id::text,'none'),0));
  select o.* into v_existing from public.orders o join public.order_items i on i.order_id=o.id where o.user_id=v_user and i.product_id=p_product_id and i.variant_id is not distinct from p_variant_id and o.status='pending_payment' and o.expires_at>now() and o.created_at>now()-interval '2 minutes' and o.coupon_id is not distinct from v_coupon.id and o.offer_id is not distinct from v_offer.id order by o.created_at desc limit 1;
  if found then return jsonb_build_object('outcome','existing','order_id',v_existing.id,'total',v_existing.total,'expires_at',v_existing.expires_at); end if;
  insert into public.orders(user_id,status,subtotal,discount,total,currency,coupon_id,offer_id,expires_at) values(v_user,'pending_payment',v_list,v_offer_discount+v_coupon_discount,v_total,v_product.currency,v_coupon.id,v_offer.id,v_expiry) returning id into v_order;
  insert into public.order_items(order_id,product_id,variant_id,quantity,unit_price,total) values(v_order,v_product.id,p_variant_id,1,v_price,v_total);
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta) values(v_user,'order.created','order',v_order::text,jsonb_build_object('product_id',v_product.id,'variant_id',p_variant_id,'method',p_method,'total',v_total,'coupon_id',v_coupon.id));
  return jsonb_build_object('outcome','created','order_id',v_order,'total',v_total,'expires_at',v_expiry);
end $$;
revoke all on function public.create_product_order_v2(uuid,uuid,text,text) from public,anon;
grant execute on function public.create_product_order_v2(uuid,uuid,text,text) to authenticated;
