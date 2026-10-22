import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { paymentProofMagicValid, validateObservedPaymentProof } from '../src/lib/payment-proof-validation.mjs'

const read = (path) => readFileSync(path, 'utf8')
const migration = read('supabase/migrations/063_governed_checkout_and_payment_proof_upload_local_only.sql')
const actions = read('src/lib/actions/checkout.ts')
const upload = read('src/lib/payment-proof-upload.ts')
const checkout = read('src/components/checkout/CheckoutClient.tsx')

for (const token of [
  'orders_user_checkout_request_uidx',
  'payments_one_pending_per_order_uidx',
  'payment_proofs_storage_path_uidx',
  'payment_proof_upload_intents',
  "p_scope not in ('coupon','payment_proof','checkout')",
  'public.checkout_product_ready',
  'public.calculate_checkout_quote',
  'public.create_product_order_v3',
  'public.begin_payment_proof_upload_intent',
  'public.authorize_payment_proof_upload_finalization',
  'public.complete_payment_proof_upload_intent',
  "set search_path = ''",
  "status in ('issued','finalized','superseded','rejected','expired')",
  "perform pg_advisory_xact_lock(hashtextextended('checkout-v3:'",
  "perform pg_advisory_xact_lock(hashtextextended('payment-proof-intent:'",
  "v_order.user_id <> p_actor_id",
  "p_observed_mime is distinct from v_intent.declared_mime",
  "p_observed_size is distinct from v_intent.declared_size",
  "'payment.proof_upload_rejected'",
  "'payment.proof_upload_superseded'",
  "'payment.proof_submitted'",
  'revoke all on function public.create_product_order_v2',
  'revoke all on function public.submit_payment_proof_atomic',
]) assert.ok(migration.includes(token), `missing governed checkout/upload contract: ${token}`)

assert.ok(
  migration.indexOf('public.authorize_payment_proof_upload_finalization')
    < migration.indexOf('public.complete_payment_proof_upload_intent'),
  'privileged Storage inspection must have a separate actor/path authorization preflight',
)
assert.ok(
  migration.includes("if v_total > 0 and not public.payment_method_is_configured(p_method)")
    && migration.includes("'status', (select status from public.orders where id = v_order_id)"),
  'paid checkout must require configured payment while zero-total fulfillment reports its real post-trigger state',
)
assert.ok(
  !migration.includes("jsonb_build_object('storagePath'")
    && !migration.includes("jsonb_build_object('path'"),
  'Storage paths must not be copied into audit metadata',
)

for (const rpc of [
  "rpc('calculate_checkout_quote'",
  "rpc('create_product_order_v3'",
  "rpc('begin_payment_proof_upload_intent'",
  "rpc('authorize_payment_proof_upload_finalization'",
  "rpc('complete_payment_proof_upload_intent'",
]) assert.ok(actions.includes(rpc), `checkout action must use governed RPC: ${rpc}`)

assert.ok(!actions.includes("rpc('create_product_order_v2'") && !actions.includes("rpc('submit_payment_proof_atomic'"), 'Server Actions must not use retired checkout/proof RPCs')
assert.ok(!/validateCoupon\([^)]*price/.test(actions), 'coupon quote must not accept a client price')
assert.ok(actions.indexOf("rpc('authorize_payment_proof_upload_finalization'") < actions.indexOf('inspectStoredObject('), 'Storage inspection must occur only after DB authorization')
assert.ok(actions.includes('validateObservedPaymentProof') && actions.includes("from('payment-proofs').remove([input.path])"), 'invalid or superseded objects must be validated and removed')
assert.ok(upload.includes('.uploadToSignedUrl(') && !upload.includes('new FormData()'), 'large request body must upload directly to Storage rather than through the Worker')
assert.ok(checkout.includes('checkoutRequestId') && checkout.includes('crypto.randomUUID()'), 'checkout retries must carry an explicit stable request identity')
assert.ok(checkout.includes("setStep(res.data.status === 'pending_payment' ? 2 : 3)") && checkout.includes("order?.status === 'paid' ? 'تم تفعيل وصولك'"), 'zero-total checkout must bypass proof and report direct fulfillment truthfully')

const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0])
const webp = Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])
assert.equal(paymentProofMagicValid(png, 'image/png'), true)
assert.equal(paymentProofMagicValid(jpeg, 'image/jpeg'), true)
assert.equal(paymentProofMagicValid(webp, 'image/webp'), true)
assert.equal(paymentProofMagicValid(Uint8Array.from([0x4d, 0x5a, 0, 0]), 'image/png'), false, 'disguised executable must fail image validation')
assert.equal(validateObservedPaymentProof({
  declaredMime: 'image/png', declaredSize: png.length,
  observed: { bytes: png, mime: 'image/png', size: png.length },
}), true)
assert.equal(validateObservedPaymentProof({
  declaredMime: 'image/png', declaredSize: png.length,
  observed: { bytes: png, mime: 'image/jpeg', size: png.length },
}), false, 'observed MIME mismatch must fail')
assert.equal(validateObservedPaymentProof({
  declaredMime: 'image/png', declaredSize: png.length + 1,
  observed: { bytes: png, mime: 'image/png', size: png.length },
}), false, 'observed size mismatch must fail')

console.log('verify:checkout-upload-governance-local passed — authoritative quotes, request idempotency, direct upload intents and server-observed image validation verified')
