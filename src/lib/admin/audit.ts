import { Timestamp } from 'firebase-admin/firestore'
import type { getAdminDb } from '@/lib/firebase/admin'

export async function writeAdminLog(
  db: ReturnType<typeof getAdminDb>,
  params: {
    adminId: string
    adminEmail?: string
    action: string
    targetType: string
    targetId?: string
    before?: Record<string, unknown>
    after?: Record<string, unknown>
    message?: string
  },
) {
  await db.collection('admin_logs').add({
    ...params,
    createdAt: Timestamp.now(),
  })
}

export async function createNotification(
  db: ReturnType<typeof getAdminDb>,
  params: {
    title: string
    body: string
    type: string
    href?: string
    targetType?: string
    targetId?: string
    userId?: string
  },
) {
  await db.collection('notifications').add({
    ...params,
    status: 'unread',
    createdAt: Timestamp.now(),
  })
}
