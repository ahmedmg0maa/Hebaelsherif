import { mkdir } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'

const evidenceDir = 'docs/evidence/visual-customer-experience/experience-sprint'

async function visit(page: Page, path: string) {
  const response = await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  expect(response?.status()).toBeLessThan(400)
  await page.evaluate(() => document.fonts.ready)
  const logo = page.getByAltText('شعار هبة الشريف').first()
  if (await logo.count()) {
    await expect.poll(() => logo.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true)
  }
}

async function expectNoOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }))
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width + 1)
}

test.beforeAll(async () => mkdir(evidenceDir, { recursive: true }))

test('home exposes three clearly-labelled, non-persistent customer journeys', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await visit(page, '/')
  await expect(page.getByRole('heading', { name: 'لا تكتفي بالمشاهدة — جرّبي الرحلة بنفسك' })).toBeVisible()
  await expect(page.getByText('لا بيانات حقيقية')).toBeVisible()
  await expect(page.getByRole('link', { name: /اختاري الموعد وراجعي كل خطوة/ })).toHaveAttribute('href', '/booking')
  await expect(page.getByRole('link', { name: /تعلّمي واكتبي وتابعي تقدّمك/ })).toHaveAttribute('href', '/courses/preview-clarity-journey')
  await expect(page.getByRole('link', { name: /قارئة هادئة بخمسة فصول/ })).toHaveAttribute('href', '/books/preview-listen-inward')
  await expectNoOverflow(page)
  await page.screenshot({ path: `${evidenceDir}/home-experience-desktop-1440.png`, fullPage: true })

  await page.setViewportSize({ width: 390, height: 844 })
  await visit(page, '/')
  await expectNoOverflow(page)
  await page.screenshot({ path: `${evidenceDir}/home-experience-mobile-390.png`, fullPage: true })
})

test('course provides nine interactive lessons and session-only progress', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await visit(page, '/courses/preview-clarity-journey')
  await expect(page.getByText('تجربة عرض أصلية · لا شراء ولا استحقاق')).toBeVisible()
  await page.getByRole('link', { name: 'ابدئي الدرس الأول' }).click()
  await expect(page.getByRole('heading', { name: 'تعلّمي وطبّقي الآن' })).toBeVisible()
  await expect(page.locator('nav, aside').getByRole('button')).toHaveCount(9)
  await page.getByLabel('اكتبي ملاحظتك لنفسك').fill('سأختار سؤالًا واحدًا يحتاج إلى معلومة واضحة.')
  await page.getByRole('button', { name: 'علّمي الدرس كمكتمل' }).click()
  await expect(page.getByLabel(/اكتمل/)).toHaveAttribute('aria-label', /١١٪|11٪/)
  await page.getByRole('button', { name: /الفرق بين الفكرة والحقيقة/ }).click()
  await expect(page.getByRole('heading', { name: 'الفرق بين الفكرة والحقيقة' })).toBeVisible()
  await page.waitForTimeout(800)
  await expectNoOverflow(page)
  await page.screenshot({ path: `${evidenceDir}/course-experience-desktop-1440.png`, fullPage: false })

  await page.setViewportSize({ width: 390, height: 844 })
  await visit(page, '/courses/preview-clarity-journey')
  await page.getByRole('link', { name: 'ابدئي الدرس الأول' }).click()
  await expectNoOverflow(page)
  await page.screenshot({ path: `${evidenceDir}/course-experience-mobile-390.png`, fullPage: false })
})

