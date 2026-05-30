import type { User as FirebaseUser } from 'firebase/auth'

export interface AdminActionPayload {
  action: string
  targetType: string
  targetId?: string
  values?: Record<string, unknown>
}

export async function runAdminAction(firebaseUser: FirebaseUser | null, payload: AdminActionPayload) {
  if (!firebaseUser) throw new Error('يجب تسجيل الدخول كأدمن.')
  const token = await firebaseUser.getIdToken()
  const response = await fetch('/api/admin/actions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  const data = (await response.json().catch(() => ({}))) as { success?: boolean; error?: string; data?: unknown }

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'تعذر تنفيذ الإجراء.')
  }

  return data.data
}

export async function fetchAdminApi<T>(firebaseUser: FirebaseUser | null, path: string, init?: RequestInit): Promise<T> {
  if (!firebaseUser) throw new Error('يجب تسجيل الدخول كأدمن.')
  const token = await firebaseUser.getIdToken()
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  })
  const data = (await response.json().catch(() => ({}))) as { error?: string }
  if (!response.ok) throw new Error(data.error || 'تعذر تحميل البيانات.')
  return data as T
}
