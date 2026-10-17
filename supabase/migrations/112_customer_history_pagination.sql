-- Complete customer history through bounded, audited, permissioned pages.
create function public.admin_customer_history_page(p_actor_id uuid,p_customer_id uuid,p_kind text default 'orders',p_query text default '',p_status text default 'all',p_page integer default 1,p_page_size integer default 25)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_query text:=btrim(coalesce(p_query,''));v_size integer:=greatest(1,least(100,coalesce(p_page_size,25)));v_total bigint;v_page integer;v_rows jsonb;
begin
 if p_actor_id is null or not coalesce(public.has_permission('users.view',p_actor_id),false) then raise exception using errcode='42501',message='users_view_permission_required';end if;
 if p_kind not in ('orders','payments','bookings','subscriptions','notes','tags','notifications') or length(v_query)>120 or v_query ~ '[[:cntrl:]]' or p_status !~ '^[a-z_]{1,60}$' then raise exception using errcode='22023',message='customer_history_query_invalid';end if;
 if not exists(select 1 from public.profiles where id=p_customer_id) then raise exception using errcode='P0002',message='customer_not_found';end if;
 with source as (
  select o.id,o.created_at,o.status,concat_ws(' ',o.id::text,o.status) search_text,jsonb_build_object('id',o.id,'created_at',o.created_at,'status',o.status,'total',o.total,'currency',o.currency) payload from public.orders o where p_kind='orders' and o.user_id=p_customer_id
  union all select pay.id,pay.created_at,pay.status,concat_ws(' ',pay.id::text,pay.method,pay.status),jsonb_build_object('id',pay.id,'created_at',pay.created_at,'status',pay.status,'amount',pay.amount,'currency',o.currency,'method',pay.method) from public.payments pay join public.orders o on o.id=pay.order_id where p_kind='payments' and o.user_id=p_customer_id
  union all select b.id,b.starts_at,b.status,concat_ws(' ',b.id::text,s.title,b.status),jsonb_build_object('id',b.id,'created_at',b.starts_at,'status',b.status,'title',s.title) from public.bookings b left join public.services s on s.id=b.service_id where p_kind='bookings' and b.user_id=p_customer_id
  union all select sub.id,sub.created_at,sub.status,concat_ws(' ',sub.id::text,sub.plan_snapshot->>'title',sub.status),jsonb_build_object('id',sub.id,'created_at',sub.created_at,'status',sub.status,'title',sub.plan_snapshot->>'title','ends_at',sub.ends_at) from public.subscriptions sub where p_kind='subscriptions' and sub.user_id=p_customer_id
  union all select n.id,n.created_at,case when n.archived_at is null then 'active' else 'archived' end,concat_ws(' ',n.id::text,n.note),jsonb_build_object('id',n.id,'created_at',n.created_at,'status',case when n.archived_at is null then 'active' else 'archived' end,'note',n.note,'archived_at',n.archived_at) from public.user_notes n where p_kind='notes' and n.user_id=p_customer_id
  union all select t.id,t.created_at,'active',concat_ws(' ',t.id::text,t.tag),jsonb_build_object('id',t.id,'created_at',t.created_at,'status','active','title',t.tag) from public.user_tags t where p_kind='tags' and t.user_id=p_customer_id
  union all select n.id,n.created_at,n.kind,concat_ws(' ',n.id::text,n.title,n.kind),jsonb_build_object('id',n.id,'created_at',n.created_at,'status',n.kind,'title',n.title) from public.notifications n where p_kind='notifications' and n.user_id=p_customer_id
 ),matching as materialized(select * from source where (p_status='all' or status=p_status) and (v_query='' or strpos(lower(search_text),lower(v_query))>0)),
 totals as(select count(*) n from matching),paging as(select greatest(1,least(greatest(1,coalesce(p_page,1)),greatest(1,ceil(n::numeric/v_size)::integer))) n from totals),
 rows as(select m.* from matching m order by m.created_at desc,m.id desc limit v_size offset(select (n-1)*v_size from paging))
 select totals.n,paging.n,coalesce((select jsonb_agg(payload order by created_at desc,id desc) from rows),'[]'::jsonb) into v_total,v_page,v_rows from totals cross join paging;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta) values(p_actor_id,'customer.history_page_viewed','customer',p_customer_id::text,jsonb_build_object('kind',p_kind,'searched',v_query<>'','resultCount',jsonb_array_length(v_rows),'page',v_page,'pageSize',v_size));
 return jsonb_build_object('rows',v_rows,'total',v_total,'page',v_page,'pageSize',v_size);
end $$;
revoke all on function public.admin_customer_history_page(uuid,uuid,text,text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.admin_customer_history_page(uuid,uuid,text,text,text,integer,integer) to service_role;
