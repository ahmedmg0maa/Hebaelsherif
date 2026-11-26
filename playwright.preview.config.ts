import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/preview',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3102',
    locale: 'ar-EG',
    timezoneId: 'Africa/Cairo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'pnpm start:isolated-preview',
    url: 'http://127.0.0.1:3102',
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [{ name: 'preview-chromium', use: { ...devices['Desktop Chrome'] } }],
})
