import { defineConfig, devices } from '@playwright/test'

const publicPreviewUrl = process.env.HEBA_PUBLIC_PREVIEW_URL
  ?? 'https://heba-elsherif-platform-public-preview.heba-elsherif-platform.workers.dev'

export default defineConfig({
  testDir: './tests/preview',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: publicPreviewUrl,
    locale: 'ar-EG',
    timezoneId: 'Africa/Cairo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'live-preview-chromium', use: { ...devices['Desktop Chrome'] } }],
})
