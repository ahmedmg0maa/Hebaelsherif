-- 032: commerce P0 closure — entitlement/refund ledgers, atomic workshop seats,
-- configured payment methods, coupon scope/stacking, package fulfillment.

alter table public.coupons add column if not exists allow_with_offers boolean not null default false;
create table if not exists public.coupon_targets(
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  product_type text,
  check(product_id is not null or product_type is not null)
);
create unique index if not exists coupon_targets_product_uidx on public.coupon_targets(coupon_id,product_id) where product_id is not null;
create unique index if not exists coupon_targets_type_uidx on public.coupon_targets(coupon_id,product_type) where product_type is not null;
alter table public.coupon_targets enable row level security;
create policy "coupon targets: marketing manage" on public.coupon_targets for all using(public.has_permission('marketing.manage')) with check(public.has_permission('marketing.manage'));

alter table public.subscription_plans add column if not exists product_id uuid unique references public.products(id) on delete restrict;

create table if not exists public.entitlement_grants(
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  source text not null check(source in ('purchase','bundle','free','package')),
  granted_at timestamptz not null default now(), revoked_at timestamptz, revoked_by uuid references auth.users(id) on delete set null,
  revoke_reason text, unique(order_id,product_id)
);
create index if not exists entitlement_grants_active_idx on public.entitlement_grants(user_id,product_id) where revoked_at is null;
alter table public.entitlement_grants enable row level security;
create policy "entitlements: own or permitted read" on public.entitlement_grants for select using(user_id=auth.uid() or public.has_permission('orders.view'));
create policy "entitlements: permitted write" on public.entitlement_grants for all using(public.has_permission('payments.approve') or public.has_permission('orders.refund')) with check(public.has_permission('payments.approve') or public.has_permission('orders.refund'));

create table if not exists public.payment_refunds(
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete restrict,
  payment_id uuid references public.payments(id) on delete restrict, amount numeric(10,2) not null check(amount>=0),
  reason text not null, status text not null default 'recorded' check(status in ('recorded','processing','completed','failed')),
  created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(),
  unique(order_id)
);
alter table public.payment_refunds enable row level security;
create policy "refunds: permitted read" on public.payment_refunds for select using(public.has_permission('orders.view') or public.has_permission('orders.refund'));
create policy "refunds: permitted write" on public.payment_refunds for all using(public.has_permission('orders.refund')) with check(public.has_permission('orders.refund'));

alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments add constraint payments_status_check check(status in ('pending','approved','rejected','cancelled','refunded'));

-- Meeting links never live on a publicly selectable workshop row.
create table if not exists public.workshop_delivery(
  workshop_id uuid primary key references public.workshops(id) on delete cascade,
  meeting_url text, updated_at timestamptz not null default now()
);
insert into public.workshop_delivery(workshop_id,meeting_url) select id,meeting_url from public.workshops where meeting_url is not null on conflict(workshop_id) do update set meeting_url=excluded.meeting_url,updated_at=now();
update public.workshops set meeting_url=null where meeting_url is not null;
alter table public.workshop_delivery enable row level security;
create policy "workshop delivery: registered read" on public.workshop_delivery for select using(public.has_permission('learning.manage') or exists(select 1 from public.workshop_registrations r where r.workshop_id=workshop_delivery.workshop_id and r.user_id=auth.uid() and r.status='registered'));
create policy "workshop delivery: learning manage" on public.workshop_delivery for all using(public.has_permission('learning.manage')) with check(public.has_permission('learning.manage'));
create or replace function public.capture_workshop_meeting_url() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.meeting_url is not null then
    insert into public.workshop_delivery(workshop_id,meeting_url) values(new.id,new.meeting_url) on conflict(workshop_id) do update set meeting_url=excluded.meeting_url,updated_at=now();
    new.meeting_url:=null;
  end if;
  return new;
