import { createClient } from '@supabase/supabase-js'
import { getSupabasePublicConfig } from './public-config.mjs'

const { url, key: publicKey } = getSupabasePublicConfig()
const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
if (!serviceKey) throw new Error('Supabase service configuration is missing')
const service = createClient(url, serviceKey, { auth: { persistSession: false } })
const anon = createClient(url, publicKey, { auth: { persistSession: false } })
const marker = crypto.randomUUID()
const password = `T!${crypto.randomUUID()}a9`
const proofPaths = []
const proofIntentIds = []
let userId, productId, bundleProductId, variantId, courseId, approvedOrderId, approvedPaymentId, rejectedOrderId, rejectedPaymentId

async function createOrderAndPayment(status = 'awaiting_review') {
  const { data: order, error: orderError } = await service.from('orders').insert({ user_id: userId, status, subtotal: 125, discount: 0, total: 125, currency: 'EGP', expires_at: new Date(Date.now() + 86_400_000).toISOString() }).select('id').single()
  if (orderError) throw orderError
  const { error: itemError } = await service.from('order_items').insert({ order_id: order.id, product_id: productId, quantity: 1, unit_price: 125, total: 125 })
  if (itemError) throw itemError
  const { data: payment, error: paymentError } = await service.from('payments').insert({ order_id: order.id, user_id: userId, method: 'instapay', amount: 125, status: 'pending' }).select('id').single()
  if (paymentError) throw paymentError
  return { orderId: order.id, paymentId: payment.id }
}

