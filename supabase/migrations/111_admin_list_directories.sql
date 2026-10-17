-- Read-only joined directories. RLS executes as the caller, not the view owner.
create view public.admin_order_directory with (security_invoker=true) as
 select o.id,o.user_id,o.status,o.total,o.created_at,p.full_name customer_name,p.email customer_email,
 coalesce(items.titles,array[]::text[]) product_titles,
 concat_ws(' ',o.id::text,p.full_name,p.email,items.search_titles) search_text
 from public.orders o left join public.profiles p on p.id=o.user_id
 left join lateral(select array_agg(coalesce(pr.title,'منتج محفوظ في الطلب') order by oi.id) titles,string_agg(pr.title,' ') search_titles from public.order_items oi left join public.products pr on pr.id=oi.product_id where oi.order_id=o.id) items on true;
create view public.admin_payment_directory with (security_invoker=true) as
 select pay.id,pay.order_id,pay.amount,pay.method,pay.status,pay.created_at,o.customer_name,o.customer_email,o.product_titles,
 exists(select 1 from public.payment_proofs proof where proof.payment_id=pay.id) proof_present,
 concat_ws(' ',pay.id::text,o.search_text,pay.method) search_text
 from public.payments pay join public.admin_order_directory o on o.id=pay.order_id;
revoke all on public.admin_order_directory,public.admin_payment_directory from public,anon,authenticated;
grant select on public.admin_order_directory,public.admin_payment_directory to authenticated,service_role;
create view public.admin_content_revision_directory with (security_invoker=true) as
 select r.*,concat_ws(' ',r.snapshot->>'title',r.snapshot->>'name',r.entity_id::text) search_text from public.content_revisions r where r.entity_type in ('page','page_section','article');
revoke all on public.admin_content_revision_directory from public,anon,authenticated;
grant select on public.admin_content_revision_directory to authenticated,service_role;

-- Customer reads remain service-only, permission checked and audited without query/PII.
create function public.admin_customer_directory_page(p_actor_id uuid,p_kind text default 'customers',p_query text default '',p_status text default 'all',p_page integer default 1,p_page_size integer default 25)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_query text:=btrim(coalesce(p_query,''));v_total bigint;v_page integer;v_size integer:=greatest(1,least(100,coalesce(p_page_size,25)));v_rows jsonb;
begin
 if not coalesce(public.has_permission('users.view',p_actor_id),false) then raise exception using errcode='42501',message='users_view_permission_required';end if;
 if length(v_query)>120 or v_query ~ '[[:cntrl:]]' or p_kind not in ('customers','deletions') then raise exception using errcode='22023',message='directory_query_invalid';end if;
 if p_kind='deletions' and p_status not in ('all','pending','in_review','awaiting_customer','approved_for_execution','completed','declined','cancelled') then raise exception using errcode='22023',message='directory_status_invalid';end if;
 -- The count and page use one statement snapshot, including concurrent inserts/deletes.
 if p_kind='customers' then
  with matching as materialized(select pr.id,pr.full_name,pr.email,pr.phone,pr.created_at from public.profiles pr where v_query='' or strpos(lower(concat_ws(' ',pr.full_name,pr.email)),lower(v_query))>0),
  totals as(select count(*) n from matching),paging as(select greatest(1,least(greatest(1,coalesce(p_page,1)),greatest(1,ceil(n::numeric/v_size)::integer))) n from totals),
  rows as(select m.* from matching m order by m.created_at desc,m.id desc limit v_size offset(select (n-1)*v_size from paging))
  select totals.n,paging.n,coalesce((select jsonb_agg(to_jsonb(rows) order by rows.created_at desc,rows.id desc) from rows),'[]'::jsonb) into v_total,v_page,v_rows from totals cross join paging;
 else
  with matching as materialized(select req.id,req.user_id customer_id,coalesce(pr.full_name,'') full_name,coalesce(pr.email,'') email,req.status,req.requested_at,req.updated_at,req.reviewed_at,(coalesce(req.review_note,'')<>'') note_present from public.account_deletion_requests req left join public.profiles pr on pr.id=req.user_id where (p_status='all' or req.status=p_status) and (v_query='' or strpos(lower(concat_ws(' ',pr.full_name,pr.email,req.id::text)),lower(v_query))>0)),
  totals as(select count(*) n from matching),paging as(select greatest(1,least(greatest(1,coalesce(p_page,1)),greatest(1,ceil(n::numeric/v_size)::integer))) n from totals),
  rows as(select m.* from matching m order by m.requested_at desc,m.id desc limit v_size offset(select (n-1)*v_size from paging))
  select totals.n,paging.n,coalesce((select jsonb_agg(to_jsonb(rows) order by rows.requested_at desc,rows.id desc) from rows),'[]'::jsonb) into v_total,v_page,v_rows from totals cross join paging;
 end if;
 insert into public.audit_logs(actor_id,action,entity_type,meta) values(p_actor_id,'customer.directory_page_viewed',case when p_kind='customers' then 'customer_directory' else 'account_deletion_queue' end,jsonb_build_object('searched',v_query<>'','resultCount',jsonb_array_length(v_rows),'page',v_page,'pageSize',v_size));
 return jsonb_build_object('rows',v_rows,'total',v_total,'page',v_page,'pageSize',v_size);
end $$;
revoke all on function public.admin_customer_directory_page(uuid,text,text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.admin_customer_directory_page(uuid,text,text,text,integer,integer) to service_role;

create view public.admin_subscription_directory with (security_invoker=true) as
 select sub.id,sub.user_id,sub.plan_id,sub.status,sub.starts_at,sub.ends_at,sub.plan_snapshot,sub.created_at,sub.archived_at,
 pr.full_name,pr.email,coalesce((select sum(l.delta) from public.subscription_credit_ledger l where l.subscription_id=sub.id),0) balance,
 concat_ws(' ',pr.full_name,pr.email,sub.plan_snapshot->>'title',sub.id::text) search_text
 from public.subscriptions sub left join public.profiles pr on pr.id=sub.user_id;
revoke all on public.admin_subscription_directory from public,anon,authenticated;
grant select on public.admin_subscription_directory to authenticated,service_role;