end $$;
drop trigger if exists workshops_private_meeting_url on public.workshops;
create trigger workshops_private_meeting_url before insert or update of meeting_url on public.workshops for each row execute function public.capture_workshop_meeting_url();

create or replace function public.payment_method_is_configured(p_method text)
returns boolean language sql stable security definer set search_path=public as $$
  select case p_method
    when 'instapay' then exists(select 1 from public.site_settings where key='payment_instapay' and coalesce(value->>'handle','')<>'')
    when 'wallet' then exists(select 1 from public.site_settings where key='payment_wallet' and coalesce(value->>'number','')<>'')
    when 'bank_transfer' then exists(select 1 from public.site_settings where key='payment_bank' and coalesce(value->>'iban','')<>'')
    else false end
$$;
revoke all on function public.payment_method_is_configured(text) from public,anon,authenticated;

create or replace function public.grant_order_entitlements(p_order_id uuid,p_actor_id uuid)
returns int language plpgsql security definer set search_path=public as $$
declare v_order public.orders%rowtype; v_target record; v_workshop public.workshops%rowtype; v_count int:=0; v_registration public.workshop_registrations%rowtype; v_plan public.subscription_plans%rowtype;
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
      perform public.create_managed_subscription(v_order.user_id,v_plan.id,'active',now(),now()+make_interval(days=>v_plan.duration_days),'تفعيل تلقائي من الطلب '||p_order_id::text,p_actor_id);
      update public.subscriptions set order_id=p_order_id where id=(select id from public.subscriptions where user_id=v_order.user_id and plan_id=v_plan.id order by created_at desc limit 1);
    end if;
  end loop;
  return v_count;
end $$;
revoke all on function public.grant_order_entitlements(uuid,uuid) from public,anon,authenticated;
grant execute on function public.grant_order_entitlements(uuid,uuid) to service_role;

create or replace function public.approve_payment_atomic(p_payment_id uuid,p_actor_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_payment public.payments%rowtype; v_order public.orders%rowtype; v_coupon public.coupons%rowtype; v_grants int;
begin
  select * into v_payment from public.payments where id=p_payment_id for update;
  if not found then raise exception using errcode='P0002',message='payment_not_found'; end if;
  if v_payment.status='approved' then return jsonb_build_object('outcome','already_approved','order_id',v_payment.order_id); end if;
  if v_payment.status<>'pending' then raise exception using errcode='P0001',message='payment_not_pending'; end if;
  select * into v_order from public.orders where id=v_payment.order_id for update;
  if not found or v_order.status not in ('awaiting_review','pending_payment') then raise exception using errcode='P0001',message='order_not_reviewable'; end if;
  if v_payment.user_id<>v_order.user_id or v_payment.amount<>v_order.total then raise exception using errcode='23514',message='payment_order_mismatch'; end if;
  if not public.payment_method_is_configured(v_payment.method) then raise exception using errcode='22023',message='payment_method_disabled'; end if;
  if v_order.coupon_id is not null then
    select * into v_coupon from public.coupons where id=v_order.coupon_id for update;
    if not found or not v_coupon.is_active or (v_coupon.starts_at is not null and v_coupon.starts_at>now()) or (v_coupon.ends_at is not null and v_coupon.ends_at<now()) then raise exception using errcode='22023',message='coupon_invalid_at_approval'; end if;
    if v_order.offer_id is not null and not v_coupon.allow_with_offers then raise exception using errcode='22023',message='coupon_stacking_not_allowed'; end if;
    if exists(select 1 from public.coupon_targets) and exists(select 1 from public.coupon_targets where coupon_id=v_coupon.id) and not exists(select 1 from public.order_items oi join public.products p on p.id=oi.product_id join public.coupon_targets ct on ct.coupon_id=v_coupon.id and (ct.product_id=p.id or ct.product_type=p.type) where oi.order_id=v_order.id) then raise exception using errcode='22023',message='coupon_scope_mismatch'; end if;
    if v_coupon.max_uses is not null and (select count(*) from public.coupon_redemptions where coupon_id=v_coupon.id)>=v_coupon.max_uses then raise exception using errcode='22023',message='coupon_exhausted'; end if;
    if (select count(*) from public.coupon_redemptions where coupon_id=v_coupon.id and user_id=v_order.user_id)>=v_coupon.max_uses_per_user then raise exception using errcode='22023',message='coupon_user_limit'; end if;
  end if;
  v_grants:=public.grant_order_entitlements(v_order.id,p_actor_id);
  update public.payments set status='approved',reviewed_by=p_actor_id,reviewed_at=now(),reject_reason=null where id=p_payment_id;
  update public.orders set status='paid',expires_at=null where id=v_order.id;
  if v_order.coupon_id is not null then insert into public.coupon_redemptions(coupon_id,user_id,order_id) values(v_order.coupon_id,v_order.user_id,v_order.id) on conflict(order_id) do nothing; end if;
  insert into public.notifications(user_id,title,body,kind,link) values(v_order.user_id,'تم اعتماد دفعتك','فُعّل وصولك إلى مشترياتك.','success','/dashboard');
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta) values(p_actor_id,'payment.approved','payment',p_payment_id::text,jsonb_build_object('order_id',v_order.id,'grants',v_grants));
  return jsonb_build_object('outcome','approved','order_id',v_order.id,'grants',v_grants);
