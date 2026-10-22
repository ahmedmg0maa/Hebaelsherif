import { defineConfig, devices } from '@playwright/test'

// The Worker is started independently from the already-built, isolated dist/
// output. This keeps Cloudflare-runtime regression evidence separate from the
// ordinary Next development-server suite.
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:8787',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'ar-EG',
    timezoneId: 'Africa/Cairo',
  },
  webServer: {
    command: 'pnpm start:vinext -- --port 8787',
    url: 'http://127.0.0.1:8787',
    env: {
      // The Worker regression suite must never reuse an ambient environment
      // file or exercise a real Supabase project.
      NEXT_PUBLIC_SUPABASE_URL: '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '',
      NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:8787',
      SUPABASE_SECRET_KEY: '',
      SUPABASE_SERVICE_ROLE_KEY: '',
      HEBA_DEPLOYMENT_ENV: '',
      STAGING_ACCESS_USER: '',
      STAGING_ACCESS_PASSWORD: '',
    },
    reuseExistingServer: false,
    timeout: 60_000,
  },
  projects: [
    { name: 'cloudflare-desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'cloudflare-mobile-chromium', use: { ...devices['Pixel 7'] } },
  ],
})
