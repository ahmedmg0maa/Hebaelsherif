'use client'

import type { User as SupabaseLegacyUser } from '@/lib/supabase/auth-token-compat'

async function getToken(sessionUser: SupabaseLegacyUser | null | undefined) {
  if (!sessionUser) throw new Error('يلزم تسجيل الدخول كأدمن.')
  return sessionUser.getIdToken()
}

export async function postAdminAction<TPayload extends Record<string, unknown>>(sessionUser: SupabaseLegacyUser | null | undefined, url: string, payload: TPayload) {
  const token = await getToken(sessionUser)
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
  const data = (await response.json().catch(() => ({}))) as { error?: string; success?: boolean; values?: Record<string, unknown> }
  if (!response.ok) throw new Error(data.error || 'تعذر تنفيذ الإجراء.')
  return data
}
