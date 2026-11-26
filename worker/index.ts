import * as Sentry from '@sentry/cloudflare'
import { deliverBookingMail, type BookingMailEnv } from './booking-mail'
import {processCatalogSchedule} from './catalog-schedule'
import vinextHandler from 'vinext/server/fetch-handler'
import { scrubSentryEvent } from '../src/lib/monitoring/sentry-scrub'

type Env = BookingMailEnv & {
  SENTRY_DSN?: string
  SENTRY_ENVIRONMENT?: string
  SENTRY_RELEASE?: string
  HEBA_DEPLOYMENT_ENV?: string
}
type WorkerContext = {
  waitUntil(promise: Promise<unknown>): void
  passThroughOnException(): void
}

export default Sentry.withSentry<Env>(
  (env) => ({
    dsn: env.SENTRY_DSN?.trim() || undefined,
    environment: env.SENTRY_ENVIRONMENT?.trim() || env.HEBA_DEPLOYMENT_ENV?.trim() || 'unverified',
    release: env.SENTRY_RELEASE?.trim() || undefined,
    sendDefaultPii: false,
    sampleRate: 1,
    tracesSampleRate: 0,
    maxBreadcrumbs: 0,
    enableLogs: false,
    skipOpenTelemetrySetup: true,
    enableRpcTracePropagation: false,
    beforeSend: scrubSentryEvent,
  }),
  {
    scheduled(_event: unknown, env: Env, ctx: WorkerContext) {
      ctx.waitUntil(deliverBookingMail(env))
      ctx.waitUntil(processCatalogSchedule(env))
    },
    fetch(request: Request, env: Env, ctx: WorkerContext) {
      return vinextHandler.fetch(request, env, ctx)
    },
  },
)
