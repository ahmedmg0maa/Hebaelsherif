'use client'

import type { User as FirebaseUser } from 'firebase/auth'

async function getToken(firebaseUser: FirebaseUser | null | undefined) {
  if (!firebaseUser) throw new Error('يلزم تسجيل الدخول كأدمن.')
  return firebaseUser.getIdToken()
}

export async function postAdminAction<TPayload extends Record<string, unknown>>(firebaseUser: FirebaseUser | null | undefined, url: string, payload: TPayload) {
  const token = await getToken(firebaseUser)
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
