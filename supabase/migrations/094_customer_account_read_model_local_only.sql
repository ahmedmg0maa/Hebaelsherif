-- LOCAL ONLY. Customer projection: no admin notes, private paths or other users' contracts.
begin;
create or replace function public.my_subscription_account(p_page integer default 1)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid(); v_total bigint; v_rows jsonb;
begin
  if v_user is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_page is null or p_page<1 or p_page>100000 then raise exception 'Invalid page' using errcode='22023'; end if;
  select count(*) into v_total from public.subscriptions where user_id=v_user;
  select coalesce(jsonb_agg(row_data order by created_at desc,id desc),'[]'::jsonb) into v_rows from (
    select s.id,s.created_at,jsonb_build_object(
      'id',s.id,'status',s.status,'startsAt',s.starts_at,'endsAt',s.ends_at,'archivedAt',s.archived_at,'orderId',s.order_id,
      'title',coalesce(s.plan_snapshot->>'title','باقة جلسات'),'sessionsIncluded',coalesce((s.plan_snapshot->>'sessions_included')::integer,0),
      'balance',coalesce((select sum(l.delta) from public.subscription_credit_ledger l where l.subscription_id=s.id),0),
      'eligibleServices',coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'title',v.title) order by v.title,v.id)
        from public.services v where coalesce(s.plan_snapshot->'eligible_service_ids','[]'::jsonb) ? v.id::text),'[]'::jsonb)
    ) row_data from public.subscriptions s where s.user_id=v_user order by s.created_at desc,s.id desc limit 20 offset (p_page-1)*20
  ) page_rows;
  return jsonb_build_object('total',v_total,'items',v_rows);
end $$;
revoke all on function public.my_subscription_account(integer) from public,anon,service_role;
grant execute on function public.my_subscription_account(integer) to authenticated;
commit;
