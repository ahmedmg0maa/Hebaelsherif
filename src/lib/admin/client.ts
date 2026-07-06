import type { User as SupabaseLegacyUser } from '@/lib/supabase/auth-token-compat'

export interface AdminActionPayload {
  action: string
  targetType: string
  targetId?: string
  values?: Record<string, unknown>
}

export async function runAdminAction(sessionUser: SupabaseLegacyUser | null, payload: AdminActionPayload) {
  if (!sessionUser) throw new Error('يجب تسجيل الدخول كأدمن.')
  const token = await sessionUser.getIdToken()
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

export async function fetchAdminApi<T>(sessionUser: SupabaseLegacyUser | null, path: string, init?: RequestInit): Promise<T> {
  if (!sessionUser) throw new Error('يجب تسجيل الدخول كأدمن.')
  const token = await sessionUser.getIdToken()
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
