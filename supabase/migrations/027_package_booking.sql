-- 027: package-backed booking links one atomic credit consumption to one booking
alter table public.bookings add column if not exists subscription_id uuid references public.subscriptions(id) on delete set null;
create unique index if not exists bookings_subscription_credit_unique on public.bookings(subscription_id,id) where subscription_id is not null;

create or replace function public.create_package_booking(p_service_id uuid,p_date date,p_time time,p_full_name text,p_phone text,p_notes text,p_subscription_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_result jsonb; v_booking uuid; v_order uuid; v_credit jsonb;
begin
  if v_user is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.subscriptions where id=p_subscription_id and user_id=v_user) then raise exception using errcode='P0002',message='PACKAGE_NOT_FOUND'; end if;
  v_result:=public.create_booking_order(p_service_id,p_date,p_time,p_full_name,p_phone,p_notes);
  v_booking:=(v_result->>'bookingId')::uuid; v_order:=(v_result->>'orderId')::uuid;
  v_credit:=public.adjust_subscription_credits(p_subscription_id,-1,v_booking,'حجز جلسة من الباقة',v_user,'booking:'||v_booking::text||':consume');
  update public.bookings set subscription_id=p_subscription_id where id=v_booking;
  update public.orders set status='paid',discount=subtotal,total=0 where id=v_order;
  insert into public.booking_events(booking_id,actor_id,event,meta) values(v_booking,v_user,'package_credit_consumed',jsonb_build_object('subscription_id',p_subscription_id,'ledger_id',v_credit->>'ledger_id'));
  return jsonb_build_object('bookingId',v_booking,'orderId',v_order,'total',0,'expiresAt',null,'packageBacked',true);
end $$;
revoke all on function public.create_package_booking(uuid,date,time,text,text,text,uuid) from public,anon;
grant execute on function public.create_package_booking(uuid,date,time,text,text,text,uuid) to authenticated;
