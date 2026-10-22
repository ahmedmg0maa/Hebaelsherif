import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(path, 'utf8')
const migration = read('supabase/migrations/065_governed_customer_protected_delivery_local_only.sql')
const security = read('src/lib/delivery/security.ts')
const courseRoute = read('src/app/dashboard/courses/resources/[resourceId]/download/route.ts')
const workshopResourceRoute = read('src/app/dashboard/workshops/[slug]/resources/[id]/route.ts')
const workshopRecordingRoute = read('src/app/dashboard/workshops/[slug]/recordings/[id]/route.ts')
const routes = [courseRoute, workshopResourceRoute, workshopRecordingRoute]

for (const token of [
  'public.authorize_customer_protected_delivery',
  "set search_path = ''",
  "p_delivery_kind not in ('course_resource', 'workshop_resource', 'workshop_recording')",
  "p_delivery_kind in ('workshop_resource', 'workshop_recording') and p_scope_slug is null",
  "registration.status = 'registered'",
  'recording.published_at is not null',
  "v_path !~* '^https://[^[:space:]]+$'",
  "'protected-delivery:' || p_actor_id::text",
  "event.created_at >= now() - interval '24 hours'",
  "jsonb_build_object('reason', 'rate_limit'",
  "jsonb_build_object('phase', 'authorized'",
  'grant execute on function public.authorize_customer_protected_delivery(uuid,text,uuid,text,text)',
]) assert.ok(migration.includes(token), `missing protected delivery contract: ${token}`)

assert.ok(migration.includes('v_limit := 30') && migration.includes('v_limit := 60'), 'resource and recording mint limits must remain explicit')
const firstAudit = migration.indexOf('insert into public.protected_delivery_events')
const returnPayload = migration.indexOf("return jsonb_strip_nulls(jsonb_build_object(")
const auditBodies = migration.slice(firstAudit, returnPayload)
assert.ok(!auditBodies.includes("'path', v_path") && !auditBodies.includes("'title', v_title") && !auditBodies.includes("'externalUrl', v_external_url"), 'paths, titles and external URLs must not enter admission evidence')
const allowedAudit = migration.lastIndexOf('insert into public.protected_delivery_events', returnPayload)
assert.ok(allowedAudit >= 0 && returnPayload > allowedAudit, 'authorization evidence must persist before path disclosure')

for (const route of routes) {
  assert.ok(route.includes("rpc('authorize_customer_protected_delivery'"), 'every protected route must use the governed admission RPC')
  assert.ok(route.includes('requestFingerprint(request)'), 'every protected route must send only a hashed request fingerprint')
  assert.ok(route.includes("admission.status === 'rate_limited'") && route.includes('429'), 'every protected route must preserve rate-limit feedback')
  assert.ok(route.includes("admission.status !== 'allowed'"), 'every protected route must fail closed on denied admission')
  assert.ok(route.includes('createSignedUrl') || route.includes('externalUrl'), 'allowed route must use short-lived signed delivery or validated HTTPS redirect')
  assert.ok(!route.includes(".from('workshop_registrations')") && !route.includes(".from('lesson_resources')"), 'route-only entitlement queries must be retired')
}
assert.ok(security.includes('export function isUuid'), 'route identifiers must be rejected before typed RPC calls')
assert.ok(courseRoute.includes("target.protocol !== 'https:'") && workshopResourceRoute.includes("target.protocol !== 'https:'") && !routes.some((route) => route.includes("'http:'")), 'course/workshop links must be HTTPS-only')
assert.ok(courseRoute.includes('createSignedUrl(admission.path, 60') && workshopRecordingRoute.includes('createSignedUrl(admission.path, 90'), 'signed URLs must remain short lived')
assert.ok(!routes.some((route) => route.includes('console.')), 'protected routes must not log paths, URLs or provider errors')

console.log('verify:customer-protected-delivery-local passed — entitlement RPC, mint limits, HTTPS-only links, short signatures and minimized admission evidence verified')
