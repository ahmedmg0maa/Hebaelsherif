import { expect, test, type Page } from '@playwright/test'

const publicRoutes = ['/', '/start-here', '/search', '/courses', '/books', '/workshops', '/services', '/programs', '/booking', '/about', '/testimonials', '/press', '/resources', '/contact', '/faq']
const visit = (page: Page, route: string) => page.goto(route, { waitUntil: 'domcontentloaded', timeout: 60_000 })

test.describe('public experience', () => {
  for (const route of publicRoutes) {
    test(`${route} renders without server or encoding errors`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 60_000 })
      expect(response?.status()).toBeLessThan(500)
      await expect(page.locator('body')).toBeVisible()
      await expect(page.getByRole('heading',{name:'حدث خطأ غير متوقع'})).toHaveCount(0)
      await expect(page.locator('body')).not.toContainText(/Ø§|Ù„|Ã|�/)
    })
  }

  test('home has branded navigation and a clear primary journey', async ({ page }) => {
    await visit(page, '/')
    await expect(page.getByRole('link', { name: /هبة الشريف/ }).first()).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('link', { name: /ابدئي|اكتشفي|احجزي/ }).first()).toBeVisible()
  })

  test('keyboard users can skip public chrome to the page content', async ({ page }) => {
    await visit(page, '/')
    const skipLink = page.getByRole('link', { name: 'تخطّي إلى المحتوى' })
    await skipLink.focus()
    await expect(skipLink).toBeVisible()
    await skipLink.press('Enter')
    await expect(page.locator('#main-content')).toBeFocused()
  })

  test('dark theme toggles and persists after navigation', async ({ page }) => {
    // Make the assertion deterministic across host OS color preferences while
    // still proving the persisted toggle after a navigation.
    await page.addInitScript(() => {
      if (!localStorage.getItem('heba-theme')) localStorage.setItem('heba-theme', 'light')
    })
    await visit(page, '/')
    // vinext streams the shell before its client module is interactive. Wait
    // for that module rather than treating the server-rendered button as live.
    await page.waitForTimeout(1_000)
    const mobile = (page.viewportSize()?.width ?? 1280) < 1280
    if (mobile) {
      const menu = page.locator('[aria-controls="public-mobile-navigation"]')
      await expect(menu).toBeEnabled()
      await menu.click()
      await expect(menu).toHaveAttribute('aria-expanded', 'true')
    }
    const toggle = page.getByRole('button', { name: 'تبديل الوضع الفاتح والداكن' })
    const activeToggle = mobile ? toggle.last() : toggle.first()
    await expect(activeToggle).toBeEnabled()
    await activeToggle.click()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await visit(page, '/booking')
    await expect(page.locator('html')).toHaveClass(/dark/)
    const background = await page.locator('body').evaluate((node) => getComputedStyle(node).backgroundColor)
    expect(background).not.toBe('rgb(255, 255, 255)')
  })

  test('mobile navigation traps focus and restores it on Escape', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await visit(page, '/')
    const trigger = page.getByRole('button', { name: 'فتح القائمة', exact: true })
    await expect(trigger).toBeEnabled()
    await trigger.click()
    const dialog = page.getByRole('dialog', { name: 'القائمة الرئيسية' })
    await expect(dialog).toBeVisible()
    for (let index = 0; index < 18; index++) {
      await page.keyboard.press('Tab')
      expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true)
    }
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
    await expect(trigger).toBeFocused()
  })

  test('home learning tour changes panels using the keyboard', async ({ page }) => {
    await visit(page, '/')
    const lessons=page.getByRole('tab', {name:'دروس المسار'})
    await lessons.focus()
    await lessons.press('ArrowLeft')
    await expect(page.getByRole('tab', {name:'ملاحظاتك'})).toBeFocused()
    await expect(page.getByRole('heading', {name:'مساحة لأفكارك'})).toBeVisible()
    await page.keyboard.press('Home')
    await expect(lessons).toHaveAttribute('aria-selected','true')
  })

  test('booking presents either published availability or a truthful empty state', async ({ page }) => {
    await visit(page, '/booking')
    const emptyState = page.getByRole('heading', { name: /لا توجد جلسات مفتوحة للحجز الآن|الحجز غير متاح حاليًا/ })

    if (await emptyState.isVisible()) {
      await expect(emptyState).toBeVisible()
      await expect(page.getByRole('link', { name: 'استكشفي المسارات' })).toHaveAttribute('href', '/services')
      return
    }

    await expect(page.getByRole('list', { name: 'خطوات الحجز' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'اختاري نوع الجلسة' })).toBeVisible()
    await expect(page.getByText('ملخص الحجز')).toBeVisible()
  })

  test('unconfigured public services do not promise payment or contact delivery', async ({ page }) => {
    await visit(page, '/faq')
    await page.getByText('ما وسائل الدفع المتاحة؟').click()
    await expect(page.getByText('لا توجد وسيلة دفع مفعّلة حاليًا')).toBeVisible()

    await visit(page, '/contact')
    await expect(page.getByRole('heading', { name: 'قناة التواصل غير مهيّأة حاليًا' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'أرسلي الرسالة' })).toHaveCount(0)
  })

  test('testimonials never fabricate social proof when no governed source is configured', async ({ page }) => {
    await visit(page, '/testimonials')
    await expect(page.getByRole('heading', { name: 'ما اختارت العميلات مشاركته' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'لا توجد تجارب موثقة منشورة في هذا القسم' })).toBeVisible()
    await expect(page.getByText('شراء موثّق')).toHaveCount(0)
  })

  test('press never fabricates authority when no governed source is configured', async ({ page }) => {
    await visit(page, '/press')
    await expect(page.getByRole('heading', { name: 'ظهور موثّق، لا ادعاءات' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'لا توجد مصادر موثقة منشورة في هذا القسم' })).toBeVisible()
    await expect(page.getByRole('link', { name: /المصدر الأصلي/ })).toHaveCount(0)
  })

  test('resources hide empty or unconfigured media journeys', async ({ page }) => {
    await visit(page, '/resources')
    await expect(page.getByRole('heading', { name: 'موارد تساعدك على الفهم والتطبيق' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'لا توجد موارد منشورة بهذه المواصفات' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'افتحي المورد' })).toHaveCount(0)
  })

  test('program discovery hides incomplete or unconfigured commercial journeys', async ({ page }) => {
    await visit(page, '/programs')
    await expect(page.getByRole('heading', { name: 'اختاري تجربة مكتملة وواضحة' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'لا توجد برامج منشورة بهذه المواصفات' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'شاهدي التفاصيل' })).toHaveCount(0)
  })

  test('newsletter intake is hidden rather than dead when secure persistence is unavailable', async ({ page }) => {
    await visit(page, '/')
    await expect(page.getByRole('button', { name: 'اشتركي بموافقتك' })).toHaveCount(0)
  })

  test('start-here recommendations link to published catalogs rather than invented product slugs', async ({ page }) => {
    await visit(page, '/start-here')
    await expect(page.getByRole('link', { name: 'استكشفي الدورات' }).first()).toHaveAttribute('href', '/courses')
    await expect(page.getByRole('link', { name: 'تصفحي الكتب' }).first()).toHaveAttribute('href', '/books')
  })

  test('start-here flow completes by keyboard with an announced deterministic result', async ({ page }) => {
    await visit(page, '/start-here')
    await expect(page.locator('[data-start-here-quiz]')).toHaveAttribute('data-hydrated', 'true')
    const progress = page.getByRole('progressbar', { name: 'تقدم الاختبار' })
    const firstOption = page.getByRole('button', { name: 'تشتت واحتياج لوضوح' })
    await firstOption.focus()
    await firstOption.press('Enter')
    await expect(progress).toHaveAttribute('aria-valuenow', '1')
    const undo = page.getByRole('button', { name: 'الرجوع عن آخر إجابة' })
    await undo.focus()
    await undo.press('Enter')
    await expect(progress).toHaveAttribute('aria-valuenow', '0')
    await expect(firstOption).toHaveAttribute('aria-pressed', 'false')
    for (const label of ['تشتت واحتياج لوضوح', 'جلسة مركزة وشخصية', 'تفكيك سؤال شخصي']) {
      const option = page.getByRole('button', { name: label })
      await option.focus()
      await option.press('Enter')
      await expect(option).toHaveAttribute('aria-pressed', 'true')
      await expect(page.locator('[data-start-here-quiz] fieldset')).toHaveCount(1)
      await page.getByRole('button', { name: label === 'تفكيك سؤال شخصي' ? 'اكتشفي مسارك' : 'السؤال التالي', exact: true }).press('Enter')
    }
    await expect(page.getByRole('status').filter({ hasText: 'قد يناسبك استكشاف الجلسات المنشورة' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'استكشفي الجلسات' })).toHaveAttribute('href', '/booking')
    const edit = page.getByRole('button', { name: 'تعديل الإجابات' })
    await edit.focus()
    await edit.press('Enter')
    await expect(progress).toHaveAttribute('aria-valuenow', '3')
    await expect(firstOption).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('status').filter({ hasText: 'قد يناسبك استكشاف الجلسات المنشورة' })).toHaveCount(0)
  })

  test('search is discoverable, published-only, and honest when no source is configured', async ({ page }) => {
    await visit(page, '/search?q=حدود')
    await expect(page.getByRole('search')).toBeVisible()
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
    await expect(page.getByRole('heading', { name: 'لا توجد نتائج منشورة' })).toBeVisible()
  })

  test('captures the truthful local states for visual QA', async ({ page }, testInfo) => {
    const mobile = testInfo.project.name.includes('mobile')
    await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 })
    await visit(page, '/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('link', { name: /ابدئي|اكتشفي|احجزي/ }).first()).toBeVisible()
    const dimensions = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }))
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width + 1)

    await page.screenshot({
      path: testInfo.outputPath(mobile ? 'launch-home-mobile-390.png' : 'launch-home-desktop-1440.png'),
      fullPage: false,
    })
  })

  test('auth pages are isolated from the public chrome', async ({ page }) => {
    await visit(page, '/auth/admin')
    await expect(page.getByRole('heading', { name: /دخول الإدارة/ })).toBeVisible()
    await expect(page.locator('input[type="email"]')).toHaveCount(0)
    await expect(page.locator('input[type="password"]')).toHaveCount(1)
    await expect(page.locator('header')).toHaveCount(0)
    await expect(page.locator('footer')).toHaveCount(0)
    await visit(page, '/auth/update-password')
    await expect(page.getByRole('heading', { name: 'عيّني كلمة مرور جديدة' })).toBeVisible()
    await expect(page.locator('input[type="password"]')).toHaveCount(2)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  })

  test('anonymous dashboard and admin access are guarded', async ({ page }) => {
    await visit(page, '/dashboard')
    await expect(page).toHaveURL(/\/auth\/login/)
    await visit(page, '/admin/overview')
    await expect(page).toHaveURL(/\/auth\/admin/)
  })

  test('mobile layout has no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    for (const route of ['/', '/booking', '/courses']) {
      await visit(page, route)
      const dimensions = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }))
      expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width + 1)
    }
  })

  test('tablet and phone layouts preserve content without horizontal clipping', async ({ page }) => {
    for (const viewport of [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
      await page.setViewportSize(viewport)
      for (const route of ['/', '/booking', '/courses', '/faq']) {
        await visit(page, route)
        await expect(page.getByRole('heading').first()).toBeVisible()
        const dimensions = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }))
        expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width + 1)
      }
    }
  })

  test('reduced motion keeps the primary journey visible', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await visit(page, '/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const motion = await page.getByRole('heading', { level: 1 }).evaluate((node) => getComputedStyle(node).animationName)
    expect(motion).toBe('none')
  })

  test('draft legal routes are noindex and absent from the sitemap', async ({ page }) => {
    for (const route of ['/privacy', '/terms', '/refund', '/disclaimer', '/session-policy']) {
      await visit(page, route)
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
    }
    await visit(page, '/sitemap.xml')
    const sitemap = await page.locator('body').innerText()
    for (const route of ['/privacy', '/terms', '/refund', '/disclaimer', '/session-policy']) expect(sitemap).not.toContain(route)
  })
})
