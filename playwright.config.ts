import { defineConfig, devices } from '@playwright/test'

const qaAdminEmail = 'codex-admin-qa@example.com'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: 'http://127.0.0.1:3101',
    launchOptions: process.env.HEBA_TEST_CHROMIUM_PATH ? { executablePath: process.env.HEBA_TEST_CHROMIUM_PATH, args: ['--no-sandbox','--disable-dev-shm-usage','--in-process-gpu','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] } : undefined,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'ar-EG',
    timezoneId: 'Africa/Cairo',
  },
  webServer: {
    command: 'corepack pnpm exec next start --hostname 127.0.0.1 --port 3101',
    url: 'http://127.0.0.1:3101',
    env: {
      QA_ADMIN_EMAIL: qaAdminEmail,
      // Public-browser checks must remain self-contained: they verify honest
      // absent-data states and never touch an ambient Supabase environment.
      NEXT_PUBLIC_SUPABASE_URL: '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '',
      SUPABASE_SECRET_KEY: '',
      SUPABASE_SERVICE_ROLE_KEY: '',
      PORT: '3101',
      HOSTNAME: '127.0.0.1',
    },
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
  ],
})
