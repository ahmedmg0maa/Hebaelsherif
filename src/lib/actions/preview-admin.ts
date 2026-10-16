'use server'

import { redirect } from 'next/navigation'
import { clearPreviewAdminSession, establishPreviewAdminSession, isPreviewAdminConfigured, verifyPreviewAdminCredentials } from '@/lib/preview/admin-session'

export type PreviewAdminLoginState = { error: string | null }

export async function loginPreviewAdmin(_state: PreviewAdminLoginState, formData: FormData): Promise<PreviewAdminLoginState> {
  if (!isPreviewAdminConfigured()) return { error: 'بوابة المراجعة غير مهيأة في هذه البيئة.' }
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')
  if (!await verifyPreviewAdminCredentials(email, password)) {
    await new Promise((resolve) => setTimeout(resolve, 700))
    return { error: 'تعذّر الدخول. راجعي بيانات دخول المعاينة.' }
  }
  if (!await establishPreviewAdminSession()) return { error: 'تعذّر إنشاء جلسة المراجعة.' }
  redirect('/preview-admin')
}

export async function logoutPreviewAdmin() {
  await clearPreviewAdminSession()
  redirect('/preview-admin')
}
