import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(path, 'utf8')
const migration = read('supabase/migrations/062_governed_manual_payment_and_refund_local_only.sql')
const actions = read('src/lib/actions/admin.ts')
const paymentControls = read('src/components/admin/ApprovalActions.tsx')
const orderControls = read('src/components/admin/OrderActions.tsx')
const paymentPage = read('src/app/admin/payments/page.tsx')
const orderPage = read('src/app/admin/orders/page.tsx')
const adminData = read('src/lib/data/admin.ts')
const customerOrders = read('src/app/dashboard/orders/page.tsx')
const customerPayments = read('src/app/dashboard/payments/page.tsx')

for (const token of [
  "public.has_permission('payments.view', p_actor_id)",
  "public.has_permission('payments.approve', p_actor_id)",
  "public.has_permission('payments.reject', p_actor_id)",
  "public.has_permission('orders.update', p_actor_id)",
  "public.has_permission('orders.refund', p_actor_id)",
  "set search_path = ''",
  "'payment.proof_view_requested'",
  "'payment.proof_reviewed'",
  'payment_proof_required',
  'payment_proof_review_required',
  "v_order.status <> 'awaiting_review'",
  "v_action not in ('initiate', 'complete', 'fail')",
  "update public.orders set status = 'refund_pending'",
  "set status = 'completed', evidence_reference = v_evidence, completed_at = now()",
  "v_released := public.release_order_entitlements",
  "update public.orders set status = 'paid'",
  'revoke insert, update, delete on table public.orders from anon, authenticated',
  'revoke insert, update, delete on table public.order_items from anon, authenticated',
  'revoke insert, update, delete on table public.payments from anon, authenticated',
  'revoke insert, update, delete on table public.payment_proofs from anon, authenticated',
  'grant execute on function public.manage_order_refund',
]) assert.ok(migration.includes(token), `missing commerce Admin governance contract: ${token}`)

assert.ok(
  migration.includes('revoke all on function public.approve_payment_atomic(uuid, uuid)')
    && migration.includes('revoke all on function public.reject_payment_atomic(uuid, uuid, text)')
    && migration.includes('revoke all on function public.transition_order_atomic(uuid, uuid, text, text)'),
  'older service-role payment/order mutation entry points must be retired',
)
assert.ok(
  migration.indexOf("update public.orders set status = 'refund_pending'")
    < migration.indexOf('v_released := public.release_order_entitlements'),
  'refund initiation must precede and remain separate from evidence-backed entitlement release',
)
assert.ok(
  migration.includes("if v_action = 'complete'") && migration.includes('refund_evidence_required')
    && migration.includes("if v_action in ('initiate', 'fail')"),
  'completion must require execution evidence while initiation/failure require a reason',
)
assert.ok(
  !migration.includes("jsonb_build_object('reason', v_reason")
    && migration.includes("'reasonLength', char_length(v_reason)")
    && migration.includes("'evidencePresent', v_evidence is not null"),
  'reason/evidence content must not be copied into audit metadata',
)

for (const rpc of [
  "rpc('get_payment_proof_for_review'",
  "rpc('confirm_payment_proof_review'",
  "rpc('approve_payment_governed'",
  "rpc('reject_payment_governed'",
  "rpc('transition_order_governed'",
  "rpc('manage_order_refund'",
]) assert.ok(actions.includes(rpc), `Admin actions must use governed RPC: ${rpc}`)
assert.ok(!actions.includes("rpc('approve_payment_atomic'") && !actions.includes("rpc('transition_order_atomic'"), 'Admin actions must not call retired commerce RPCs')
assert.ok(actions.includes("requireFreshAdminAssurance('orders.refund')"), 'refund lifecycle must require fresh MFA')

assert.ok(paymentPage.includes("requirePermission('payments.approve')") && paymentPage.includes("requirePermission('payments.reject')"), 'payment controls must be rendered from actual permissions')
assert.ok(paymentControls.includes('canApprove &&') && paymentControls.includes('canReject &&') && paymentControls.includes('disabled={busy || !hasProof || !reviewed}'), 'approval/rejection controls must be truthful and proof-review-aware')
assert.ok(orderPage.includes("requirePermission('orders.update')") && orderPage.includes("requirePermission('orders.refund')"), 'order controls must be rendered from actual permissions')
assert.ok(orderControls.includes("refund('initiate')") && orderControls.includes("refund('complete')") && orderControls.includes("refund('fail')"), 'Admin must operate the complete truthful refund lifecycle')
assert.ok(orderControls.includes('هل أُعيد المبلغ فعلًا؟') && orderControls.includes('مرجع إعادة المبلغ'), 'refund completion must require explicit confirmation and evidence')

assert.ok(adminData.includes('payment_proofs(id)') && !adminData.includes('payment_proofs(storage_path)'), 'payment queue must expose proof presence, not Storage paths')
assert.ok(adminData.includes("throw new Error('ADMIN_PAYMENT_QUEUE_READ_UNAVAILABLE')") && adminData.includes("throw new Error('ADMIN_ORDER_LIST_READ_UNAVAILABLE')"), 'configured commerce read failures must fail closed')
assert.ok(customerOrders.includes('customerOrderState') && readFileSync('src/lib/customer-order-state.ts','utf8').includes('refund_pending') && customerPayments.includes('الاسترداد قيد التنفيذ') && customerPayments.includes('يظل الوصول فعالًا'), 'customer Dashboard must distinguish processing from completed refunds')

console.log('verify:commerce-admin-governance-local passed — permission-rechecked payment review, audited proof access, direct-write denial and evidence-backed refund lifecycle verified')
