import type { Instrumentation } from 'next'
import * as Sentry from '@sentry/cloudflare'
import { safeMonitoringTag, sanitizedErrorStack } from '@/lib/monitoring/sentry-scrub'

export const onRequestError: Instrumentation.onRequestError = async (error, _request, context) => {
  const sanitized = new Error('APPLICATION_ERROR')
  sanitized.stack = sanitizedErrorStack(error)
  Sentry.withScope((scope) => {
    scope.setTags({
      monitoring_source: 'next_server',
      router_kind: safeMonitoringTag(context.routerKind),
      route_type: safeMonitoringTag(context.routeType),
      route_path: safeMonitoringTag(context.routePath),
      error_digest: safeMonitoringTag(error && typeof error === 'object' && 'digest' in error ? error.digest : undefined),
    })
    Sentry.captureException(sanitized)
  })
  await Sentry.flush(2_000)
}
