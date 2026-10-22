-- 026: multiple non-overlapping availability windows and auditable subscription credits
drop index if exists public.availability_rules_service_weekday_uidx;
create unique index if not exists availability_rules_exact_unique on public.availability_rules(service_id,weekday,start_time,end_time);

create or replace function public.guard_availability_window_overlap() returns trigger language plpgsql set search_path=public as $$
begin
  if new.start_time>=new.end_time then raise exception using errcode='22023',message='invalid_availability_window'; end if;
  if exists(select 1 from public.availability_rules r where r.service_id=new.service_id and r.weekday=new.weekday and r.id<>coalesce(new.id,'00000000-0000-0000-0000-000000000000'::uuid) and r.start_time<new.end_time and r.end_time>new.start_time) then
    raise exception using errcode='23P01',message='availability_window_overlap';
  end if;
  return new;
end $$;
drop trigger if exists availability_window_overlap on public.availability_rules;
create trigger availability_window_overlap before insert or update on public.availability_rules for each row execute function public.guard_availability_window_overlap();

create table if not exists public.subscription_credit_ledger(
  id uuid primary key default gen_random_uuid(), subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null, delta int not null check(delta<>0), reason text not null,
  actor_id uuid references auth.users(id) on delete set null, idempotency_key text not null unique, created_at timestamptz not null default now()
);
create index if not exists subscription_credit_ledger_subscription_idx on public.subscription_credit_ledger(subscription_id,created_at);
alter table public.subscription_credit_ledger enable row level security;
create policy "credit ledger: own read" on public.subscription_credit_ledger for select using(exists(select 1 from public.subscriptions s where s.id=subscription_id and (s.user_id=auth.uid() or public.has_permission('packages.manage'))));
create policy "credit ledger: permitted write" on public.subscription_credit_ledger for all using(public.has_permission('packages.manage')) with check(public.has_permission('packages.manage'));

insert into public.subscription_credit_ledger(subscription_id,delta,reason,idempotency_key)
select s.id,greatest(1,p.sessions_included-s.sessions_used),'رصيد افتتاحي مرحّل','backfill:'||s.id::text from public.subscriptions s join public.subscription_plans p on p.id=s.plan_id
where p.sessions_included-s.sessions_used>0 and not exists(select 1 from public.subscription_credit_ledger l where l.subscription_id=s.id);

create or replace function public.adjust_subscription_credits(p_subscription_id uuid,p_delta int,p_booking_id uuid,p_reason text,p_actor_id uuid,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_sub public.subscriptions%rowtype; v_included int; v_balance int; v_existing public.subscription_credit_ledger%rowtype;
begin
  if p_delta=0 or length(btrim(coalesce(p_reason,'')))<2 or length(btrim(coalesce(p_idempotency_key,'')))<8 then raise exception using errcode='22023',message='invalid_credit_adjustment'; end if;
  select * into v_existing from public.subscription_credit_ledger where idempotency_key=p_idempotency_key;
  if found then select coalesce(sum(delta),0) into v_balance from public.subscription_credit_ledger where subscription_id=v_existing.subscription_id; return jsonb_build_object('outcome','existing','balance',v_balance,'ledger_id',v_existing.id); end if;
  select * into v_sub from public.subscriptions where id=p_subscription_id for update;
  if not found then raise exception using errcode='P0002',message='subscription_not_found'; end if;
  if v_sub.status<>'active' or v_sub.starts_at>now() or v_sub.ends_at<now() then raise exception using errcode='P0001',message='subscription_inactive'; end if;
  select sessions_included into v_included from public.subscription_plans where id=v_sub.plan_id;
  select coalesce(sum(delta),0) into v_balance from public.subscription_credit_ledger where subscription_id=v_sub.id;
  if v_balance+p_delta<0 or v_balance+p_delta>v_included then raise exception using errcode='23514',message='credit_balance_out_of_range'; end if;
  insert into public.subscription_credit_ledger(subscription_id,booking_id,delta,reason,actor_id,idempotency_key) values(v_sub.id,p_booking_id,p_delta,btrim(p_reason),p_actor_id,p_idempotency_key) returning * into v_existing;
  v_balance:=v_balance+p_delta;
  update public.subscriptions set sessions_used=v_included-v_balance where id=v_sub.id;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta) values(p_actor_id,'subscription.credit_adjusted','subscription',v_sub.id::text,jsonb_build_object('delta',p_delta,'balance',v_balance,'booking_id',p_booking_id,'reason',p_reason));
  return jsonb_build_object('outcome','adjusted','balance',v_balance,'ledger_id',v_existing.id);
end $$;
revoke all on function public.adjust_subscription_credits(uuid,int,uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function public.adjust_subscription_credits(uuid,int,uuid,text,uuid,text) to service_role;
