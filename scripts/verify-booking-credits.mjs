import { createClient } from '@supabase/supabase-js'
import { getSupabasePublicConfig } from './public-config.mjs'

const { url, key: publicKey } = getSupabasePublicConfig()
const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
if (!serviceKey) throw new Error('Supabase service configuration missing')

const db = createClient(url, serviceKey, { auth: { persistSession: false } })
const marker = crypto.randomUUID()
const password = `T!${crypto.randomUUID()}a9`
const iso = (offset) => new Date(Date.now() + offset).toISOString()
const ids = {}

async function must(query, label) {
  const result = await query
  if (result.error) throw new Error(`${label}: ${result.error.message}`)
  return result.data
}

async function credit(subscriptionId, actorId, key, delta, operation = delta < 0 ? 'consume' : 'adjust', extra = {}) {
  return db.rpc('apply_subscription_credit', {
    p_subscription_id: subscriptionId,
    p_delta: delta,
    p_booking_id: extra.bookingId ?? null,
    p_reason: extra.reason ?? (delta < 0 ? 'استهلاك اختباري' : 'تسوية اختبارية'),
    p_actor_id: actorId,
    p_idempotency_key: key,
    p_operation: operation,
    p_source_type: extra.sourceType ?? 'verification',
    p_source_id: extra.sourceId ?? null,
    p_reverses_ledger_id: extra.reverses ?? null,
  })
}