end $$;

create or replace function public.submit_payment_proof_atomic(p_order_id uuid,p_method text,p_storage_path text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid();v_order public.orders%rowtype;v_payment uuid;v_existing uuid;
begin
  if v_user is null then raise exception using errcode='42501',message='auth_required'; end if;
  if not public.payment_method_is_configured(p_method) or length(btrim(coalesce(p_storage_path,'')))<8 then raise exception using errcode='22023',message='invalid_proof'; end if;
  select * into v_order from public.orders where id=p_order_id for update;
  if not found or v_order.user_id<>v_user then raise exception using errcode='P0002',message='order_not_found'; end if;
  if v_order.total=0 then raise exception using errcode='22023',message='proof_not_required'; end if;
  if v_order.expires_at is not null and v_order.expires_at<now() then raise exception using errcode='22023',message='order_expired'; end if;
  select p.id into v_existing from public.payments p join public.payment_proofs pp on pp.payment_id=p.id where p.order_id=p_order_id and p.status='pending' order by p.created_at desc limit 1;
  if v_existing is not null and v_order.status='awaiting_review' then return jsonb_build_object('outcome','existing','payment_id',v_existing); end if;
  if v_order.status<>'pending_payment' then raise exception using errcode='P0001',message='order_not_pending'; end if;
  insert into public.payments(order_id,user_id,method,amount,status) values(v_order.id,v_user,p_method,v_order.total,'pending') returning id into v_payment;
  insert into public.payment_proofs(payment_id,storage_path,uploaded_by) values(v_payment,p_storage_path,v_user);
  update public.orders set status='awaiting_review' where id=v_order.id;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta) values(v_user,'payment.proof_submitted','payment',v_payment::text,jsonb_build_object('order_id',v_order.id,'method',p_method));
  return jsonb_build_object('outcome','submitted','payment_id',v_payment);
end $$;

