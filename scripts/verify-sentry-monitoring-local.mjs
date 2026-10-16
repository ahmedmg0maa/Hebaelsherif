import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(path, 'utf8')
const pkg = JSON.parse(read('package.json'))
const wrangler = read('wrangler.jsonc')
const worker = read('worker/index.ts')
const server = read('src/instrumentation.ts')
const browser = read('src/instrumentation-client.ts')
const scrubber = read('src/lib/monitoring/sentry-scrub.ts')
const integration = read('src/lib/data/integrations.ts')
const buildScripts = [
  read('scripts/run-isolated-typecheck.mjs'),
  read('scripts/run-isolated-build.mjs'),
  read('scripts/run-cloudflare-isolated-build.mjs'),
]

assert.equal(pkg.dependencies['@sentry/cloudflare'], '10.55.0')
assert.equal(pkg.dependencies['@sentry/browser'], '10.55.0')
assert.ok(wrangler.includes('"main": "worker/index.ts"') && wrangler.includes('"nodejs_compat"'), 'Worker must use the Sentry wrapper entry with nodejs_compat')

for (const token of [
  'Sentry.withSentry<Env>', "from 'vinext/server/fetch-handler'", 'sendDefaultPii: false',
  'tracesSampleRate: 0', 'maxBreadcrumbs: 0', 'enableLogs: false',
  'skipOpenTelemetrySetup: true', 'enableRpcTracePropagation: false', 'beforeSend: scrubSentryEvent',
]) assert.ok(worker.includes(token), `missing privacy-safe Worker Sentry contract: ${token}`)

assert.ok(server.includes('Instrumentation.onRequestError') && server.includes('Sentry.withScope') && server.includes('Sentry.captureException(sanitized)') && server.includes('await Sentry.flush(2_000)'), 'Next server errors must be sanitized and awaited')
assert.ok(!server.includes('_request.path') && !server.includes('error.message'), 'request paths and raw error messages must not enter monitoring')
assert.ok(browser.includes('if (dsn)') && browser.includes("monitoring_source: 'browser'") && browser.includes('beforeSend: (event)'), 'browser monitoring must be optional and use the shared scrubber')

for (const token of [
  'delete event.user', 'delete event.request', 'delete event.breadcrumbs', 'delete event.extra',
  'delete event.contexts', 'delete event.transaction', "event.message = 'APPLICATION_ERROR'",
  "value: 'APPLICATION_ERROR'", 'frames?.slice(-40)', 'SAFE_TAG_KEYS',
]) assert.ok(scrubber.includes(token), `missing Sentry privacy scrub: ${token}`)

for (const script of buildScripts) {
  for (const name of ['RESEND_API_KEY', 'SENTRY_DSN', 'NEXT_PUBLIC_SENTRY_DSN', 'SENTRY_AUTH_TOKEN', 'PROTECTED_UPLOAD_SCAN_TOKEN']) {
    assert.ok(script.includes(`${name}: ''`), `isolated command can inherit ${name}`)
  }
}
assert.ok(integration.includes("paired('SENTRY_DSN', 'NEXT_PUBLIC_SENTRY_DSN')") && integration.includes("paired('SENTRY_ENVIRONMENT', 'NEXT_PUBLIC_SENTRY_ENVIRONMENT')"), 'Admin readiness must distinguish complete from partial Sentry runtime configuration')

const { scrubSentryEvent } = await import('../src/lib/monitoring/sentry-scrub.ts')
const event = scrubSentryEvent({
  message: 'customer@example.com secret',
  transaction: '/admin/users/customer-id?email=secret',
  request: { url: 'https://example.test/private?token=secret', headers: { cookie: 'secret' } },
  user: { email: 'customer@example.com' },
  breadcrumbs: [{ message: 'typed secret' }],
  extra: { note: 'private' },
  contexts: { response: { data: 'private' } },
  tags: { route_path: '/admin/users/[id]', unsafe: 'private', error_digest: 'abc123' },
  exception: { values: [{ type: 'DatabaseError', value: 'email customer@example.com', stacktrace: { frames: [{ filename: 'src/app/page.tsx', function: 'render', vars: { password: 'secret' } }] } }] },
})
const serialized = JSON.stringify(event)
for (const forbidden of ['customer@example.com', 'token=secret', 'typed secret', 'password', 'private']) assert.ok(!serialized.includes(forbidden), `scrubber leaked ${forbidden}`)
assert.equal(event.exception?.values?.[0]?.value, 'APPLICATION_ERROR')
assert.equal(event.exception?.values?.[0]?.type, 'Error')
assert.deepEqual(event.tags, { route_path: '/admin/users/[id]', error_digest: 'abc123' })

console.log('verify:sentry-monitoring-local passed — official Worker/browser SDK wiring, awaited capture, PII scrub and isolated-build secret shadowing verified')
