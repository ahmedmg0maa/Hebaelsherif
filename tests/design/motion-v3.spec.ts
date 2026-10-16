import { expect, test, type Page } from '@playwright/test'

const widths = [320, 360, 390, 430, 768, 1024, 1280, 1920]
async function noOverflow(page: Page) {
  await page.evaluate(() => document.fonts.ready)
  const dimensions = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }))
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client + 1)
}
async function visit(page: Page, route: string) {
  const response = await page.goto(route, { waitUntil: 'domcontentloaded' })
  expect(response?.status()).toBeLessThan(400)
  await noOverflow(page)
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { localStorage.removeItem('heba-theme'); localStorage.removeItem('heba-motion') })
})

test('shared public templates fit the phone, tablet and desktop width matrix', async ({ page }, info) => {
  test.skip(info.project.name !== 'adaptive-chromium', 'Additional width matrix is exercised on the adaptive desktop browser.')
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 })
    for (const route of ['/', '/start-here', '/books']) await visit(page, route)
    await visit(page, '/')
    const title = await page.locator('#home-hero-title').boundingBox()
    const lead = await page.locator('#home-hero-title + p').boundingBox()
    expect(title).not.toBeNull(); expect(lead).not.toBeNull()
    expect(title!.y + title!.height).toBeLessThanOrEqual(lead!.y + 1)
  }
})

test('each simulated engine can read the shared catalog, task and auth surfaces', async ({ page }) => {
  for (const route of ['/', '/services', '/start-here', '/books', '/search', '/contact', '/auth/admin']) await visit(page, route)
  await visit(page, '/')
  await expect(page.locator('.learning-hero-copy')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  expect(await page.locator('.learning-hero-copy').evaluate(node => getComputedStyle(node).backgroundImage)).toContain('journey-light-v3.svg')
  await expect(page.locator('.learning-hero-copy').getByText('تعرّفي على هبة', { exact: true })).toHaveCount(0)
})

test('the sample preserves an actual draft, reviews it, edits and clears it', async ({ page }) => {
  await visit(page, '/')
  const sample = page.locator('[data-learning-tour]')
  await sample.getByRole('tab', { name: /جرّبي التطبيق/ }).click()
  await expect(sample.getByRole('button', { name: /راجعي خطوتكِ/ })).toBeDisabled()
  await sample.getByLabel('ما الأمر الواحد الذي يشغلكِ؟').fill('أريد تنظيم يومي')
  await sample.getByLabel('ما أول خطوة صغيرة تستطيعين تجربتها؟').fill('مهمة واحدة غدًا')
  await sample.getByRole('button', { name: /راجعي خطوتكِ/ }).click()
  await expect(sample.getByRole('tabpanel')).toContainText('مهمة واحدة غدًا')
  await sample.getByRole('button', { name: 'عدّلي خطوتكِ' }).click()
  await expect(sample.getByLabel('ما الأمر الواحد الذي يشغلكِ؟')).toHaveValue('أريد تنظيم يومي')
  await sample.getByRole('tab', { name: /راجعي خطوتكِ/ }).click()
  await sample.getByRole('button', { name: 'امسحي وابدئي من جديد' }).click()
  await sample.getByRole('tab', { name: /جرّبي التطبيق/ }).click()
  await expect(sample.getByLabel('ما الأمر الواحد الذي يشغلكِ؟')).toHaveValue('')
  await noOverflow(page)
})

test('OS reduced motion and keyboard tabs keep the sample readable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await visit(page, '/')
  await expect(page.locator('#home-hero-title')).toHaveCSS('animation-name', 'none')
  const sample = page.locator('[data-learning-tour]')
  await sample.getByRole('tab', { name: /افهمي الفكرة/ }).focus()
  await page.keyboard.press('ArrowLeft')
  await expect(sample.getByRole('tab', { name: /جرّبي التطبيق/ })).toBeFocused()
  await page.keyboard.press('End')
  await expect(sample.getByRole('tab', { name: /راجعي خطوتكِ/ })).toBeFocused()
  await expect(sample.getByRole('tabpanel')).toBeVisible()
})

test('motion is automatic without a page control and the top button is touch sized', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('heba-motion', 'reduced'))
  await visit(page, '/')
  await expect(page.getByRole('button', { name: 'تقليل حركة الصفحة', exact: true })).toHaveCount(0)
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'system')
  await expect.poll(() => page.evaluate(() => localStorage.getItem('heba-motion'))).toBeNull()
  await page.evaluate(() => window.scrollTo(0, 1000))
  const top = page.getByRole('button', { name: 'العودة إلى بداية الصفحة' })
  await expect(top).toBeVisible()
  const box = await top.boundingBox(); expect(box!.width).toBeGreaterThanOrEqual(44); expect(box!.height).toBeGreaterThanOrEqual(44)
  await top.click()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
})
