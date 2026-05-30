'use client'

import { auth } from '@/lib/firebase/client'

export async function runAdminAction(params: {
  action: string
  targetType: string
  targetId: string
  values?: Record<string, unknown>
}) {
  const token = await auth.currentUser?.getIdToken()
  if (!token) throw new Error('No authenticated admin user.')

  const response = await fetch('/api/admin/actions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  })

  const payload = (await response.json()) as { success?: boolean; error?: string; after?: Record<string, unknown> }
  if (!response.ok || !payload.success) throw new Error(payload.error || 'Admin action failed.')
  return payload.after || {}
}
