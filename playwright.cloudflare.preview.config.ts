import { defineConfig, devices } from '@playwright/test'

// These are disposable localhost-only test bindings, not deployment secrets.
// The deployed Worker receives independent values through `wrangler secret`.
const workerTestPassword = 'preview-worker-e2e-only'
const workerTestEmail = 'admin-preview-e2e@example.test'
const workerTestSessionSecret = 'preview-worker-e2e-session-signing-key-000000000000'
process.env.HEBA_PREVIEW_ADMIN_EMAIL = workerTestEmail
process.env.HEBA_PREVIEW_ADMIN_PASSWORD = workerTestPassword

export default defineConfig({
  testDir: './tests/preview',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:8790',
    locale: 'ar-EG',
    timezoneId: 'Africa/Cairo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    // Wrangler 4.114+ currently has a confirmed Miniflare regression that can
    // terminate `dev` between requests with “Network connection lost”. Pin the
    // last green local-test CLI only here; deployment remains on the project CLI.
    command: `pnpm dlx wrangler@4.113.0 dev --config dist/server/wrangler.json --compatibility-date 2026-07-28 --var HEBA_DEPLOYMENT_ENV:preview --var HEBA_PREVIEW_ADMIN_EMAIL:${workerTestEmail} --var HEBA_PREVIEW_ADMIN_PASSWORD:${workerTestPassword} --var HEBA_PREVIEW_ADMIN_SESSION_SECRET:${workerTestSessionSecret} --port 8790`,
    url: 'http://127.0.0.1:8790',
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [{ name: 'cloudflare-preview-chromium', use: { ...devices['Desktop Chrome'] } }],
})