try {
  const { data: owner } = await service.from('admin_roles').select('user_id').eq('role', 'owner').limit(1).single()
  const email = `commerce-${marker}@example.invalid`
  const { data: created, error: userError } = await service.auth.admin.createUser({ email, password, email_confirm: true })
  if (userError || !created.user) throw userError ?? new Error('Could not create test user')
  userId = created.user.id
  const { data: product, error: productError } = await service.from('products').insert({ type: 'course', slug: `commerce-${marker}`, title: 'Atomic commerce verification', subtitle: 'Controlled test course', description: 'Disposable governed commerce verification product for the isolated Staging test only.', price: 125, currency: 'EGP', is_published: true }).select('id').single()
  if (productError) throw productError
  productId = product.id
  const { data: course, error: courseError } = await service.from('courses').insert({ product_id: productId, slug: `commerce-${marker}`, title: 'Atomic commerce verification', is_published: true }).select('id').single()
  if (courseError) throw courseError
  courseId = course.id
  const { data: bundle, error: bundleError } = await service.from('products').insert({ type: 'bundle', slug: `bundle-${marker}`, title: 'Atomic bundle verification', subtitle: 'Controlled bundle test', description: 'Disposable governed bundle used only for isolated checkout concurrency verification.', price: 140, currency: 'EGP', is_published: true }).select('id').single()
  if (bundleError) throw bundleError
  bundleProductId = bundle.id
  const { error: childError } = await service.from('product_bundles').insert({ bundle_product_id: bundleProductId, child_product_id: productId })
  if (childError) throw childError
  const { data: variant, error: variantError } = await service.from('product_variants').insert({ product_id: bundleProductId, name: 'Premium', price: 150, is_active: true }).select('id').single()
  if (variantError) throw variantError
  variantId = variant.id

  const customer = createClient(url, publicKey, { auth: { persistSession: false } })
  const { error: signInError } = await customer.auth.signInWithPassword({ email, password })
  if (signInError) throw signInError
  const checkoutRequestId = crypto.randomUUID()
  const concurrentOrders = await Promise.all([
    service.rpc('create_product_order_v3', { p_actor_id: userId, p_product_id: bundleProductId, p_variant_id: variantId, p_coupon_code: '', p_method: 'instapay', p_request_id: checkoutRequestId }),
    service.rpc('create_product_order_v3', { p_actor_id: userId, p_product_id: bundleProductId, p_variant_id: variantId, p_coupon_code: '', p_method: 'instapay', p_request_id: checkoutRequestId }),
  ])
  if (concurrentOrders.some((result) => result.error)) throw concurrentOrders.find((result) => result.error).error
  const orderOutcomes = concurrentOrders.map((result) => result.data?.outcome).sort()
  if (orderOutcomes.join(',') !== 'created,existing') throw new Error(`Unexpected checkout outcomes: ${orderOutcomes.join(',')}`)
  approvedOrderId = concurrentOrders[0].data.order_id
  if (approvedOrderId !== concurrentOrders[1].data.order_id) throw new Error('Checkout idempotency returned different orders')
  const { data: variantItem } = await service.from('order_items').select('variant_id, total').eq('order_id', approvedOrderId).single()
  if (variantItem.variant_id !== variantId || Number(variantItem.total) !== 150) throw new Error('Variant price was not authoritative in checkout')

  const proofBody = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex')
  for (let index = 0; index < 2; index += 1) {
    const requestId = crypto.randomUUID()
    const { data: intent, error: intentError } = await service.rpc('begin_payment_proof_upload_intent', {
      p_actor_id: userId, p_order_id: approvedOrderId, p_method: 'instapay',
      p_declared_mime: 'image/png', p_declared_size: proofBody.length, p_request_id: requestId,
    })
    if (intentError || !intent?.intentId || !intent?.storagePath) throw intentError ?? new Error('Proof intent was not issued')
    proofIntentIds.push(intent.intentId); proofPaths.push(intent.storagePath)
    const { error } = await service.storage.from('payment-proofs').upload(intent.storagePath, proofBody, { contentType: 'image/png' })
    if (error) throw error
  }
  const concurrentProofs = await Promise.all([
    service.rpc('complete_payment_proof_upload_intent', { p_actor_id: userId, p_intent_id: proofIntentIds[0], p_storage_path: proofPaths[0], p_observed_mime: 'image/png', p_observed_size: proofBody.length, p_magic_valid: true }),
    service.rpc('complete_payment_proof_upload_intent', { p_actor_id: userId, p_intent_id: proofIntentIds[1], p_storage_path: proofPaths[1], p_observed_mime: 'image/png', p_observed_size: proofBody.length, p_magic_valid: true }),
  ])
  if (concurrentProofs.some((result) => result.error)) throw concurrentProofs.find((result) => result.error).error
  const proofOutcomes = concurrentProofs.map((result) => result.data?.outcome).sort()
  if (proofOutcomes.join(',') !== 'existing,submitted') throw new Error(`Unexpected proof outcomes: ${proofOutcomes.join(',')}`)
  approvedPaymentId = concurrentProofs[0].data.paymentId
  if (approvedPaymentId !== concurrentProofs[1].data.paymentId) throw new Error('Proof idempotency returned different payments')
  const { data: reviewProof, error: reviewProofError } = await service.rpc('get_payment_proof_for_review', { p_actor_id: owner.user_id, p_payment_id: approvedPaymentId })
  if (reviewProofError || !reviewProof?.storagePath || !reviewProof?.proofId) throw reviewProofError ?? new Error('Governed proof lookup failed')
  const { error: signedReviewError } = await service.storage.from('payment-proofs').createSignedUrl(reviewProof.storagePath, 60)
  if (signedReviewError) throw signedReviewError
  const { error: confirmReviewError } = await service.rpc('confirm_payment_proof_review', { p_actor_id: owner.user_id, p_payment_id: approvedPaymentId, p_proof_id: reviewProof.proofId })
  if (confirmReviewError) throw confirmReviewError
  const concurrentApprovals = await Promise.all([
    service.rpc('approve_payment_governed', { p_payment_id: approvedPaymentId, p_actor_id: owner.user_id }),
    service.rpc('approve_payment_governed', { p_payment_id: approvedPaymentId, p_actor_id: owner.user_id }),
  ])
  if (concurrentApprovals.some((result) => result.error)) throw concurrentApprovals.find((result) => result.error).error
  const outcomes = concurrentApprovals.map((result) => result.data?.outcome).sort()
  if (outcomes.join(',') !== 'already_approved,approved') throw new Error(`Unexpected approval outcomes: ${outcomes.join(',')}`)
  const [{ data: approvedPayment }, { data: paidOrder }, { count: accessCount }, { count: enrollmentCount }, { count: approvalAuditCount }] = await Promise.all([
    service.from('payments').select('status').eq('id', approvedPaymentId).single(),
    service.from('orders').select('status').eq('id', approvedOrderId).single(),
    service.from('content_access').select('id', { count: 'exact', head: true }).eq('order_id', approvedOrderId),
    service.from('course_enrollments').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('course_id', courseId),
    service.from('audit_logs').select('id', { count: 'exact', head: true }).eq('entity_type', 'payment').eq('entity_id', approvedPaymentId).eq('action', 'payment.approved'),
  ])
  if (approvedPayment.status !== 'approved' || paidOrder.status !== 'paid' || accessCount !== 2 || enrollmentCount !== 1 || approvalAuditCount !== 1) throw new Error('Atomic approval postconditions failed')

  const concurrentRefundStarts = await Promise.all([
    service.rpc('manage_order_refund', { p_order_id: approvedOrderId, p_actor_id: owner.user_id, p_action: 'initiate', p_reason: 'اختبار ذري', p_evidence_reference: null }),
    service.rpc('manage_order_refund', { p_order_id: approvedOrderId, p_actor_id: owner.user_id, p_action: 'initiate', p_reason: 'اختبار مكرر', p_evidence_reference: null }),
  ])
  if (concurrentRefundStarts.some((result) => result.error)) throw concurrentRefundStarts.find((result) => result.error).error
  const refundStartOutcomes = concurrentRefundStarts.map((result) => result.data?.outcome).sort()
  if (refundStartOutcomes.join(',') !== 'already_processing,initiate') throw new Error(`Unexpected refund start outcomes: ${refundStartOutcomes.join(',')}`)
  const { data: processingOrder } = await service.from('orders').select('status').eq('id', approvedOrderId).single()
  const { count: accessDuringRefund } = await service.from('content_access').select('id', { count: 'exact', head: true }).eq('order_id', approvedOrderId)
  if (processingOrder.status !== 'refund_pending' || accessDuringRefund !== 2) throw new Error('Refund processing must retain access')
  const concurrentRefunds = await Promise.all([
    service.rpc('manage_order_refund', { p_order_id: approvedOrderId, p_actor_id: owner.user_id, p_action: 'complete', p_reason: null, p_evidence_reference: 'test-refund-reference' }),
    service.rpc('manage_order_refund', { p_order_id: approvedOrderId, p_actor_id: owner.user_id, p_action: 'complete', p_reason: null, p_evidence_reference: 'test-refund-reference' }),
  ])
  if (concurrentRefunds.some((result) => result.error)) throw concurrentRefunds.find((result) => result.error).error
  const refundOutcomes = concurrentRefunds.map((result) => result.data?.outcome).sort()
  if (refundOutcomes.join(',') !== 'already_completed,complete') throw new Error(`Unexpected refund outcomes: ${refundOutcomes.join(',')}`)
  const [{ data: refundedOrder }, { count: remainingAccess }, { count: remainingEnrollment }, { count: refundAuditCount }] = await Promise.all([
    service.from('orders').select('status').eq('id', approvedOrderId).single(),
    service.from('content_access').select('id', { count: 'exact', head: true }).eq('order_id', approvedOrderId),
    service.from('course_enrollments').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('course_id', courseId),
    service.from('audit_logs').select('id', { count: 'exact', head: true }).eq('entity_type', 'order').eq('entity_id', approvedOrderId).eq('action', 'refund.complete'),
  ])
  if (refundedOrder.status !== 'refunded' || remainingAccess !== 0 || remainingEnrollment !== 0 || refundAuditCount !== 1) throw new Error('Atomic refund postconditions failed')

  const rejected = await createOrderAndPayment()
  rejectedOrderId = rejected.orderId; rejectedPaymentId = rejected.paymentId
  const concurrentRejections = await Promise.all([
    service.rpc('reject_payment_governed', { p_payment_id: rejectedPaymentId, p_actor_id: owner.user_id, p_reason: 'إيصال غير واضح' }),
    service.rpc('reject_payment_governed', { p_payment_id: rejectedPaymentId, p_actor_id: owner.user_id, p_reason: 'إيصال مكرر' }),
  ])
  if (concurrentRejections.some((result) => result.error)) throw concurrentRejections.find((result) => result.error).error
  const rejectOutcomes = concurrentRejections.map((result) => result.data?.outcome).sort()
  if (rejectOutcomes.join(',') !== 'already_rejected,rejected') throw new Error(`Unexpected rejection outcomes: ${rejectOutcomes.join(',')}`)
  const [{ data: rejectedPayment }, { data: pendingOrder }, { count: rejectionAuditCount }] = await Promise.all([
    service.from('payments').select('status, reject_reason').eq('id', rejectedPaymentId).single(),
    service.from('orders').select('status').eq('id', rejectedOrderId).single(),
    service.from('audit_logs').select('id', { count: 'exact', head: true }).eq('entity_type', 'payment').eq('entity_id', rejectedPaymentId).eq('action', 'payment.rejected'),
  ])
  if (rejectedPayment.status !== 'rejected' || !rejectedPayment.reject_reason || pendingOrder.status !== 'pending_payment' || rejectionAuditCount !== 1) throw new Error('Atomic rejection postconditions failed')

  const { error: anonError } = await anon.rpc('approve_payment_governed', { p_payment_id: approvedPaymentId, p_actor_id: owner.user_id })
  if (!anonError) throw new Error('Anonymous caller could execute privileged payment RPC')
  const { error: browserCheckoutError } = await customer.rpc('create_product_order_v3', { p_actor_id: userId, p_product_id: bundleProductId, p_variant_id: variantId, p_coupon_code: '', p_method: 'instapay', p_request_id: crypto.randomUUID() })
  if (!browserCheckoutError) throw new Error('Authenticated browser could execute service-only checkout RPC')
} finally {
  if (approvedPaymentId || rejectedPaymentId || approvedOrderId || rejectedOrderId) await service.from('audit_logs').delete().in('entity_id', [approvedPaymentId, rejectedPaymentId, approvedOrderId, rejectedOrderId].filter(Boolean))
  if (approvedOrderId || rejectedOrderId) {
    const orderIds = [approvedOrderId, rejectedOrderId].filter(Boolean)
    await service.from('payment_refunds').delete().in('order_id', orderIds)
    await service.from('entitlement_grants').delete().in('order_id', orderIds)
    await service.from('subscriptions').delete().in('order_id', orderIds)
  }
  if (productId || bundleProductId) await service.from('content_access').delete().in('product_id', [productId, bundleProductId].filter(Boolean))
  if (courseId && userId) await service.from('course_enrollments').delete().eq('course_id', courseId).eq('user_id', userId)
  if (approvedOrderId) await service.from('orders').delete().eq('id', approvedOrderId)
  if (rejectedOrderId) await service.from('orders').delete().eq('id', rejectedOrderId)
  if (proofPaths.length) await service.storage.from('payment-proofs').remove(proofPaths)
  if (proofIntentIds.length) await service.from('payment_proof_upload_intents').delete().in('id', proofIntentIds)
  if (bundleProductId) await service.from('products').delete().eq('id', bundleProductId)
  if (productId) await service.from('products').delete().eq('id', productId)
  if (userId) await service.auth.admin.deleteUser(userId)
}

console.log('verify:commerce passed — atomic checkout/proof, concurrent review/refund, idempotency, access reconciliation, audit, and RPC isolation verified')
