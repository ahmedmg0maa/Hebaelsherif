import type { Event } from '@sentry/cloudflare'

const SAFE_TAG_KEYS = new Set(['monitoring_source', 'router_kind', 'route_type', 'route_path', 'error_digest'])

function safeTag(value: unknown) {
  if (typeof value !== 'string') return null
  const clean = value.trim()
  if (!clean || clean.length > 160 || /[?@#\r\n]/.test(clean)) return null
  return clean
}

/**
 * Sentry receives diagnostic structure only. Customer/request data, raw error
 * messages, breadcrumbs, form/request bodies and local variables are removed.
 */
export function scrubSentryEvent<T extends Event>(event: T): T {
  delete event.user
  delete event.request
  delete event.breadcrumbs
  delete event.extra
  delete event.contexts
  delete event.transaction
  delete event.fingerprint
  delete event.server_name
  delete event.modules
  delete event.spans
  if (event.message) event.message = 'APPLICATION_ERROR'
  if (event.exception?.values) {
    event.exception.values = event.exception.values.map((exception) => ({
      type: 'Error',
      value: 'APPLICATION_ERROR',
      mechanism: exception.mechanism ? { handled: exception.mechanism.handled, type: 'generic' } : undefined,
      stacktrace: exception.stacktrace ? {
        frames: exception.stacktrace.frames?.slice(-40).map((frame) => ({
          filename: safeTag(frame.filename) ?? undefined,
          function: safeTag(frame.function) ?? undefined,
          module: safeTag(frame.module) ?? undefined,
          lineno: frame.lineno,
          colno: frame.colno,
          in_app: frame.in_app,
        })),
      } : undefined,
    }))
  }
  event.tags = Object.fromEntries(Object.entries(event.tags ?? {})
    .filter(([key]) => SAFE_TAG_KEYS.has(key))
    .map(([key, value]) => [key, safeTag(value)])
    .filter((entry): entry is [string, string] => Boolean(entry[1])))
  return event
}

export function sanitizedErrorStack(error: unknown) {
  const lines = error instanceof Error ? error.stack?.split('\n').slice(0, 41) ?? [] : []
  if (lines.length === 0) return undefined
  lines[0] = 'Error: APPLICATION_ERROR'
  return lines.join('\n').slice(0, 16_384)
}

export function safeMonitoringTag(value: unknown) {
  return safeTag(value) ?? 'unavailable'
}
