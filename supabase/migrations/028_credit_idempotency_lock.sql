-- 028: serialize identical credit idempotency keys before the uniqueness check
create or replace function public.adjust_subscription_credits(p_subscription_id uuid,p_delta int,p_booking_id uuid,p_reason text,p_actor_id uuid,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_sub public.subscriptions%rowtype; v_included int; v_balance int; v_existing public.subscription_credit_ledger%rowtype;
begin
  if p_delta=0 or length(btrim(coalesce(p_reason,'')))<2 or length(btrim(coalesce(p_idempotency_key,'')))<8 then raise exception using errcode='22023',message='invalid_credit_adjustment'; end if;
  perform pg_advisory_xact_lock(hashtextextended('credit-key:'||p_idempotency_key,0));
  select * into v_existing from public.subscription_credit_ledger where idempotency_key=p_idempotency_key;
  if found then select coalesce(sum(delta),0) into v_balance from public.subscription_credit_ledger where subscription_id=v_existing.subscription_id; return jsonb_build_object('outcome','existing','balance',v_balance,'ledger_id',v_existing.id); end if;
  select * into v_sub from public.subscriptions where id=p_subscription_id for update;
  if not found then raise exception using errcode='P0002',message='subscription_not_found'; end if;
  if p_delta<0 and (v_sub.status<>'active' or v_sub.starts_at>now() or v_sub.ends_at<now()) then raise exception using errcode='P0001',message='subscription_inactive'; end if;
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
