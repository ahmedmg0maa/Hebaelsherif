-- 062: permission-rechecked manual payment review and truthful refund lifecycle.
-- LOCAL ONLY. Apply after 061 on authorized Staging with a verified recovery
-- point and schema fingerprint. Never apply to Production from this workspace.

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('pending_payment','awaiting_review','paid','refund_pending','expired','cancelled','refunded'));

alter table public.payment_refunds
  add column if not exists evidence_reference text,
  add column if not exists completed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists payment_refunds_updated on public.payment_refunds;
create trigger payment_refunds_updated before update on public.payment_refunds
  for each row execute function public.set_updated_at();

-- Customer commerce writes are supported only through create_product_order_v2
-- and submit_payment_proof_atomic. Admin mutations are supported only through
-- the service-only contracts in this migration.
drop policy if exists "orders: own create pending" on public.orders;
drop policy if exists "orders: admin update" on public.orders;
drop policy if exists "order_items: own insert" on public.order_items;
drop policy if exists "order_items: admin write" on public.order_items;
drop policy if exists "payments: own create pending" on public.payments;
drop policy if exists "payments: admin update" on public.payments;
drop policy if exists "payment_proofs: own insert" on public.payment_proofs;
drop policy if exists "refunds: permitted write" on public.payment_refunds;

revoke insert, update, delete on table public.orders from anon, authenticated;
revoke insert, update, delete on table public.order_items from anon, authenticated;
revoke insert, update, delete on table public.payments from anon, authenticated;
revoke insert, update, delete on table public.payment_proofs from anon, authenticated;
revoke insert, update, delete on table public.payment_refunds from anon, authenticated;

