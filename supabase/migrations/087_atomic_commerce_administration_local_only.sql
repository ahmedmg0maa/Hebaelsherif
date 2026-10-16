-- LOCAL ONLY: rehearse on isolated Staging after 086 and restore acceptance.
-- One transaction owns programme/variant/plan/marketing mutation, revision and audit.
begin;

create or replace function public.commerce_editor_payload_valid(k text,p jsonb)
returns boolean language plpgsql immutable set search_path=public as $$
declare keys text[]; x text; n numeric; t jsonb;
begin
  if k is null or jsonb_typeof(p) is distinct from 'object' or octet_length(p::text)>131072 then return false;end if;
  if k='program' then
    return coalesce(p->>'type','') in ('bundle','vip','free_resource') and p->'is_published'='false'::jsonb
      and (p->>'type'<>'free_resource' or p->'price'='0'::jsonb)
      and public.catalog_editor_payload_valid('course',(p-'type')||'{"level":"all","duration_minutes":0}'::jsonb);
  end if;
  keys:=case k when 'variant' then array['name','price','is_active']
    when 'plan' then array['title','slug','description','price','currency','product_id','billing_interval','duration_days','sessions_included','max_subscribers','features','starts_at','ends_at','is_active','is_published','sort','eligible_service_ids']
    when 'coupon' then array['code','kind','value','max_uses','max_uses_per_user','starts_at','ends_at']
    when 'offer' then array['title','description','kind','badge_text','discount_kind','discount_value','starts_at','ends_at','usage_limit','targets'] end;
  if keys is null or not(p ?& keys) or exists(select 1 from jsonb_object_keys(p) j where not j=any(keys)) then return false;end if;
  foreach x in array array['name','title','slug','description','currency','billing_interval','code','kind','discount_kind'] loop
    if not x=any(keys) then continue;end if;
    if jsonb_typeof(p->x) is distinct from 'string' or char_length(p->>x)>(case when x='description' then 30000 else 180 end) then return false;end if;
  end loop;
  foreach x in array array['price','duration_days','sessions_included','max_subscribers','sort','value','max_uses','max_uses_per_user','discount_value','usage_limit'] loop
    if not x=any(keys) then continue;end if;
    if p->x='null'::jsonb and x in ('max_subscribers','max_uses','usage_limit') then continue;end if;
    if jsonb_typeof(p->x) is distinct from 'number' then return false;end if;
    n:=(p->>x)::numeric;
    if n<0 or n>99999999.99 or n<>round(n,case when x in ('price','value','discount_value') then 2 else 0 end) then return false;end if;
    if x in ('duration_days','max_subscribers','max_uses','max_uses_per_user','usage_limit') and (n<1 or n>1000000) then return false;end if;
    if x in ('sort','sessions_included') and n>100000 then return false;end if;
    if x='duration_days' and n>3650 then return false;end if;
  end loop;
  foreach x in array array['is_active','is_published'] loop
    if x=any(keys) and jsonb_typeof(p->x) is distinct from 'boolean' then return false;end if;
  end loop;
  foreach x in array array['starts_at','ends_at'] loop
    if not x=any(keys) or p->x='null'::jsonb then continue;end if;
    if jsonb_typeof(p->x) is distinct from 'string' or (p->>x)!~'^\d{4}-\d{2}-\d{2}T.*Z$' then return false;end if;
    perform (p->>x)::timestamptz;
  end loop;
  if (p->>'ends_at')::timestamptz <= (p->>'starts_at')::timestamptz then return false;end if;
  if k='variant' then return char_length(btrim(p->>'name')) between 2 and 180;end if;
  if k='plan' then
    if char_length(btrim(p->>'title'))<2 or char_length(p->>'slug') not between 3 and 80 or (p->>'slug')!~'^[a-z0-9]+(-[a-z0-9]+)*$'
      or (p->>'currency')!~'^[A-Z]{3}$' or (p->>'billing_interval') not in ('month','quarter','year','one_time')
      or jsonb_typeof(p->'features') is distinct from 'array' or jsonb_array_length(p->'features')>50
      or jsonb_typeof(p->'eligible_service_ids') is distinct from 'array' or jsonb_array_length(p->'eligible_service_ids')>100 then return false;end if;
    if p->'product_id'<>'null'::jsonb then
      if jsonb_typeof(p->'product_id') is distinct from 'string' then return false;end if;
      perform (p->>'product_id')::uuid;
    end if;
    for t in select value from jsonb_array_elements(p->'features') loop
      if jsonb_typeof(t)<>'string' or char_length(btrim(t#>>'{}')) not between 1 and 300 then return false;end if;
    end loop;
    for t in select value from jsonb_array_elements(p->'eligible_service_ids') loop
      if jsonb_typeof(t)<>'string' then return false;end if;perform (t#>>'{}')::uuid;
    end loop;
  elsif k='coupon' then
    if (p->>'code')!~'^[A-Z0-9_-]{3,24}$' or (p->>'kind') not in ('percent','fixed') or (p->>'value')::numeric<=0 or ((p->>'kind')='percent' and (p->>'value')::numeric>100) then return false;end if;
  else
    if char_length(btrim(p->>'title'))<3 or (p->>'kind') not in ('flash_sale','coupon_campaign','bundle','limited_seats','countdown','seasonal')
      or (p->>'discount_kind') not in ('percent','fixed') or (p->>'discount_value')::numeric<=0 or ((p->>'discount_kind')='percent' and (p->>'discount_value')::numeric>100)
      or (p->'badge_text'<>'null'::jsonb and (jsonb_typeof(p->'badge_text')<>'string' or char_length(p->>'badge_text')>100))
      or jsonb_typeof(p->'targets') is distinct from 'array' or jsonb_array_length(p->'targets')>100 then return false;end if;
    for t in select value from jsonb_array_elements(p->'targets') loop
      if jsonb_typeof(t)<>'object' or not(t ?& array['product_id','product_type','category']) or t-array['product_id','product_type','category']<>'{}'::jsonb
        or (t->>'product_id' is null and t->>'product_type' is null and t->>'category' is null) then return false;end if;
      if t->'product_id'<>'null'::jsonb then perform (t->>'product_id')::uuid;end if;
      if t->'product_type'<>'null'::jsonb and coalesce(t->>'product_type','') not in ('course','book','workshop','session','bundle','vip','free_resource') then return false;end if;
      if t->'category'<>'null'::jsonb and (jsonb_typeof(t->'category')<>'string' or char_length(btrim(t->>'category')) not between 1 and 180) then return false;end if;
    end loop;
  end if;
  return true;
exception when others then return false;
end $$;

create or replace function public.manage_commerce_record(p_actor_id uuid,p_kind text,p_id uuid,p_action text,p_content jsonb default '{}'::jsonb,p_parent_id uuid default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare tbl text; entity text; perm text; cols text[]; names text; selections text; assignments text;
  old_row jsonb; links jsonb; payload jsonb:=p_content; result jsonb; item_id uuid:=p_id;
  parent public.products%rowtype; asset public.media_assets%rowtype; asset_id uuid;
begin
  tbl:=case p_kind when 'program' then 'products' when 'variant' then 'product_variants' when 'plan' then 'subscription_plans' when 'coupon' then 'coupons' when 'offer' then 'offers' end;
  entity:=case p_kind when 'program' then 'product' when 'variant' then 'product_variant' when 'plan' then 'subscription_plan' else p_kind end;
  perm:=case when p_kind in ('coupon','offer') then 'marketing.manage' when p_kind='plan' then 'packages.manage' when p_action='delete' then 'catalog.delete' else 'catalog.manage' end;
  if tbl is null or p_action is null or p_action not in ('save','active','archive','restore','delete') or p_actor_id is null then raise exception 'commerce_action_invalid';end if;
  if public.has_permission(perm,p_actor_id) is not true then raise exception using errcode='42501',message='commerce_permission_required';end if;
  if p_action='save' and public.commerce_editor_payload_valid(p_kind,p_content) is not true then raise exception using errcode='22023',message='commerce_payload_invalid';end if;
  if (p_action in ('archive','restore') and p_kind<>'plan') or (p_action='active' and p_kind not in ('coupon','offer')) then raise exception 'commerce_action_invalid';end if;
  if p_action='active' and (p_content-array['is_active']<>'{}'::jsonb or jsonb_typeof(p_content->'is_active') is distinct from 'boolean') then raise exception 'commerce_payload_invalid';end if;
  if p_action<>'save' and p_id is null then raise exception 'commerce_id_invalid';end if;
  -- Parent first: consistent ordering with programme deletion and variant FK writes.
  if p_kind='variant' then
    select * into parent from public.products where id=p_parent_id for update;
    if not found then raise exception 'commerce_parent_not_found';end if;
    if parent.is_published and public.has_permission('catalog.publish',p_actor_id) is not true then raise exception using errcode='42501',message='commerce_publish_required';end if;
  end if;
  if p_id is not null then
    execute format('select to_jsonb(t) from public.%I t where id=$1 for update',tbl) into old_row using p_id;
    if old_row is null then raise exception 'commerce_not_found';end if;
    if p_kind='variant' and (old_row->>'product_id')::uuid is distinct from p_parent_id then raise exception 'commerce_parent_invalid';end if;
    if p_kind='program' and (old_row->>'type') not in ('bundle','vip','free_resource') then raise exception 'commerce_specialized_editor_required';end if;
    if p_kind='program' and (old_row->>'is_published')::boolean and p_action='save' and public.has_permission('catalog.publish',p_actor_id) is not true then raise exception using errcode='42501',message='commerce_publish_required';end if;
    if p_kind='plan' then
      select coalesce(jsonb_agg(service_id),'[]'::jsonb) into links from public.subscription_plan_services where plan_id=p_id;
    elsif p_kind='offer' then
      select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) into links from public.offer_targets t where offer_id=p_id;
    elsif p_kind='program' then
      select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) into links from public.media_usages t where entity_type='product' and entity_id=p_id::text;
    end if;
    insert into public.content_revisions(entity_type,entity_id,snapshot,created_by) values(entity,p_id,jsonb_build_object('record',old_row,'links',links),p_actor_id);
  end if;
  if p_kind='plan' then
    -- Public purchase wrappers must be withdrawn before changing their contract.
    if exists(select 1 from public.products where id in ((old_row->>'product_id')::uuid,(p_content->>'product_id')::uuid) and is_published) then raise exception 'commerce_published_product_requires_withdrawal';end if;
    if old_row->>'product_id' is not null and exists(select 1 from public.order_items i join public.orders o on o.id=i.order_id where i.product_id=(old_row->>'product_id')::uuid and o.status in ('pending_payment','awaiting_review') and (o.expires_at is null or o.expires_at>now())) then raise exception 'commerce_pending_plan_orders';end if;
    if p_action='save' and old_row->>'archived_at' is not null then raise exception 'commerce_plan_archived';end if;
  end if;
  if p_action='delete' then
    if p_kind='program' then
      if exists(select 1 from public.order_items where product_id=p_id) or exists(select 1 from public.content_access where product_id=p_id)
        or exists(select 1 from public.subscription_plans where product_id=p_id) or exists(select 1 from public.resources where related_product_id=p_id)
        or exists(select 1 from public.product_bundles where child_product_id=p_id) then raise exception using errcode='23503',message='commerce_history_exists';end if;
      delete from public.media_usages where entity_type='product' and entity_id=p_id::text;
    elsif p_kind='variant' and exists(select 1 from public.order_items where variant_id=p_id) then raise exception using errcode='23503',message='commerce_history_exists';
    elsif p_kind='plan' and exists(select 1 from public.subscriptions where plan_id=p_id) then raise exception using errcode='23503',message='commerce_history_exists';
    elsif p_kind='coupon' and (exists(select 1 from public.orders where coupon_id=p_id) or exists(select 1 from public.coupon_redemptions where coupon_id=p_id)) then raise exception using errcode='23503',message='commerce_history_exists';
    elsif p_kind='offer' and exists(select 1 from public.orders where offer_id=p_id) then raise exception using errcode='23503',message='commerce_history_exists';end if;
    execute format('delete from public.%I where id=$1',tbl) using p_id;
  elsif p_action in ('archive','restore') then
    update public.subscription_plans set archived_at=case when p_action='archive' then now() else null end,is_active=false,is_published=false,version=version+1 where id=p_id;
  elsif p_action='active' then
    execute format('update public.%I set is_active=$1 where id=$2',tbl) using (p_content->>'is_active')::boolean,p_id;
  else
    if p_kind='program' then
      if old_row is not null and old_row->>'type' is distinct from p_content->>'type' then raise exception 'commerce_type_invalid';end if;
      asset_id:=(p_content->>'cover_asset_id')::uuid;
      if asset_id is null and old_row is not null and p_content->>'cover_url' is not distinct from old_row->>'cover_url' and old_row->>'cover_url' is not null then
        select u.asset_id into asset_id from public.media_usages u where entity_type='product' and entity_id=p_id::text and field='cover_url' limit 1;
      end if;
      if asset_id is not null then
        select * into asset from public.media_assets where id=asset_id for share;
        if not found or asset.archived_at is not null or asset.bucket<>'public-media' or asset.visibility<>'public' or asset.kind<>'image' then raise exception 'commerce_media_invalid';end if;
      elsif p_content->>'cover_url' is not null and (old_row is null or p_content->>'cover_url' is distinct from old_row->>'cover_url') then raise exception 'commerce_cover_invalid';end if;
      cols:=array['type','title','slug','subtitle','description','price','compare_at_price','currency','sort','cover_url','is_published'];
    elsif p_kind='variant' then
      cols:=array['product_id','name','price','is_active'];payload:=payload||jsonb_build_object('product_id',p_parent_id);
    elsif p_kind='plan' then
      if p_content->>'product_id' is not null and not exists(select 1 from public.products where id=(p_content->>'product_id')::uuid and type in ('vip','bundle')) then raise exception 'commerce_plan_product_invalid';end if;
      if exists(select 1 from jsonb_array_elements_text(p_content->'eligible_service_ids') s where not exists(select 1 from public.services where id=s::uuid)) then raise exception 'commerce_service_invalid';end if;
      if (p_content->>'max_subscribers')::int<(select count(*) from public.subscriptions where plan_id=p_id and status='active' and archived_at is null and ends_at>now()) then raise exception 'commerce_capacity_invalid';end if;
      payload:=payload||jsonb_build_object('version',coalesce((old_row->>'version')::int,0)+1);
      cols:=array['title','slug','description','price','currency','product_id','billing_interval','duration_days','sessions_included','max_subscribers','features','starts_at','ends_at','is_active','is_published','sort','version'];
    elsif p_kind='coupon' then
      cols:=array['code','kind','value','max_uses','max_uses_per_user','starts_at','ends_at'];
      if p_id is null then cols:=cols||array['created_by'];payload:=payload||jsonb_build_object('created_by',p_actor_id);end if;
    else
      cols:=array['title','description','kind','badge_text','discount_kind','discount_value','starts_at','ends_at','usage_limit'];
      payload:=payload||jsonb_build_object('starts_at',coalesce((p_content->>'starts_at')::timestamptz,now()));
      if (payload->>'ends_at')::timestamptz<=(payload->>'starts_at')::timestamptz then raise exception 'commerce_dates_invalid';end if;
    end if;
    select string_agg(format('%I',c),','),string_agg(format('x.%I',c),','),string_agg(format('%I=x.%I',c,c),',') into names,selections,assignments from unnest(cols) c;
    if p_id is null then
      execute format('insert into public.%I as t (%s) select %s from jsonb_populate_record(null::public.%I,$1) x returning to_jsonb(t)',tbl,names,selections,tbl) into result using payload;
      item_id:=(result->>'id')::uuid;
    else
      execute format('update public.%I t set %s from jsonb_populate_record(null::public.%I,$1) x where t.id=$2 returning to_jsonb(t)',tbl,assignments,tbl) into result using payload,p_id;
    end if;
    if p_kind='program' then
      delete from public.media_usages where entity_type='product' and entity_id=item_id::text and field='cover_url';
      if asset_id is not null then insert into public.media_usages(asset_id,entity_type,entity_id,field,created_by) values(asset_id,'product',item_id::text,'cover_url',p_actor_id);end if;
    elsif p_kind='plan' then
      delete from public.subscription_plan_services where plan_id=item_id;
      insert into public.subscription_plan_services(plan_id,service_id) select item_id,s::uuid from (select distinct jsonb_array_elements_text(p_content->'eligible_service_ids') s) ids;
    elsif p_kind='offer' then
      delete from public.offer_targets where offer_id=item_id;
      insert into public.offer_targets(offer_id,product_id,product_type,category) select item_id,t.product_id,t.product_type,t.category from jsonb_to_recordset(p_content->'targets') as t(product_id uuid,product_type text,category text);
    end if;
  end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta) values(p_actor_id,entity||'.'||case when p_action='save' then case when p_id is null then 'created' else 'updated' end else p_action end,entity,item_id::text,jsonb_build_object('operation',p_action,'transactional',true));
  return jsonb_build_object('id',item_id,'slug',coalesce(result->>'slug',old_row->>'slug'),'previousSlug',old_row->>'slug','type',coalesce(result->>'type',old_row->>'type',parent.type));
end $$;

-- Capacity includes live reservations and fulfilled/refunded orders; expired holds
-- and cancelled orders release it. The row lock serializes concurrent reservations.
create or replace function public.offer_has_capacity(p_offer_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select coalesce((select o.usage_limit is null or o.usage_limit>(select count(*) from public.orders r where r.offer_id=o.id
    and (r.status in ('paid','refunded') or (r.status in ('pending_payment','awaiting_review') and (r.expires_at is null or r.expires_at>now())))) from public.offers o where id=p_offer_id),false);
$$;
create or replace function public.reserve_offer_capacity()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.offer_id is null then return new;end if;
  if TG_OP='UPDATE' and new.offer_id is not distinct from old.offer_id then return new;end if;
  perform 1 from public.offers where id=new.offer_id for update;
  if public.offer_has_capacity(new.offer_id) is not true then raise exception using errcode='55000',message='offer_capacity_exhausted';end if;
  return new;
end $$;
create trigger order_offer_capacity before insert or update of offer_id on public.orders for each row execute function public.reserve_offer_capacity();
revoke all on function public.offer_has_capacity(uuid) from public,anon,authenticated;
grant execute on function public.offer_has_capacity(uuid) to anon,authenticated,service_role;
revoke all on function public.reserve_offer_capacity() from public,anon,authenticated;
drop policy if exists "offers: public read active" on public.offers;
create policy "offers: public read active" on public.offers for select using (
  (is_active and starts_at<=now() and (ends_at is null or ends_at>now()) and public.offer_has_capacity(id)) or public.has_permission('marketing.manage',auth.uid())
);

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
     and public.offer_has_capacity(offer.id)
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
     and public.offer_has_capacity(o.id)
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

-- Retain the retired legacy booking RPC boundary from 044.
revoke all on function public.create_booking_order(uuid,date,time,text,text,text) from public,anon,authenticated;
revoke all on function public.calculate_checkout_quote(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.calculate_checkout_quote(uuid,uuid,uuid,text) to service_role;
-- Deleting the last target must never turn a targeted offer into a global offer.
alter table public.offer_targets drop constraint if exists offer_targets_product_id_fkey;
alter table public.offer_targets add constraint offer_targets_product_id_fkey foreign key(product_id) references public.products(id) on delete restrict;

revoke all on function public.commerce_editor_payload_valid(text,jsonb) from public,anon,authenticated;
revoke all on function public.manage_commerce_record(uuid,text,uuid,text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.commerce_editor_payload_valid(text,jsonb) to service_role;
grant execute on function public.manage_commerce_record(uuid,text,uuid,text,jsonb,uuid) to service_role;
revoke insert,update,delete on public.product_variants,public.product_bundles,public.subscription_plans,public.subscription_plan_services,public.coupons,public.offers,public.offer_targets from anon,authenticated;
commit;