create or replace function public.release_order_entitlements(p_order_id uuid,p_actor_id uuid,p_reason text)
returns int language plpgsql security definer set search_path=public as $$
declare v_order public.orders%rowtype;v_grant record;v_workshop public.workshops%rowtype;v_count int:=0;
begin
  select * into v_order from public.orders where id=p_order_id;
  for v_grant in update public.entitlement_grants set revoked_at=now(),revoked_by=p_actor_id,revoke_reason=p_reason where order_id=p_order_id and revoked_at is null returning product_id loop
    v_count:=v_count+1;
    if not exists(select 1 from public.entitlement_grants where user_id=v_order.user_id and product_id=v_grant.product_id and revoked_at is null) then
      delete from public.content_access where user_id=v_order.user_id and product_id=v_grant.product_id;
      delete from public.course_enrollments ce using public.courses c where ce.user_id=v_order.user_id and ce.course_id=c.id and c.product_id=v_grant.product_id;
      delete from public.book_access ba using public.books b where ba.user_id=v_order.user_id and ba.book_id=b.id and b.product_id=v_grant.product_id;
      select * into v_workshop from public.workshops where product_id=v_grant.product_id for update;
      if found and exists(select 1 from public.workshop_registrations where workshop_id=v_workshop.id and user_id=v_order.user_id and status='registered') then
        update public.workshop_registrations set status='cancelled' where workshop_id=v_workshop.id and user_id=v_order.user_id;
        update public.workshops set seats_reserved=greatest(0,seats_reserved-1) where id=v_workshop.id;
      end if;
    end if;
  end loop;
  update public.subscriptions set status='cancelled',cancelled_at=now() where order_id=p_order_id and status in ('pending','active','paused');
  return v_count;
end $$;
revoke all on function public.release_order_entitlements(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.release_order_entitlements(uuid,uuid,text) to service_role;

create or replace function public.transition_order_atomic(p_order_id uuid,p_actor_id uuid,p_status text,p_reason text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_order public.orders%rowtype;v_reason text:=coalesce(nullif(btrim(coalesce(p_reason,'')),''),'إجراء إداري');v_released int:=0;
begin
  if p_status not in ('cancelled','refunded','expired') then raise exception using errcode='22023',message='invalid_order_status'; end if;
  select * into v_order from public.orders where id=p_order_id for update;
  if not found then raise exception using errcode='P0002',message='order_not_found'; end if;
  if v_order.status=p_status then return jsonb_build_object('outcome','already_'||p_status,'previous',v_order.status); end if;
  if not ((p_status='cancelled' and v_order.status in ('pending_payment','awaiting_review')) or (p_status='expired' and v_order.status='pending_payment') or (p_status='refunded' and v_order.status='paid')) then raise exception using errcode='P0001',message='invalid_order_transition'; end if;
  if p_status='refunded' then
    v_released:=public.release_order_entitlements(p_order_id,p_actor_id,v_reason);
    insert into public.payment_refunds(order_id,payment_id,amount,reason,status,created_by) values(p_order_id,(select id from public.payments where order_id=p_order_id and status='approved' order by created_at desc limit 1),v_order.total,v_reason,'recorded',p_actor_id) on conflict(order_id) do nothing;
    update public.payments set status='refunded' where order_id=p_order_id and status='approved';
  else
    update public.payments set status='cancelled',reviewed_by=p_actor_id,reviewed_at=now(),reject_reason=v_reason where order_id=p_order_id and status='pending';
  end if;
  update public.orders set status=p_status where id=p_order_id;
  if p_status in ('cancelled','refunded') then update public.bookings set status='cancelled' where order_id=p_order_id and status in ('pending','confirmed'); end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta) values(p_actor_id,'order.'||p_status,'order',p_order_id::text,jsonb_build_object('previous',v_order.status,'reason',v_reason,'released',v_released));
  return jsonb_build_object('outcome',p_status,'previous',v_order.status,'released',v_released);
end $$;

-- Free orders become paid and grant access immediately after their first item.
create or replace function public.fulfill_free_order_item() returns trigger language plpgsql security definer set search_path=public as $$
declare v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id=new.order_id for update;
  if v_order.total=0 and v_order.status='pending_payment' then
    update public.orders set status='paid',expires_at=null where id=v_order.id;
    perform public.grant_order_entitlements(v_order.id,v_order.user_id);
    insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta) values(v_order.user_id,'order.free_fulfilled','order',v_order.id::text,'{}');
  end if;
  return new;
end $$;
drop trigger if exists order_item_free_fulfillment on public.order_items;
create trigger order_item_free_fulfillment after insert on public.order_items for each row execute function public.fulfill_free_order_item();
