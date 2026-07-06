import type { User as SupabaseLegacyUser } from '@/lib/supabase/auth-token-compat'

export async function sendAdminRequest<TResponse = { success: boolean }>(
  sessionUser: SupabaseLegacyUser | null | undefined,
  endpoint: string,
  payload?: Record<string, unknown>,
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' = 'POST',
): Promise<TResponse> {
  if (!sessionUser) throw new Error('يجب تسجيل الدخول بحساب أدمن.')
  const token = await sessionUser.getIdToken()
  const response = await fetch(endpoint, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: method === 'GET' ? undefined : JSON.stringify(payload || {}),
  })
  const data = (await response.json().catch(() => ({}))) as TResponse & { error?: string }
  if (!response.ok) throw new Error(data.error || 'تعذر تنفيذ الإجراء.')
  return data
}

export async function postAdminAction<TResponse = { success: boolean }>(
  sessionUser: SupabaseLegacyUser | null | undefined,
  endpoint: string,
  payload: Record<string, unknown>,
): Promise<TResponse> {
  return sendAdminRequest<TResponse>(sessionUser, endpoint, payload, 'POST')
}

export async function patchAdminAction<TResponse = { success: boolean }>(
  sessionUser: SupabaseLegacyUser | null | undefined,
  endpoint: string,
  payload: Record<string, unknown>,
): Promise<TResponse> {
  return sendAdminRequest<TResponse>(sessionUser, endpoint, payload, 'PATCH')
}

export async function getAdminData<TResponse>(sessionUser: SupabaseLegacyUser | null | undefined, endpoint: string): Promise<TResponse> {
  if (!sessionUser) throw new Error('يجب تسجيل الدخول بحساب أدمن.')
  const token = await sessionUser.getIdToken()
  const response = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = (await response.json().catch(() => ({}))) as TResponse & { error?: string }
  if (!response.ok) throw new Error(data.error || 'تعذر تحميل البيانات.')
  return data
}