try {
  const owner = await must(db.from('admin_roles').select('user_id').eq('role', 'owner').limit(1).single(), 'owner')
  const user1 = await must(db.auth.admin.createUser({ email: `phase5-a-${marker}@example.invalid`, password, email_confirm: true }), 'user1')
  const user2 = await must(db.auth.admin.createUser({ email: `phase5-b-${marker}@example.invalid`, password, email_confirm: true }), 'user2')
  ids.user1 = user1.user.id; ids.user2 = user2.user.id

  const product = await must(db.from('products').insert({ type: 'session', slug: `phase5-${marker}`, title: 'Phase 5 verification', price: 100, is_published: true }).select('id').single(), 'product')
  ids.product = product.id
  const service = await must(db.from('services').insert({ product_id: product.id, slug: `phase5-${marker}`, title: 'Phase 5 verification', duration_minutes: 60, price: 100 }).select('id').single(), 'service')
  ids.service = service.id

  await must(db.from('availability_rules').insert([
    { service_id: service.id, weekday: 1, start_time: '10:00', end_time: '12:00' },
    { service_id: service.id, weekday: 1, start_time: '14:00', end_time: '16:00' },
  ]), 'windows')
  const overlap = await Promise.all([
    db.from('availability_rules').insert({ service_id: service.id, weekday: 1, start_time: '11:00', end_time: '13:00' }),
    db.from('availability_rules').insert({ service_id: service.id, weekday: 1, start_time: '11:30', end_time: '13:30' }),
  ])
  if (overlap.some((entry) => !entry.error || entry.error.code !== '23P01')) throw new Error('Concurrent availability overlap was not rejected')

  const plan = await must(db.from('subscription_plans').insert({ slug: `phase5-${marker}`, title: 'Phase 5 credits', price: 200, duration_days: 30, sessions_included: 4, is_active: true, is_published: true }).select('id').single(), 'plan')
  ids.plan = plan.id
  await must(db.from('subscription_plan_services').insert({ plan_id: plan.id, service_id: service.id }), 'eligibility')
  const sub1 = await must(db.rpc('create_managed_subscription', { p_user_id: ids.user1, p_plan_id: plan.id, p_status: 'active', p_starts_at: iso(-60_000), p_ends_at: iso(86_400_000), p_admin_notes: 'verification', p_actor_id: owner.user_id }), 'sub1')
  const sub2 = await must(db.rpc('create_managed_subscription', { p_user_id: ids.user2, p_plan_id: plan.id, p_status: 'active', p_starts_at: iso(-60_000), p_ends_at: iso(86_400_000), p_admin_notes: 'verification', p_actor_id: owner.user_id }), 'sub2')
  ids.sub1 = sub1; ids.sub2 = sub2

  const sameKey = `same:${marker}`
  const same = await Promise.all([credit(sub1, owner.user_id, sameKey, -1), credit(sub1, owner.user_id, sameKey, -1)])
  if (same.some((entry) => entry.error) || same.map((entry) => entry.data.outcome).sort().join(',') !== 'adjusted,existing') throw new Error('Same-key same-request idempotency failed')
  const mismatchDelta = await credit(sub1, owner.user_id, sameKey, 1)
  if (!mismatchDelta.error?.message.includes('idempotency_conflict')) throw new Error('Same key with different delta did not conflict')
  const mismatchSubscription = await credit(sub2, owner.user_id, sameKey, -1)
  if (!mismatchSubscription.error?.message.includes('idempotency_conflict')) throw new Error('Same key with different subscription did not conflict')

  const scopedKey = `scoped:${marker}`
  const scoped = await Promise.all([credit(sub1, ids.user1, scopedKey, -1), credit(sub2, ids.user2, scopedKey, -1)])
  if (scoped.some((entry) => entry.error)) throw new Error('Identical textual keys for different users were not independently scoped')

  await must(credit(sub1, owner.user_id, `prepare:${marker}`, -1), 'prepare last credit')
  const lastCreditRace = await Promise.all([
    credit(sub1, owner.user_id, `last-a:${marker}`, -1),
    credit(sub1, owner.user_id, `last-b:${marker}`, -1),
  ])
  if (lastCreditRace.filter((entry) => !entry.error).length !== 1 || lastCreditRace.filter((entry) => entry.error?.message.includes('credit_balance_out_of_range')).length !== 1) throw new Error('Last-credit race did not allow exactly one consumer')

  const customer = createClient(url, publicKey, { auth: { persistSession: false } })
  await must(customer.auth.signInWithPassword({ email: `phase5-b-${marker}@example.invalid`, password }), 'customer sign-in')
  const date = new Date(); const daysUntilMonday = ((1 - date.getDay() + 7) % 7) || 7; date.setDate(date.getDate() + daysUntilMonday)
  const bookingDate = date.toISOString().slice(0, 10)
  const packageBooking = await must(customer.rpc('create_package_booking', { p_service_id: service.id, p_date: bookingDate, p_time: '10:00', p_full_name: 'عميلة اختبار', p_phone: '01012345678', p_notes: '', p_subscription_id: sub2 }), 'package booking')
  ids.booking = packageBooking.bookingId; ids.order = packageBooking.orderId
  const beforeCancel = await must(db.from('subscription_credit_ledger').select('delta').eq('subscription_id', sub2), 'balance before cancel')
  const balanceBefore = beforeCancel.reduce((sum, row) => sum + row.delta, 0)
  await must(db.from('bookings').update({ status: 'cancelled' }).eq('id', ids.booking), 'cancel booking')
  await must(db.from('bookings').update({ status: 'cancelled' }).eq('id', ids.booking), 'repeat cancel')
  const afterCancel = await must(db.from('subscription_credit_ledger').select('delta,operation').eq('subscription_id', sub2), 'balance after cancel')
  if (afterCancel.reduce((sum, row) => sum + row.delta, 0) !== balanceBefore + 1 || afterCancel.filter((row) => row.operation === 'reverse').length !== 1) throw new Error('Cancellation did not restore exactly one credit')

  const ineligibleProduct = await must(db.from('products').insert({ type: 'session', slug: `phase5-ineligible-${marker}`, title: 'Ineligible', price: 100, is_published: true }).select('id').single(), 'ineligible product')
  ids.ineligibleProduct = ineligibleProduct.id
  const ineligibleService = await must(db.from('services').insert({ product_id: ineligibleProduct.id, slug: `phase5-ineligible-${marker}`, title: 'Ineligible', duration_minutes: 60, price: 100 }).select('id').single(), 'ineligible service')
  ids.ineligibleService = ineligibleService.id
  const denied = await customer.rpc('create_package_booking', { p_service_id: ineligibleService.id, p_date: bookingDate, p_time: '10:00', p_full_name: 'عميلة اختبار', p_phone: '01012345678', p_notes: '', p_subscription_id: sub2 })
  if (!denied.error?.message.includes('SERVICE_NOT_ELIGIBLE_FOR_PACKAGE')) throw new Error('Ineligible service was accepted')

  const capacityPlan = await must(db.from('subscription_plans').insert({ slug: `phase5-capacity-${marker}`, title: 'Capacity verification', price: 50, duration_days: 30, sessions_included: 1, max_subscribers: 1, is_active: true }).select('id').single(), 'capacity plan')
  ids.capacityPlan = capacityPlan.id
  ids.capacitySub1 = await must(db.rpc('create_managed_subscription', { p_user_id: ids.user1, p_plan_id: capacityPlan.id, p_status: 'active', p_starts_at: iso(-60_000), p_ends_at: iso(86_400_000), p_admin_notes: '', p_actor_id: owner.user_id }), 'capacity first')
  ids.capacitySub2 = await must(db.rpc('create_managed_subscription', { p_user_id: ids.user2, p_plan_id: capacityPlan.id, p_status: 'pending', p_starts_at: iso(-60_000), p_ends_at: iso(86_400_000), p_admin_notes: '', p_actor_id: owner.user_id }), 'capacity pending')
  const activation = await db.rpc('set_subscription_status', { p_subscription_id: ids.capacitySub2, p_status: 'active', p_actor_id: owner.user_id })
  if (!activation.error?.message.includes('plan_capacity_reached')) throw new Error('Capacity did not block pending activation')

  const immutable = await db.from('subscription_credit_ledger').delete().eq('subscription_id', sub1)
  if (!immutable.error?.message.includes('credit_ledger_is_immutable')) throw new Error('Ledger mutation was not rejected')

  await db.from('subscription_plans').update({ is_active: false, is_published: false, archived_at: new Date().toISOString() }).in('id', [plan.id, capacityPlan.id])
  await db.from('subscriptions').update({ status: 'cancelled', archived_at: new Date().toISOString() }).in('id', [sub1, sub2, ids.capacitySub1, ids.capacitySub2])
  await db.from('products').update({ is_published: false }).in('id', [product.id, ineligibleProduct.id])
} catch (error) {
  console.error('Phase 5 fixture ids:', ids)
  throw error
}

console.log('verify:booking-credits passed — scoped fingerprints, immutable ledger, eligibility, capacity, concurrent windows/credits, activation, and one-time cancellation reversal verified')
