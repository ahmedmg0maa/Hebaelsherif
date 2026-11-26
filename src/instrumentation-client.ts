import * as Sentry from '@sentry/browser'
import { scrubSentryEvent } from '@/lib/monitoring/sentry-scrub'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim()

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT?.trim() || 'unverified',
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE?.trim() || undefined,
    sendDefaultPii: false,
    sampleRate: 1,
    tracesSampleRate: 0,
    maxBreadcrumbs: 0,
    enableLogs: false,
    beforeSend: (event) => {
      event.tags = { ...event.tags, monitoring_source: 'browser' }
      return scrubSentryEvent(event)
    },
  })
}
