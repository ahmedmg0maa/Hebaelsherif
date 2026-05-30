import { auth } from '@/lib/firebase/client'

export async function callAdminApi<TResponse = { success?: boolean; error?: string }>(url: string, body?: Record<string, unknown>, method = 'POST') {
  const currentUser = auth.currentUser
  if (!currentUser) throw new Error('يجب تسجيل الدخول كمدير أولًا.')

  const token = await currentUser.getIdToken()
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: method === 'GET' ? undefined : JSON.stringify(body || {}),
  })

  const data = (await response.json().catch(() => ({}))) as TResponse & { error?: string }
  if (!response.ok) throw new Error(data.error || 'تعذر تنفيذ العملية الآن.')
  return data
}
