import { existsSync } from 'node:fs'
import { read, report } from './lib.mjs'

const failures = []
const migrations = ['022_atomic_payment_review.sql', '023_atomic_checkout.sql', '024_atomic_order_transitions.sql', '025_variant_checkout.sql', '062_governed_manual_payment_and_refund_local_only.sql', '063_governed_checkout_and_payment_proof_upload_local_only.sql']
for (const name of migrations) {
  const file = `supabase/migrations/${name}`
  if (!existsSync(file)) failures.push(`${file}: atomic commerce migration missing`)
  else {
    const sql = read(file)
    if (!/for (?:update|share)/.test(sql) && !name.startsWith('062_')) failures.push(`${file}: row locking missing`)
    if ((name.startsWith('062_') || name.startsWith('063_')) && !/for update/.test(sql)) failures.push(`${file}: row locking missing`)
    if (!/security definer/.test(sql)) failures.push(`${file}: controlled transaction function missing`)
  }
}
const checkout = read('src/lib/actions/checkout.ts')
for (const rpc of ['calculate_checkout_quote', 'create_product_order_v3', 'begin_payment_proof_upload_intent', 'authorize_payment_proof_upload_finalization', 'complete_payment_proof_upload_intent']) if (!checkout.includes(`rpc('${rpc}'`)) failures.push(`checkout action does not use ${rpc}`)
for (const retired of ['create_product_order_v2', 'submit_payment_proof_atomic']) if (checkout.includes(`rpc('${retired}'`)) failures.push(`checkout action still uses retired RPC ${retired}`)
const review = read('src/lib/actions/admin.ts')
for (const rpc of ['approve_payment_governed', 'reject_payment_governed', 'transition_order_governed', 'manage_order_refund', 'get_payment_proof_for_review']) if (!review.includes(`rpc('${rpc}'`)) failures.push(`admin commerce action does not use ${rpc}`)
if (!existsSync('scripts/verify-commerce.mjs')) failures.push('live commerce concurrency verifier missing')

report('audit:commerce', failures)
