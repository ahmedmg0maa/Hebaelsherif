import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { expect, test } from '@playwright/test'

const adminEmail = 'codex-admin-qa@example.com'
const learnerEmail = 'codex-learner-qa@example.com'
const adminPassword = `Codex!${randomUUID()}Aa7`
const learnerPassword = `Codex!${randomUUID()}Aa7`
const createdUserIds: string[] = []

function serviceClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) process.loadEnvFile('.env')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

test.describe('authenticated workspaces', () => {
  test.describe.configure({ mode: 'serial' })
  test.beforeAll(async ({}, testInfo) => {
    if (testInfo.project.name.includes('mobile')) return
    const service = serviceClient()
    const { data: existing } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 })
    for (const user of existing.users.filter((item) => item.email === adminEmail || item.email === learnerEmail)) {
      await service.auth.admin.deleteUser(user.id)
    }

    const admin = await service.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { full_name: 'مسؤولة اختبار مؤقتة' },
    })
    const learner = await service.auth.admin.createUser({
      email: learnerEmail,
      password: learnerPassword,
      email_confirm: true,
      user_metadata: { full_name: 'متعلّمة اختبار مؤقتة' },
    })
    if (admin.error || !admin.data.user || learner.error || !learner.data.user)
      throw new Error(`Unable to create temporary QA users: ${admin.error?.message ?? learner.error?.message}`)

    createdUserIds.push(admin.data.user.id, learner.data.user.id)
    const { error: roleError } = await service.from('admin_roles').insert({ user_id: admin.data.user.id, role: 'admin' })
    if (roleError) throw roleError
  })

  test.afterAll(async () => {
    const service = serviceClient()
    for (const id of createdUserIds) await service.auth.admin.deleteUser(id)
  })

  test('admin password entry continues to the mandatory MFA gate', async ({ page }) => {
    test.skip(test.info().project.name.includes('mobile'), 'temporary authenticated QA runs once on desktop')
    await page.goto('/auth/admin')
    await page.locator('input[type="email"]').fill(adminEmail)
    await page.locator('input[type="password"]').fill(adminPassword)
    await page.getByRole('button', { name: 'دخول لوحة الإدارة' }).click()
    await expect(page).toHaveURL(/\/auth\/admin\/mfa/, { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: 'تأكيد حماية الإدارة' })).toBeVisible()
  })

  test('learner signs in and sees the learner workspace', async ({ page }) => {
    test.skip(test.info().project.name.includes('mobile'), 'temporary authenticated QA runs once on desktop')
    await page.goto('/auth/login')
    await page.locator('input[type="email"]').fill(learnerEmail)
    await page.locator('input[type="password"]').fill(learnerPassword)
    await page.getByRole('button', { name: 'تسجيل الدخول' }).click()
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 })
    await expect(page.getByText('مساحة التعلّم').first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'الموقع الرئيسي' })).toBeVisible()
  })
})
