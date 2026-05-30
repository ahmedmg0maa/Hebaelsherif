import type { User as FirebaseUser } from 'firebase/auth'

export async function sendAdminRequest<TResponse = { success: boolean }>(
  firebaseUser: FirebaseUser | null | undefined,
  endpoint: string,
  payload?: Record<string, unknown>,
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' = 'POST',
): Promise<TResponse> {
  if (!firebaseUser) throw new Error('يجب تسجيل الدخول بحساب أدمن.')
  const token = await firebaseUser.getIdToken()
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
  firebaseUser: FirebaseUser | null | undefined,
  endpoint: string,
  payload: Record<string, unknown>,
): Promise<TResponse> {
  return sendAdminRequest<TResponse>(firebaseUser, endpoint, payload, 'POST')
}

export async function patchAdminAction<TResponse = { success: boolean }>(
  firebaseUser: FirebaseUser | null | undefined,
  endpoint: string,
  payload: Record<string, unknown>,
): Promise<TResponse> {
  return sendAdminRequest<TResponse>(firebaseUser, endpoint, payload, 'PATCH')
}

export async function getAdminData<TResponse>(firebaseUser: FirebaseUser | null | undefined, endpoint: string): Promise<TResponse> {
  if (!firebaseUser) throw new Error('يجب تسجيل الدخول بحساب أدمن.')
  const token = await firebaseUser.getIdToken()
  const response = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = (await response.json().catch(() => ({}))) as TResponse & { error?: string }
  if (!response.ok) throw new Error(data.error || 'تعذر تحميل البيانات.')
  return data
}