test('book reader exposes all original chapters and reading controls', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await visit(page, '/books/preview-listen-inward')
  await expect(page.getByText('كتاب تجربة أصلي · لا شراء ولا تنزيل')).toBeVisible()
  await page.getByRole('link', { name: 'افتحي قارئة الكتاب' }).click()
  await expect(page.getByRole('heading', { name: 'اقرئي الكتاب كاملًا كتجربة' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'فصول الكتاب' }).getByRole('button')).toHaveCount(5)
  await page.getByRole('button', { name: /حجم الخط/ }).click()
  await expect(page.getByRole('button', { name: 'حجم الخط: كبير' })).toBeVisible()
  await page.getByRole('button', { name: /وضع القراءة/ }).click()
  await expect(page.getByRole('button', { name: 'وضع القراءة: ليلي' })).toBeVisible()
  await page.getByRole('button', { name: /الأصوات المستعارة/ }).click()
  await expect(page.getByRole('heading', { name: 'الأصوات المستعارة' })).toBeVisible()
  await page.waitForTimeout(800)
  await expectNoOverflow(page)
  await page.screenshot({ path: `${evidenceDir}/book-reader-desktop-1440.png`, fullPage: false })
})

test('booking preview completes without network persistence or file upload', async ({ page }) => {
  const writeRequests: string[] = []
  page.on('request', (request) => {
    if (request.method() !== 'GET' && request.method() !== 'HEAD') writeRequests.push(`${request.method()} ${new URL(request.url()).pathname}`)
  })

  await page.setViewportSize({ width: 1440, height: 1000 })
  await visit(page, '/booking')
  await expect(page.getByText('تجربة عرض آمنة — لا حجز ولا دفع حقيقي')).toBeVisible()
  await page.getByRole('button', { name: 'متابعة' }).click()
  const datePanel = page.getByRole('heading', { name: 'اختاري تاريخ الجلسة' }).locator('..')
  await datePanel.locator('button:not([disabled])').first().click()
  await page.getByRole('button', { name: 'متابعة' }).click()
  const timePanel = page.getByRole('heading', { name: 'اختاري وقت الجلسة' }).locator('..')
  await timePanel.locator('button').first().click()
  await page.getByRole('button', { name: 'متابعة' }).click()
  await page.getByLabel('الاسم الكامل').fill('عميلة تجربة')
  await page.getByLabel('رقم الهاتف').fill('01000000000')
  await page.getByLabel('سؤال أو ملاحظة قبل الجلسة').fill('هذه ملاحظة Preview ولا يجب حفظها.')
  await page.getByRole('button', { name: 'متابعة' }).click()
  await expect(page.getByText(/لا يوجد حجز في قاعدة البيانات/)).toBeVisible()
  await page.getByRole('button', { name: 'تثبيت الموعد والانتقال للدفع' }).click()
  await expect(page.getByText('محاكاة الدفع اليدوي')).toBeVisible()
  await page.getByLabel(/اختاري صورة لمحاكاة إرفاق الإيصال/).setInputFiles({ name: 'preview-proof.png', mimeType: 'image/png', buffer: Buffer.from('preview-only') })
  await page.getByRole('button', { name: 'إكمال المحاكاة بأمان' }).click()
  const completeHeading = page.getByRole('heading', { name: 'اكتملت محاكاة الحجز بنجاح' })
  await expect(completeHeading).toBeVisible()
  await expect(page.getByText(/لم يُنشأ حجز أو طلب أو دفع/)).toBeVisible()
  expect(writeRequests).toEqual([])
  await completeHeading.scrollIntoViewIfNeeded()
  await page.screenshot({ path: `${evidenceDir}/booking-preview-complete-desktop-1440.png`, fullPage: false })
})

test('preview pages remain usable at 390px and with reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  for (const route of ['/booking', '/courses/preview-clarity-journey', '/books/preview-listen-inward']) {
    await visit(page, route)
    await expectNoOverflow(page)
  }
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await visit(page, '/')
  const orbitAnimation = await page.locator('.experience-orb').first().evaluate((node) => getComputedStyle(node).animationName)
  expect(orbitAnimation).toBe('none')
  await expect(page.getByRole('heading', { name: 'لا تكتفي بالمشاهدة — جرّبي الرحلة بنفسك' })).toBeVisible()
})
