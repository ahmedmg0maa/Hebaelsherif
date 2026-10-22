-- 029: Phase 5 integrity gate — immutable credits, scoped idempotency,
-- eligible services, atomic activation, cancellation reversal, and serialized windows.

-- Availability overlap checks must serialize concurrent writers for one service/day.
create or replace function public.guard_availability_window_overlap()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.start_time >= new.end_time then
    raise exception using errcode = '22023', message = 'invalid_availability_window';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('availability:' || new.service_id::text || ':' || new.weekday::text, 0));
  if exists (
    select 1 from public.availability_rules r
    where r.service_id = new.service_id
      and r.weekday = new.weekday
      and r.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
      and r.start_time < new.end_time
      and r.end_time > new.start_time
  ) then
    raise exception using errcode = '23P01', message = 'availability_window_overlap';
  end if;
  return new;
end;
$$;

-- Plans explicitly state which services their credits can buy.
create table if not exists public.subscription_plan_services (
  plan_id uuid not null references public.subscription_plans(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (plan_id, service_id)
);
alter table public.subscription_plan_services enable row level security;
create policy "plan services: published or permitted read"
  on public.subscription_plan_services for select
  using (
    exists (select 1 from public.subscription_plans p where p.id = plan_id and p.is_active and p.is_published)
    or public.has_permission('packages.manage')
  );
create policy "plan services: permitted write"
  on public.subscription_plan_services for all
  using (public.has_permission('packages.manage'))
  with check (public.has_permission('packages.manage'));

alter table public.subscription_plans
  add column if not exists archived_at timestamptz,
  add column if not exists version int not null default 1 check (version > 0);

alter table public.subscriptions
  add column if not exists plan_snapshot jsonb,
  add column if not exists activated_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists archived_at timestamptz;

update public.subscriptions s
set plan_snapshot = jsonb_build_object(
  'plan_id', p.id, 'version', p.version, 'title', p.title, 'price', p.price,
  'currency', p.currency, 'duration_days', p.duration_days,
  'sessions_included', p.sessions_included, 'billing_interval', p.billing_interval
)
from public.subscription_plans p
where p.id = s.plan_id and s.plan_snapshot is null;
alter table public.subscriptions alter column plan_snapshot set not null;

-- A ledger is accounting history. Parent removal must be rejected, never cascaded.
alter table public.subscription_credit_ledger
  drop constraint if exists subscription_credit_ledger_subscription_id_fkey;
alter table public.subscription_credit_ledger
  add constraint subscription_credit_ledger_subscription_id_fkey
  foreign key (subscription_id) references public.subscriptions(id) on delete restrict;

alter table public.subscription_credit_ledger
  add column if not exists operation text,
  add column if not exists source_type text,
  add column if not exists source_id uuid,
  add column if not exists idempotency_scope uuid,
  add column if not exists request_fingerprint text,
  add column if not exists reverses_ledger_id uuid references public.subscription_credit_ledger(id) on delete restrict;

update public.subscription_credit_ledger l
set operation = case when delta < 0 then 'consume' when idempotency_key like 'initial:%' or idempotency_key like 'backfill:%' then 'grant' else 'adjust' end,
    source_type = case when booking_id is null then 'admin' else 'booking' end,
    source_id = booking_id,
    idempotency_scope = coalesce(actor_id, (select s.user_id from public.subscriptions s where s.id = l.subscription_id)),
    request_fingerprint = md5(jsonb_build_object(
      'subscription_id', subscription_id, 'delta', delta, 'booking_id', booking_id,
      'reason', reason, 'key', idempotency_key
    )::text)
where operation is null or source_type is null or idempotency_scope is null or request_fingerprint is null;

alter table public.subscription_credit_ledger
  alter column operation set not null,
  alter column source_type set not null,
  alter column idempotency_scope set not null,
  alter column request_fingerprint set not null;
alter table public.subscription_credit_ledger
  add constraint subscription_credit_ledger_operation_check
  check (operation in ('grant','consume','reverse','expire','adjust'));

alter table public.subscription_credit_ledger
  drop constraint if exists subscription_credit_ledger_idempotency_key_key;
create unique index if not exists subscription_credit_ledger_scope_key_uidx
  on public.subscription_credit_ledger(idempotency_scope, idempotency_key);
drop index if exists public.bookings_subscription_credit_unique;
create unique index if not exists subscription_credit_one_consume_per_booking_uidx
  on public.subscription_credit_ledger(booking_id)
  where booking_id is not null and operation = 'consume';
create unique index if not exists subscription_credit_one_reverse_per_ledger_uidx
  on public.subscription_credit_ledger(reverses_ledger_id)
  where reverses_ledger_id is not null;

-- Ledger rows are append-only. Even service-role application code must use the RPC.
create or replace function public.reject_credit_ledger_mutation()
returns trigger language plpgsql set search_path = public as $$
begin
  raise exception using errcode = '55000', message = 'credit_ledger_is_immutable';
end;
$$;
drop trigger if exists subscription_credit_ledger_immutable on public.subscription_credit_ledger;
create trigger subscription_credit_ledger_immutable
before update or delete on public.subscription_credit_ledger
for each row execute function public.reject_credit_ledger_mutation();

create or replace function public.apply_subscription_credit(
  p_subscription_id uuid,
  p_delta int,
  p_booking_id uuid,
  p_reason text,
  p_actor_id uuid,
  p_idempotency_key text,
  p_operation text,
  p_source_type text,
  p_source_id uuid default null,
  p_reverses_ledger_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub public.subscriptions%rowtype;
  v_limit int;
  v_balance int;
  v_scope uuid;
  v_fingerprint text;
  v_existing public.subscription_credit_ledger%rowtype;
begin
  if p_delta = 0 or length(btrim(coalesce(p_reason,''))) < 2
     or length(btrim(coalesce(p_idempotency_key,''))) < 8
     or p_operation not in ('grant','consume','reverse','expire','adjust')
     or length(btrim(coalesce(p_source_type,''))) < 2 then
    raise exception using errcode = '22023', message = 'invalid_credit_adjustment';
  end if;

  select * into v_sub from public.subscriptions where id = p_subscription_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'subscription_not_found'; end if;
  v_scope := coalesce(p_actor_id, v_sub.user_id);
  v_fingerprint := md5(jsonb_build_object(
    'subscription_id', p_subscription_id, 'delta', p_delta, 'booking_id', p_booking_id,
    'reason', btrim(p_reason), 'operation', p_operation, 'source_type', btrim(p_source_type),
    'source_id', p_source_id, 'reverses', p_reverses_ledger_id
  )::text);

  perform pg_advisory_xact_lock(hashtextextended('credit:' || v_scope::text || ':' || p_idempotency_key, 0));
  select * into v_existing from public.subscription_credit_ledger
   where idempotency_scope = v_scope and idempotency_key = p_idempotency_key;
  if found then
    if v_existing.request_fingerprint <> v_fingerprint then
      raise exception using errcode = '23505', message = 'idempotency_conflict';
    end if;
    select coalesce(sum(delta),0) into v_balance from public.subscription_credit_ledger where subscription_id = v_existing.subscription_id;
    return jsonb_build_object('outcome','existing','balance',v_balance,'ledger_id',v_existing.id);
  end if;

  if p_delta < 0 and (v_sub.status <> 'active' or v_sub.starts_at > now() or v_sub.ends_at < now()) then
    raise exception using errcode = 'P0001', message = 'subscription_inactive';
  end if;
  v_limit := coalesce((v_sub.plan_snapshot->>'sessions_included')::int, 0);
  select coalesce(sum(delta),0) into v_balance from public.subscription_credit_ledger where subscription_id = v_sub.id;
  if v_balance + p_delta < 0 or v_balance + p_delta > v_limit then
    raise exception using errcode = '23514', message = 'credit_balance_out_of_range';
  end if;
  if p_reverses_ledger_id is not null and not exists (
    select 1 from public.subscription_credit_ledger x
    where x.id = p_reverses_ledger_id and x.subscription_id = p_subscription_id and x.delta = -p_delta
  ) then
    raise exception using errcode = '22023', message = 'invalid_credit_reversal';
  end if;

  insert into public.subscription_credit_ledger(
    subscription_id, booking_id, delta, reason, actor_id, idempotency_key,
    operation, source_type, source_id, idempotency_scope, request_fingerprint, reverses_ledger_id
  ) values (
    p_subscription_id, p_booking_id, p_delta, btrim(p_reason), p_actor_id, p_idempotency_key,
    p_operation, btrim(p_source_type), p_source_id, v_scope, v_fingerprint, p_reverses_ledger_id
  ) returning * into v_existing;

  v_balance := v_balance + p_delta;
  update public.subscriptions set sessions_used = greatest(0, v_limit - v_balance) where id = p_subscription_id;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta)
  values(p_actor_id,'subscription.credit_' || p_operation,'subscription',p_subscription_id::text,
    jsonb_build_object('delta',p_delta,'balance',v_balance,'booking_id',p_booking_id,'reason',p_reason,'ledger_id',v_existing.id));
  return jsonb_build_object('outcome','adjusted','balance',v_balance,'ledger_id',v_existing.id);
end;
$$;
revoke all on function public.apply_subscription_credit(uuid,int,uuid,text,uuid,text,text,text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.apply_subscription_credit(uuid,int,uuid,text,uuid,text,text,text,uuid,uuid) to service_role;

-- Keep the old service-only interface, but route it through fingerprint enforcement.
create or replace function public.adjust_subscription_credits(p_subscription_id uuid,p_delta int,p_booking_id uuid,p_reason text,p_actor_id uuid,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
  return public.apply_subscription_credit(
    p_subscription_id,p_delta,p_booking_id,p_reason,p_actor_id,p_idempotency_key,
    case when p_delta < 0 then 'consume' else 'adjust' end,
    case when p_booking_id is null then 'admin' else 'booking' end,
    p_booking_id,null
  );
end;
$$;
revoke all on function public.adjust_subscription_credits(uuid,int,uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function public.adjust_subscription_credits(uuid,int,uuid,text,uuid,text) to service_role;

-- Capacity, immutable plan snapshot, and opening credit are one transaction.
create or replace function public.create_managed_subscription(
  p_user_id uuid, p_plan_id uuid, p_status text, p_starts_at timestamptz,
  p_ends_at timestamptz, p_admin_notes text, p_actor_id uuid
)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_plan public.subscription_plans%rowtype; v_id uuid;
begin
  select * into v_plan from public.subscription_plans where id=p_plan_id and archived_at is null for update;
  if not found then raise exception using errcode='P0002',message='plan_not_found'; end if;
  if p_status not in ('pending','active') or p_ends_at<=p_starts_at then raise exception using errcode='22023',message='invalid_subscription'; end if;
  if p_status='active' and v_plan.max_subscribers is not null and
    (select count(*) from public.subscriptions where plan_id=p_plan_id and status='active' and ends_at>now()) >= v_plan.max_subscribers
  then raise exception using errcode='23514',message='plan_capacity_reached'; end if;
  insert into public.subscriptions(user_id,plan_id,status,starts_at,ends_at,auto_renew,admin_notes,plan_snapshot,activated_at)
  values(p_user_id,p_plan_id,p_status,p_starts_at,p_ends_at,false,coalesce(p_admin_notes,''),
    jsonb_build_object('plan_id',v_plan.id,'version',v_plan.version,'title',v_plan.title,'price',v_plan.price,'currency',v_plan.currency,'duration_days',v_plan.duration_days,'sessions_included',v_plan.sessions_included,'billing_interval',v_plan.billing_interval),
    case when p_status='active' then now() end)
  returning id into v_id;
  if p_status='active' and v_plan.sessions_included>0 then
    perform public.apply_subscription_credit(v_id,v_plan.sessions_included,null,'رصيد افتتاحي',p_actor_id,'initial:'||v_id::text,'grant','subscription',v_id,null);
  end if;
  return v_id;
end;
$$;
revoke all on function public.create_managed_subscription(uuid,uuid,text,timestamptz,timestamptz,text,uuid) from public,anon,authenticated;
grant execute on function public.create_managed_subscription(uuid,uuid,text,timestamptz,timestamptz,text,uuid) to service_role;

create or replace function public.set_subscription_status(p_subscription_id uuid,p_status text,p_actor_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_sub public.subscriptions%rowtype; v_plan public.subscription_plans%rowtype; v_credit jsonb;
begin
  select * into v_sub from public.subscriptions where id=p_subscription_id for update;
  if not found then raise exception using errcode='P0002',message='subscription_not_found'; end if;
  select * into v_plan from public.subscription_plans where id=v_sub.plan_id for update;
  if p_status not in ('pending','active','paused','cancelled','expired') then raise exception using errcode='22023',message='invalid_status'; end if;
  if p_status='active' and v_sub.status<>'active' then
    if v_plan.max_subscribers is not null and (select count(*) from public.subscriptions where plan_id=v_sub.plan_id and status='active' and id<>v_sub.id and ends_at>now()) >= v_plan.max_subscribers then
      raise exception using errcode='23514',message='plan_capacity_reached';
    end if;
    update public.subscriptions set status='active',activated_at=coalesce(activated_at,now()),cancelled_at=null where id=v_sub.id;
    if not exists(select 1 from public.subscription_credit_ledger where subscription_id=v_sub.id and operation='grant') and coalesce((v_sub.plan_snapshot->>'sessions_included')::int,0)>0 then
      v_credit:=public.apply_subscription_credit(v_sub.id,(v_sub.plan_snapshot->>'sessions_included')::int,null,'رصيد افتتاحي',p_actor_id,'initial:'||v_sub.id::text,'grant','subscription',v_sub.id,null);
    end if;
  else
    update public.subscriptions set status=p_status,cancelled_at=case when p_status='cancelled' then now() else cancelled_at end where id=v_sub.id;
  end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta) values(p_actor_id,'subscription.'||p_status,'subscription',v_sub.id::text,jsonb_build_object('previous',v_sub.status));
  return jsonb_build_object('status',p_status,'credit',v_credit);
end;
$$;
revoke all on function public.set_subscription_status(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.set_subscription_status(uuid,text,uuid) to service_role;

-- Cancelling a package booking restores exactly the consumed entry once.
create or replace function public.restore_package_credit_on_cancel()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_consume public.subscription_credit_ledger%rowtype;
begin
  if new.status='cancelled' and old.status<>'cancelled' and new.subscription_id is not null then
    select * into v_consume from public.subscription_credit_ledger
     where booking_id=new.id and operation='consume' order by created_at limit 1;
    if found then
      perform public.apply_subscription_credit(new.subscription_id,-v_consume.delta,new.id,'استرجاع إلغاء الحجز',
        coalesce(auth.uid(),new.user_id),'booking-cancel:'||new.id::text,'reverse','booking',new.id,v_consume.id);
      insert into public.booking_events(booking_id,actor_id,event,meta)
      values(new.id,coalesce(auth.uid(),new.user_id),'package_credit_restored',jsonb_build_object('consume_ledger_id',v_consume.id));
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists booking_package_credit_restore on public.bookings;
create trigger booking_package_credit_restore after update of status on public.bookings
for each row execute function public.restore_package_credit_on_cancel();

-- Package checkout validates ownership, eligibility, state and balance inside the transaction.
create or replace function public.create_package_booking(p_service_id uuid,p_date date,p_time time,p_full_name text,p_phone text,p_notes text,p_subscription_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_sub public.subscriptions%rowtype; v_result jsonb; v_booking uuid; v_order uuid; v_credit jsonb;
begin
  if v_user is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
  select * into v_sub from public.subscriptions where id=p_subscription_id and user_id=v_user for update;
  if not found then raise exception using errcode='P0002',message='PACKAGE_NOT_FOUND'; end if;
  if not exists(select 1 from public.subscription_plan_services where plan_id=v_sub.plan_id and service_id=p_service_id) then
    raise exception using errcode='22023',message='SERVICE_NOT_ELIGIBLE_FOR_PACKAGE';
  end if;
  v_result:=public.create_booking_order(p_service_id,p_date,p_time,p_full_name,p_phone,p_notes);
  v_booking:=(v_result->>'bookingId')::uuid; v_order:=(v_result->>'orderId')::uuid;
  v_credit:=public.apply_subscription_credit(p_subscription_id,-1,v_booking,'حجز جلسة من الباقة',v_user,
    'booking:'||v_booking::text||':consume','consume','booking',v_booking,null);
  update public.bookings set subscription_id=p_subscription_id where id=v_booking;
  update public.orders set status='paid',discount=subtotal,total=0,expires_at=null where id=v_order;
  insert into public.booking_events(booking_id,actor_id,event,meta) values(v_booking,v_user,'package_credit_consumed',jsonb_build_object('subscription_id',p_subscription_id,'ledger_id',v_credit->>'ledger_id'));
  return jsonb_build_object('bookingId',v_booking,'orderId',v_order,'total',0,'expiresAt',null,'packageBacked',true);
end;
$$;
revoke all on function public.create_package_booking(uuid,date,time,text,text,text,uuid) from public,anon;
grant execute on function public.create_package_booking(uuid,date,time,text,text,text,uuid) to authenticated;

