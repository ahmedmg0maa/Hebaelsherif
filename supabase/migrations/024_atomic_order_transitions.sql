-- 024: transactional cancel/refund/expiry with access reconciliation
create or replace function public.transition_order_atomic(p_order_id uuid, p_actor_id uuid, p_status text, p_reason text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_order public.orders%rowtype; v_allowed boolean:=false; v_reason text:=nullif(btrim(coalesce(p_reason,'')),'');
begin
  if p_status not in ('cancelled','refunded','expired') then raise exception using errcode='22023',message='invalid_order_status'; end if;
  select * into v_order from public.orders where id=p_order_id for update;
  if not found then raise exception using errcode='P0002',message='order_not_found'; end if;
  if v_order.status=p_status then return jsonb_build_object('outcome','already_'||p_status,'previous',v_order.status); end if;
  v_allowed := (p_status='cancelled' and v_order.status in ('pending_payment','awaiting_review'))
    or (p_status='expired' and v_order.status='pending_payment')
    or (p_status='refunded' and v_order.status='paid');
  if not v_allowed then raise exception using errcode='P0001',message='invalid_order_transition'; end if;
  update public.orders set status=p_status where id=p_order_id;
  if p_status in ('cancelled','refunded') then update public.bookings set status='cancelled' where order_id=p_order_id and status in ('pending','confirmed'); end if;
  if p_status='refunded' then
    delete from public.content_access where order_id=p_order_id;
    delete from public.book_access where order_id=p_order_id;
    delete from public.workshop_registrations where order_id=p_order_id;
    delete from public.course_enrollments ce using public.courses c
      where ce.course_id=c.id and ce.user_id=v_order.user_id
        and c.product_id in (select oi.product_id from public.order_items oi where oi.order_id=p_order_id union select pb.child_product_id from public.order_items oi join public.product_bundles pb on pb.bundle_product_id=oi.product_id where oi.order_id=p_order_id)
        and not exists(select 1 from public.content_access ca where ca.user_id=v_order.user_id and ca.product_id=c.product_id);
  end if;
  insert into public.notifications(user_id,title,body,kind,link) values(v_order.user_id,
    case p_status when 'cancelled' then 'أُلغي طلبك' when 'refunded' then 'تم تسجيل استرداد طلبك' else 'انتهت صلاحية طلبك' end,
    case p_status when 'cancelled' then coalesce('السبب: '||v_reason,'راسِلينا إذا كان لديك استفسار.') when 'refunded' then 'تم إلغاء الوصول المرتبط بهذا الطلب وتسجيل الاسترداد.' else 'يمكنك إنشاء طلب جديد في أي وقت.' end,
    'warning','/dashboard/orders');
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,meta) values(p_actor_id,'order.'||p_status,'order',p_order_id::text,jsonb_build_object('previous',v_order.status,'reason',v_reason));
  return jsonb_build_object('outcome',p_status,'previous',v_order.status);
end $$;
revoke all on function public.transition_order_atomic(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.transition_order_atomic(uuid,uuid,text,text) to service_role;
