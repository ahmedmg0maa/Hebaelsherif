import { defineConfig, devices } from '@playwright/test'

// No server is started here. Run against your controlled local review URL.
export default defineConfig({
  testDir: './tests/design',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: { baseURL: process.env.HEBA_DESIGN_QA_URL ?? 'http://127.0.0.1:3000', locale: 'ar-EG', timezoneId: 'Africa/Cairo', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'adaptive-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'iphone-webkit-simulation', use: { ...devices['iPhone 13'] } },
    { name: 'android-chromium-simulation', use: { ...devices['Pixel 7'] } },
    { name: 'tablet-webkit-simulation', use: { ...devices['iPad Pro 11'] } },
  ],
})
