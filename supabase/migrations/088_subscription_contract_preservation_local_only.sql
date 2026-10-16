-- LOCAL ONLY: freeze service eligibility for existing/future subscriptions.
-- Backfill captures eligibility at migration time; it cannot reconstruct older edits.
begin;
lock table public.subscription_plans in share row exclusive mode;
lock table public.subscriptions in share row exclusive mode;
update public.subscriptions s set plan_snapshot=s.plan_snapshot||jsonb_build_object('eligible_service_ids',
  (select coalesce(jsonb_agg(service_id order by service_id),'[]'::jsonb) from public.subscription_plan_services where plan_id=s.plan_id))
where not (s.plan_snapshot ? 'eligible_service_ids');

create or replace function public.freeze_subscription_services()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if TG_OP='INSERT' then
    perform 1 from public.subscription_plans where id=new.plan_id for share;
    new.plan_snapshot:=new.plan_snapshot||jsonb_build_object('eligible_service_ids',
      (select coalesce(jsonb_agg(service_id order by service_id),'[]'::jsonb) from public.subscription_plan_services where plan_id=new.plan_id));
  elsif new.plan_id is distinct from old.plan_id or new.plan_snapshot is distinct from old.plan_snapshot then
    raise exception 'subscription_contract_immutable';
  end if;
  return new;
end $$;
create trigger subscription_contract_frozen before insert or update on public.subscriptions for each row execute function public.freeze_subscription_services();
revoke all on function public.freeze_subscription_services() from public,anon,authenticated;

create or replace function public.admin_plan_active_counts(p_actor_id uuid,p_plan_ids uuid[])
returns jsonb language plpgsql security definer set search_path=public as $$
declare result jsonb;
begin
  if public.has_permission('packages.manage',p_actor_id) is not true then raise exception using errcode='42501',message='packages_permission_required';end if;
  if coalesce(array_length(p_plan_ids,1),0)>1000 then raise exception 'plan_ids_invalid';end if;
  select coalesce(jsonb_object_agg(plan_id,n),'{}'::jsonb) into result from (
    select plan_id,count(*) n from public.subscriptions where plan_id=any(p_plan_ids) and status='active' and archived_at is null and ends_at>now() group by plan_id
  ) counts;
  return result;
end $$;
revoke all on function public.admin_plan_active_counts(uuid,uuid[]) from public,anon,authenticated;
grant execute on function public.admin_plan_active_counts(uuid,uuid[]) to service_role;

create or replace function public.create_package_booking(p_service_id uuid,p_date date,p_time time,p_full_name text,p_phone text,p_notes text,p_subscription_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_sub public.subscriptions%rowtype; v_result jsonb; v_booking uuid; v_order uuid; v_credit jsonb;
begin
  if v_user is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
  select * into v_sub from public.subscriptions where id=p_subscription_id and user_id=v_user for update;
  if not found then raise exception using errcode='P0002',message='PACKAGE_NOT_FOUND'; end if;
  if not coalesce((v_sub.plan_snapshot->'eligible_service_ids') ? p_service_id::text,false) then
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
  delete from public.product_bundles where bundle_product_id=p_bundle_product_id;
  insert into public.product_bundles(bundle_product_id,child_product_id) select p_bundle_product_id,id from unnest(p_child_ids) id;
  if v_published and not public.program_product_ready(p_bundle_product_id) then raise exception using errcode='22023',message='published_bundle_not_ready';end if;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta) values(p_actor_id,'bundle.composition_updated','product',p_bundle_product_id::text,jsonb_build_object('childCount',v_count,'remainedPublished',v_published));
  return true;
end $$;
create or replace function public.protect_subscription_service_history()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if exists(select 1 from public.subscriptions where (plan_snapshot->'eligible_service_ids') ? old.id::text) then
    raise exception using errcode='23503',message='subscription_service_history_exists';
  end if;
  return old;
end $$;
create trigger service_subscription_history before delete on public.services for each row execute function public.protect_subscription_service_history();
revoke all on function public.protect_subscription_service_history() from public,anon,authenticated;
revoke all on function public.create_package_booking(uuid,date,time,text,text,text,uuid) from public,anon,authenticated;
commit;
