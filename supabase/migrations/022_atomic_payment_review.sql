-- 022: transactional, idempotent payment approval/rejection and access grants
create or replace function public.approve_payment_atomic(p_payment_id uuid, p_actor_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
  v_order public.orders%rowtype;
  v_grants integer := 0;
begin
  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'payment_not_found'; end if;
  if v_payment.status = 'approved' then
    return jsonb_build_object('outcome', 'already_approved', 'order_id', v_payment.order_id);
  end if;
  if v_payment.status <> 'pending' then raise exception using errcode = 'P0001', message = 'payment_not_pending'; end if;

  select * into v_order from public.orders where id = v_payment.order_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'order_not_found'; end if;
  if v_order.status not in ('awaiting_review', 'pending_payment') then raise exception using errcode = 'P0001', message = 'order_not_reviewable'; end if;
  if v_payment.user_id <> v_order.user_id or v_payment.amount <> v_order.total then raise exception using errcode = '23514', message = 'payment_order_mismatch'; end if;

  update public.payments set status = 'approved', reviewed_by = p_actor_id, reviewed_at = now(), reject_reason = null where id = p_payment_id;
  update public.orders set status = 'paid' where id = v_order.id;

  with target_products as (
    select oi.product_id from public.order_items oi where oi.order_id = v_order.id
    union
    select pb.child_product_id
    from public.order_items oi join public.product_bundles pb on pb.bundle_product_id = oi.product_id
    where oi.order_id = v_order.id
  )
  insert into public.content_access(user_id, product_id, source, order_id, granted_by)
  select v_order.user_id, product_id, 'purchase', v_order.id, p_actor_id from target_products
  on conflict(user_id, product_id) do update set source = excluded.source, order_id = excluded.order_id, granted_by = excluded.granted_by;
  get diagnostics v_grants = row_count;

  with target_products as (
    select oi.product_id from public.order_items oi where oi.order_id = v_order.id
    union select pb.child_product_id from public.order_items oi join public.product_bundles pb on pb.bundle_product_id = oi.product_id where oi.order_id = v_order.id
  )
  insert into public.course_enrollments(user_id, course_id, source)
  select v_order.user_id, c.id, 'purchase' from public.courses c join target_products t on t.product_id = c.product_id
  on conflict(user_id, course_id) do update set source = excluded.source;

  with target_products as (
    select oi.product_id from public.order_items oi where oi.order_id = v_order.id
    union select pb.child_product_id from public.order_items oi join public.product_bundles pb on pb.bundle_product_id = oi.product_id where oi.order_id = v_order.id
  )
  insert into public.book_access(user_id, book_id, order_id)
  select v_order.user_id, b.id, v_order.id from public.books b join target_products t on t.product_id = b.product_id
  on conflict(user_id, book_id) do update set order_id = excluded.order_id;

  with target_products as (
    select oi.product_id from public.order_items oi where oi.order_id = v_order.id
    union select pb.child_product_id from public.order_items oi join public.product_bundles pb on pb.bundle_product_id = oi.product_id where oi.order_id = v_order.id
  )
  insert into public.workshop_registrations(workshop_id, user_id, order_id, status)
  select w.id, v_order.user_id, v_order.id, 'registered' from public.workshops w join target_products t on t.product_id = w.product_id
  on conflict(workshop_id, user_id) do update set order_id = excluded.order_id, status = 'registered';

  if v_order.coupon_id is not null and not exists (select 1 from public.coupon_redemptions where order_id = v_order.id) then
    insert into public.coupon_redemptions(coupon_id, user_id, order_id) values(v_order.coupon_id, v_order.user_id, v_order.id);
  end if;

  insert into public.notifications(user_id, title, body, kind, link)
  values(v_order.user_id, 'تم اعتماد دفعتك 🎉', 'فُعّل وصولك لمشترياتك — استمتعي برحلتك.', 'success', '/dashboard');
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
  values(p_actor_id, 'payment.approved', 'payment', p_payment_id::text, jsonb_build_object('order_id', v_order.id, 'amount', v_payment.amount, 'grants', v_grants));

  return jsonb_build_object('outcome', 'approved', 'order_id', v_order.id, 'grants', v_grants);
end $$;

create or replace function public.reject_payment_atomic(p_payment_id uuid, p_actor_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
  v_order public.orders%rowtype;
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  if char_length(v_reason) < 3 or char_length(v_reason) > 500 then raise exception using errcode = '22023', message = 'invalid_reject_reason'; end if;
  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'payment_not_found'; end if;
  if v_payment.status = 'rejected' then
    return jsonb_build_object('outcome', 'already_rejected', 'order_id', v_payment.order_id);
  end if;
  if v_payment.status <> 'pending' then raise exception using errcode = 'P0001', message = 'payment_not_pending'; end if;
  select * into v_order from public.orders where id = v_payment.order_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'order_not_found'; end if;

  update public.payments set status = 'rejected', reviewed_by = p_actor_id, reviewed_at = now(), reject_reason = v_reason where id = p_payment_id;
  update public.orders set status = 'pending_payment' where id = v_order.id and status in ('awaiting_review', 'pending_payment');
  insert into public.notifications(user_id, title, body, kind, link)
  values(v_order.user_id, 'لم نتمكن من اعتماد إيصالك', 'السبب: ' || v_reason || '. يمكنك رفع إيصال جديد من صفحة مدفوعاتك.', 'warning', '/dashboard/payments');
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
  values(p_actor_id, 'payment.rejected', 'payment', p_payment_id::text, jsonb_build_object('order_id', v_order.id, 'reason', v_reason));
  return jsonb_build_object('outcome', 'rejected', 'order_id', v_order.id);
end $$;

revoke all on function public.approve_payment_atomic(uuid, uuid) from public, anon, authenticated;
revoke all on function public.reject_payment_atomic(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.approve_payment_atomic(uuid, uuid) to service_role;
grant execute on function public.reject_payment_atomic(uuid, uuid, text) to service_role;
