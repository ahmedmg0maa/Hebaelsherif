import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(path, 'utf8')
const data = read('src/lib/data/dashboard.ts')
const home = read('src/app/dashboard/page.tsx')
const errorBoundary = read('src/app/dashboard/error.tsx')
const migration = read('supabase/migrations/066_customer_entitlement_read_continuity_local_only.sql')

for (const token of [
  "const DASHBOARD_READ_ERROR = 'CUSTOMER_DASHBOARD_READ_UNAVAILABLE'",
  'if (authError) dashboardReadError()',
  'if (error) dashboardReadError()',
  'if (deliveryResponse.error || resourceResponse.error || recordingResponse.error) dashboardReadError()',
  'if (eventResponse.error || rescheduleResponse.error) dashboardReadError()',
  'if (certificateResponse.error || progressResponse.error) dashboardReadError()',
  'if (orderResponse.error || itemResponse.error) dashboardReadError()',
  'if ((orderResponse.data ?? []).length !== orderIds.length) dashboardReadError()',
  "supabase.from('course_modules').select('id, course_id')",
  "supabase.from('course_lessons').select('id, module_id')",
  'safeHttpsUrl(b.meeting_url)',
  'safeDashboardLink(n.link)',
]) assert.ok(data.includes(token), `missing Customer Dashboard read-integrity contract: ${token}`)

assert.ok(!data.includes('catch {\n    return fallback'), 'configured Customer Dashboard failures must not become empty-state fallbacks')
for (const limit of ['.range(page ? (page-1)*20 : 0, page ? page*20-1 : 49)', '.limit(100)', '.limit(200)', '.limit(500)', '.limit(1000)']) {
  assert.ok(data.includes(limit), `declared Customer Dashboard response bound missing: ${limit}`)
}
for (const unboundedNested of [
  'workshop_delivery(meeting_url), workshop_resources',
  'booking_events(id, event, created_at), booking_reschedule_requests',
  'expires_at, order_items(products',
  'orders!inner(status, expires_at, order_items',
  'course_modules(course_lessons',
]) assert.ok(!data.includes(unboundedNested), `unbounded nested Customer Dashboard read remains: ${unboundedNested}`)

for (const token of [
  'products: public or customer-owned read',
  'courses: public or enrolled read',
  'modules: public or enrolled course read',
  'lessons: public or enrolled course read',
  'books: public or owner-of-access read',
  'workshops: public or registered read',
  'services: public or booked read',
  'customer_order.user_id = auth.uid()',
  'enrollment.user_id = auth.uid()',
  'access.user_id = auth.uid()',
  "registration.status <> 'cancelled'",
  'booking.user_id = auth.uid()',
]) assert.ok(migration.includes(token), `missing customer entitlement continuity policy: ${token}`)
assert.ok((migration.match(/for select using/g) ?? []).length === 7, 'entitlement continuity must remain SELECT-only across seven metadata policies')
assert.ok(!/\b(insert|update|delete)\b\s+public\./i.test(migration), 'read-continuity migration must not mutate customer business data')

assert.ok(errorBoundary.startsWith("'use client'"), 'Dashboard failure state must be resettable')
assert.ok(errorBoundary.includes('لم نعرض حالة فارغة لأننا لم نتأكد من بياناتك') && errorBoundary.includes('onClick={reset}') && errorBoundary.includes('role="alert"'), 'Dashboard must expose an honest accessible retry state')
assert.ok(home.includes('getMyOrders()') && home.includes('pendingOrder') && home.includes('طلب ينتظر إثبات الدفع') && home.includes('`/dashboard/orders/${pendingOrder.id}`'), 'Dashboard home must expose the real pending-payment next action')
assert.ok(!data.includes('console.'), 'Customer Dashboard reads must not log customer or provider data')

console.log('verify:customer-dashboard-read-integrity-local passed — configured failures, response bounds, safe links and truthful next action verified')