create or replace function public.get_payment_proof_for_review(
  p_actor_id uuid,
  p_payment_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.payments%rowtype;
  v_proof public.payment_proofs%rowtype;
begin
  if p_actor_id is null or not public.has_permission('payments.view', p_actor_id) then
    raise exception using errcode = '42501', message = 'payments_view_permission_required';
  end if;
  select * into v_payment from public.payments where id = p_payment_id;
  if not found then raise exception using errcode = 'P0002', message = 'payment_not_found'; end if;
  select * into v_proof
    from public.payment_proofs
   where payment_id = v_payment.id
   order by created_at desc
   limit 1;
  if not found then raise exception using errcode = 'P0002', message = 'payment_proof_not_found'; end if;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
  values (
    p_actor_id,
    'payment.proof_view_requested',
    'payment',
    v_payment.id::text,
    jsonb_build_object('proofId', v_proof.id, 'paymentStatus', v_payment.status, 'includesFinancialEvidence', true)
  );
  return jsonb_build_object('proofId', v_proof.id, 'storagePath', v_proof.storage_path);
end $$;

create or replace function public.confirm_payment_proof_review(
  p_actor_id uuid,
  p_payment_id uuid,
  p_proof_id uuid
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_actor_id is null or not public.has_permission('payments.view', p_actor_id) then
    raise exception using errcode = '42501', message = 'payments_view_permission_required';
  end if;
  if not exists (
    select 1
      from public.payment_proofs pp
      join public.payments p on p.id = pp.payment_id
     where pp.id = p_proof_id and p.id = p_payment_id
  ) then
    raise exception using errcode = 'P0002', message = 'payment_proof_not_found';
  end if;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
  values (
    p_actor_id,
    'payment.proof_reviewed',
    'payment',
    p_payment_id::text,
    jsonb_build_object('proofId', p_proof_id, 'includesFinancialEvidence', true, 'reviewWindowMinutes', 30)
  );
  return true;
end $$;

-- The 032 approval function remains the tested entitlement primitive. This
-- wrapper is its only service-role entry point: it rechecks the actor, locks the
-- payment/order, requires the authoritative awaiting-review state and proves a
-- customer-owned, order-scoped image row exists before delegating in the same
-- transaction.
create or replace function public.approve_payment_governed(
  p_actor_id uuid,
  p_payment_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.payments%rowtype;
  v_order public.orders%rowtype;
  v_proof public.payment_proofs%rowtype;
begin
  if p_actor_id is null or not public.has_permission('payments.approve', p_actor_id) then
    raise exception using errcode = '42501', message = 'payments_approve_permission_required';
  end if;
  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'payment_not_found'; end if;
  if v_payment.status = 'approved' then
    return jsonb_build_object('outcome', 'already_approved', 'order_id', v_payment.order_id);
  end if;
  if v_payment.status <> 'pending' then
    raise exception using errcode = 'P0001', message = 'payment_not_pending';
  end if;
  select * into v_order from public.orders where id = v_payment.order_id for update;
  if not found or v_order.status <> 'awaiting_review' then
    raise exception using errcode = 'P0001', message = 'order_not_reviewable';
  end if;
  select * into v_proof
    from public.payment_proofs
   where payment_id = v_payment.id
     and uploaded_by = v_order.user_id
     and storage_path ~ ('^' || v_order.user_id::text || '/' || v_order.id::text || '/[0-9a-fA-F-]{36}[.](png|jpg|webp)$')
   order by created_at desc
   limit 1
   for share;
  if not found then
    raise exception using errcode = '23514', message = 'payment_proof_required';
  end if;
  if not exists (
    select 1
      from public.audit_logs a
     where a.actor_id = p_actor_id
       and a.action = 'payment.proof_reviewed'
       and a.entity_type = 'payment'
       and a.entity_id = v_payment.id::text
       and a.meta->>'proofId' = v_proof.id::text
       and a.created_at >= now() - interval '30 minutes'
  ) then
    raise exception using errcode = '42501', message = 'payment_proof_review_required';
  end if;
  return public.approve_payment_atomic(p_payment_id, p_actor_id);
end $$;

create or replace function public.reject_payment_governed(
  p_actor_id uuid,
  p_payment_id uuid,
  p_reason text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.payments%rowtype;
  v_order public.orders%rowtype;
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  if p_actor_id is null or not public.has_permission('payments.reject', p_actor_id) then
    raise exception using errcode = '42501', message = 'payments_reject_permission_required';
  end if;
  if char_length(v_reason) not between 3 and 500
     or regexp_replace(v_reason, E'[\\r\\n\\t]', '', 'g') ~ '[[:cntrl:]]' then
    raise exception using errcode = '22023', message = 'invalid_reject_reason';
  end if;
  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'payment_not_found'; end if;
  if v_payment.status = 'rejected' then
    return jsonb_build_object('outcome', 'already_rejected', 'order_id', v_payment.order_id);
  end if;
  if v_payment.status <> 'pending' then
    raise exception using errcode = 'P0001', message = 'payment_not_pending';
  end if;
  select * into v_order from public.orders where id = v_payment.order_id for update;
  if not found or v_order.status <> 'awaiting_review' then
    raise exception using errcode = 'P0001', message = 'order_not_reviewable';
  end if;

  update public.payments
     set status = 'rejected', reviewed_by = p_actor_id, reviewed_at = now(), reject_reason = v_reason
   where id = v_payment.id;
  update public.orders set status = 'pending_payment' where id = v_order.id;
  insert into public.notifications(user_id, title, body, kind, link, created_by)
  values (
    v_order.user_id,
    'لم نتمكن من اعتماد إيصالك',
    'السبب: ' || v_reason || '. يمكنك رفع إيصال جديد من صفحة مدفوعاتك.',
    'warning',
    '/dashboard/payments',
    p_actor_id
  );
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
  values (
    p_actor_id,
    'payment.rejected',
    'payment',
    v_payment.id::text,
    jsonb_build_object('orderId', v_order.id, 'reasonLength', char_length(v_reason), 'reasonPresent', true)
  );
  return jsonb_build_object('outcome', 'rejected', 'order_id', v_order.id);
end $$;

create or replace function public.transition_order_governed(
  p_actor_id uuid,
  p_order_id uuid,
  p_status text,
  p_reason text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_status text := lower(btrim(coalesce(p_status, '')));
  v_reason text := btrim(coalesce(p_reason, ''));
begin
  if p_actor_id is null or not public.has_permission('orders.update', p_actor_id) then
    raise exception using errcode = '42501', message = 'orders_update_permission_required';
  end if;
  if v_status not in ('cancelled', 'expired') then
    raise exception using errcode = '22023', message = 'invalid_order_status';
  end if;
  if v_status = 'cancelled'
     and (char_length(v_reason) not between 3 and 500
       or regexp_replace(v_reason, E'[\\r\\n\\t]', '', 'g') ~ '[[:cntrl:]]') then
    raise exception using errcode = '22023', message = 'order_cancel_reason_invalid';
  end if;
  if v_status = 'expired' then v_reason := 'انتهاء مهلة الدفع'; end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'order_not_found'; end if;
  if v_order.status = v_status then
    return jsonb_build_object('outcome', 'already_' || v_status, 'previous', v_order.status);
  end if;
  if not (
    (v_status = 'cancelled' and v_order.status in ('pending_payment', 'awaiting_review'))
    or (v_status = 'expired' and v_order.status = 'pending_payment')
  ) then
    raise exception using errcode = 'P0001', message = 'invalid_order_transition';
  end if;

  update public.payments
     set status = 'cancelled', reviewed_by = p_actor_id, reviewed_at = now(), reject_reason = v_reason
   where order_id = v_order.id and status = 'pending';
  update public.orders set status = v_status where id = v_order.id;
  update public.bookings set status = 'cancelled'
   where order_id = v_order.id and status in ('pending', 'confirmed');
  insert into public.notifications(user_id, title, body, kind, link, created_by)
  values (
    v_order.user_id,
    case when v_status = 'cancelled' then 'أُلغي طلبك' else 'انتهت صلاحية طلبك' end,
    case when v_status = 'cancelled' then 'السبب: ' || v_reason else 'يمكنك إنشاء طلب جديد في أي وقت.' end,
    'warning',
    '/dashboard/orders',
    p_actor_id
  );
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
  values (
    p_actor_id,
    'order.' || v_status,
    'order',
    v_order.id::text,
    jsonb_build_object('previous', v_order.status, 'reasonLength', char_length(v_reason), 'reasonPresent', v_reason <> '')
  );
  return jsonb_build_object('outcome', v_status, 'previous', v_order.status);
end $$;

create or replace function public.manage_order_refund(
  p_actor_id uuid,
  p_order_id uuid,
  p_action text,
  p_reason text default null,
  p_evidence_reference text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_payment public.payments%rowtype;
  v_refund public.payment_refunds%rowtype;
  v_action text := lower(btrim(coalesce(p_action, '')));
  v_reason text := btrim(coalesce(p_reason, ''));
  v_evidence text := nullif(btrim(coalesce(p_evidence_reference, '')), '');
  v_released integer := 0;
begin
  if p_actor_id is null or not public.has_permission('orders.refund', p_actor_id) then
    raise exception using errcode = '42501', message = 'orders_refund_permission_required';
  end if;
  if v_action not in ('initiate', 'complete', 'fail') then
    raise exception using errcode = '22023', message = 'refund_action_invalid';
  end if;
  if v_action in ('initiate', 'fail')
     and (char_length(v_reason) not between 3 and 500
       or regexp_replace(v_reason, E'[\\r\\n\\t]', '', 'g') ~ '[[:cntrl:]]') then
    raise exception using errcode = '22023', message = 'refund_reason_invalid';
  end if;
  if v_action = 'complete'
     and (v_evidence is null or char_length(v_evidence) not between 3 and 120
       or v_evidence ~ '[[:cntrl:]]') then
    raise exception using errcode = '22023', message = 'refund_evidence_required';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'order_not_found'; end if;
  select * into v_payment
    from public.payments
   where order_id = v_order.id and status in ('approved', 'refunded')
   order by created_at desc
   limit 1
   for update;
  if not found then raise exception using errcode = 'P0002', message = 'approved_payment_not_found'; end if;
  select * into v_refund from public.payment_refunds where order_id = v_order.id for update;

  if v_action = 'initiate' then
    if v_order.status = 'refund_pending' and found and v_refund.status = 'processing' then
      return jsonb_build_object('outcome', 'already_processing', 'refundId', v_refund.id);
    end if;
    if v_order.status <> 'paid' then
      raise exception using errcode = 'P0001', message = 'order_not_refundable';
    end if;
    insert into public.payment_refunds(order_id, payment_id, amount, reason, status, created_by, evidence_reference, completed_at)
    values (v_order.id, v_payment.id, v_order.total, v_reason, 'processing', p_actor_id, null, null)
    on conflict (order_id) do update
      set payment_id = excluded.payment_id,
          amount = excluded.amount,
          reason = excluded.reason,
          status = 'processing',
          created_by = excluded.created_by,
          evidence_reference = null,
          completed_at = null
    returning * into v_refund;
    update public.orders set status = 'refund_pending' where id = v_order.id;
    insert into public.notifications(user_id, title, body, kind, link, created_by)
    values (v_order.user_id, 'بدأت معالجة الاسترداد', 'سنحدّث الحالة بعد تنفيذ إعادة المبلغ.', 'info', '/dashboard/orders', p_actor_id);
  elsif v_action = 'complete' then
    if v_order.status = 'refunded' and found and v_refund.status = 'completed' then
      return jsonb_build_object('outcome', 'already_completed', 'refundId', v_refund.id);
    end if;
    if v_order.status <> 'refund_pending' or not found or v_refund.status <> 'processing' then
      raise exception using errcode = 'P0001', message = 'refund_not_processing';
    end if;
    v_released := public.release_order_entitlements(v_order.id, p_actor_id, v_refund.reason);
    update public.payment_refunds
       set status = 'completed', evidence_reference = v_evidence, completed_at = now()
     where id = v_refund.id;
    update public.payments set status = 'refunded' where id = v_payment.id;
    update public.orders set status = 'refunded' where id = v_order.id;
    update public.bookings set status = 'cancelled'
     where order_id = v_order.id and status in ('pending', 'confirmed');
    insert into public.notifications(user_id, title, body, kind, link, created_by)
    values (v_order.user_id, 'اكتمل تسجيل الاسترداد', 'أُعيد المبلغ وسُحبت الاستحقاقات المرتبطة بهذا الطلب.', 'success', '/dashboard/orders', p_actor_id);
  else
    if v_order.status <> 'refund_pending' or not found or v_refund.status <> 'processing' then
      raise exception using errcode = 'P0001', message = 'refund_not_processing';
    end if;
    update public.payment_refunds set status = 'failed', reason = v_reason where id = v_refund.id;
    update public.orders set status = 'paid' where id = v_order.id;
    insert into public.notifications(user_id, title, body, kind, link, created_by)
    values (v_order.user_id, 'تعذّر إكمال الاسترداد', 'لم يتغير وصولك، وستتواصل الإدارة عند الحاجة.', 'warning', '/dashboard/orders', p_actor_id);
  end if;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, meta)
  values (
    p_actor_id,
    'refund.' || v_action,
    'order',
    v_order.id::text,
    jsonb_build_object(
      'refundId', v_refund.id,
      'fromOrderStatus', v_order.status,
      'reasonPresent', coalesce(v_reason, '') <> '' or coalesce(v_refund.reason, '') <> '',
      'evidencePresent', v_evidence is not null,
      'releasedEntitlements', v_released
    )
  );
  return jsonb_build_object('outcome', v_action, 'refundId', v_refund.id, 'releasedEntitlements', v_released);
end $$;

-- Remove direct service execution of the older functions. SECURITY DEFINER
-- function ownership still permits approve_payment_governed to use the 032
-- entitlement primitive internally in the same transaction.
revoke all on function public.approve_payment_atomic(uuid, uuid) from public, anon, authenticated, service_role;
revoke all on function public.reject_payment_atomic(uuid, uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.transition_order_atomic(uuid, uuid, text, text) from public, anon, authenticated, service_role;

revoke all on function public.get_payment_proof_for_review(uuid, uuid) from public, anon, authenticated;
revoke all on function public.confirm_payment_proof_review(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.approve_payment_governed(uuid, uuid) from public, anon, authenticated;
revoke all on function public.reject_payment_governed(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.transition_order_governed(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.manage_order_refund(uuid, uuid, text, text, text) from public, anon, authenticated;

grant execute on function public.get_payment_proof_for_review(uuid, uuid) to service_role;
grant execute on function public.confirm_payment_proof_review(uuid, uuid, uuid) to service_role;
grant execute on function public.approve_payment_governed(uuid, uuid) to service_role;
grant execute on function public.reject_payment_governed(uuid, uuid, text) to service_role;
grant execute on function public.transition_order_governed(uuid, uuid, text, text) to service_role;
grant execute on function public.manage_order_refund(uuid, uuid, text, text, text) to service_role;

comment on function public.get_payment_proof_for_review(uuid,uuid) is
  'Service-only payments.view proof lookup with financial-evidence access audit; storage path is returned only to the server action.';
comment on function public.confirm_payment_proof_review(uuid,uuid,uuid) is
  'Service-only confirmation recorded only after the server creates a signed review URL; payment approval requires the same actor/proof within thirty minutes.';
comment on function public.approve_payment_governed(uuid,uuid) is
  'Service-only permission-rechecked payment approval requiring an order-scoped proof before the atomic 032 entitlement grant.';
comment on function public.reject_payment_governed(uuid,uuid,text) is
  'Service-only permission-rechecked payment rejection with customer reason and content-free audit metadata.';
comment on function public.transition_order_governed(uuid,uuid,text,text) is
  'Service-only cancellation/expiry transition; refund state is exclusively managed by manage_order_refund.';
comment on function public.manage_order_refund(uuid,uuid,text,text,text) is
  'Service-only truthful refund lifecycle. Entitlements are retained while processing and revoked only after evidence-backed completion.';

-- Rollback-by-forward-fix: preserve orders, refunds, evidence references,
-- entitlements, notifications and audit history. Replace these functions in a
-- later migration; never restore browser-direct commerce writes.
