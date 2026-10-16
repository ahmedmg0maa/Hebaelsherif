import { mkdir } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'

const evidenceDir = 'docs/evidence/visual-customer-experience/light-editorial-rebuild'

async function visit(page: Page, path: string) {
  const response = await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  expect(response?.status()).toBeLessThan(400)
  await page.evaluate(() => document.fonts.ready)
}

test.beforeAll(async () => mkdir(evidenceDir, { recursive: true }))

test('home is light by default, professionally worded, and free from hero overlap', async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem('heba-theme'))
  await page.setViewportSize({ width: 1440, height: 1000 })
  await visit(page, '/')

  await expect(page.locator('html')).not.toHaveClass(/dark/)
  await expect(page.getByText('مساحة عربية هادئة للفهم والتعلّم والاختيار الواعي')).toHaveCount(0)
  await expect(page.getByText('صورة تعبيرية', { exact: true })).toHaveCount(0)
  await expect(page.getByText(/لستِ مطالبة بمعرفة كل الإجابات/)).toHaveCount(0)

  const heading = page.getByRole('heading', { level: 1 })
  const lead = heading.locator('xpath=following::p[1]')
  await expect(heading).toContainText('افهمي')
  const [headingBox, leadBox] = await Promise.all([heading.boundingBox(), lead.boundingBox()])
  expect(headingBox).not.toBeNull()
  expect(leadBox).not.toBeNull()
  expect((headingBox?.y ?? 0) + (headingBox?.height ?? 0)).toBeLessThanOrEqual((leadBox?.y ?? 0) + 1)
  const dimensions = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }))
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width + 1)
  await page.screenshot({ path: `${evidenceDir}/home-after-desktop-1440.png`, fullPage: true })

  await page.setViewportSize({ width: 390, height: 844 })
  await visit(page, '/')
  const mobileDimensions = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }))
  expect(mobileDimensions.scroll).toBeLessThanOrEqual(mobileDimensions.width + 1)
  await page.screenshot({ path: `${evidenceDir}/home-after-mobile-390.png`, fullPage: true })
})

test('theme control changes the actual palette and persists the explicit choice', async ({ page }) => {
  await visit(page, '/')
  await page.waitForTimeout(700)
  const before = await page.locator('body').evaluate((node) => ({ background: getComputedStyle(node).backgroundColor, color: getComputedStyle(node).color }))
  await page.getByRole('button', { name: 'تبديل الوضع الفاتح والداكن' }).first().click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  const after = await page.locator('body').evaluate((node) => ({ background: getComputedStyle(node).backgroundColor, color: getComputedStyle(node).color }))
  expect(after).not.toEqual(before)
  await visit(page, '/services')
  await expect(page.locator('html')).toHaveClass(/dark/)
})

test('internal public journeys have real editorial imagery instead of flat page heroes', async ({ page }) => {
  for (const route of ['/services', '/booking', '/courses', '/books', '/articles', '/resources', '/about']) {
    await visit(page, route)
    const hero = page.locator('main > section').first()
    await expect(hero.locator('img')).toHaveCount(1)
    await expect.poll(() => hero.locator('img').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true)
  }
})

test('credential-protected admin preview rejects invalid identity and creates an HttpOnly read-only session', async ({ page, context }) => {
  const email = process.env.HEBA_PREVIEW_ADMIN_EMAIL
  const password = process.env.HEBA_PREVIEW_ADMIN_PASSWORD
  test.skip(!email || !password, 'Preview admin credentials are intentionally supplied outside Git.')
  await visit(page, '/preview-admin')
  await expect(page.getByRole('heading', { name: 'معاينة لوحة الإدارة' })).toBeVisible()
  await page.getByLabel('البريد الإلكتروني للإدارة').fill('wrong-preview-admin@example.test')
  await page.getByLabel('كلمة مرور الإدارة').fill(password!)
  await page.getByRole('button', { name: 'دخول مساحة المراجعة' }).click()
  await expect(page.getByRole('alert')).toContainText('تعذّر الدخول')
  await expect(page.getByRole('heading', { name: 'مركز تشغيل هبة الشريف' })).toHaveCount(0)

  await page.getByLabel('البريد الإلكتروني للإدارة').fill(email!)
  await page.getByLabel('كلمة مرور الإدارة').fill(password!)
  await page.getByRole('button', { name: 'دخول مساحة المراجعة' }).click()
  await expect(page.getByRole('heading', { name: 'مركز تشغيل هبة الشريف' })).toBeVisible()
  await expect(page.getByText('وضع مراجعة آمن')).toBeVisible()
  await expect(page.getByText('٠')).toBeVisible()
  const session = (await context.cookies()).find((cookie) => cookie.name === 'heba-preview-admin')
  expect(session?.httpOnly).toBe(true)
  expect(session?.sameSite).toBe('Strict')
  await page.screenshot({ path: `${evidenceDir}/admin-preview-after-desktop-1440.png`, fullPage: true })
})
