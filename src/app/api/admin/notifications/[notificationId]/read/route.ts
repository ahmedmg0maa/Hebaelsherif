import { NextRequest } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { cleanText, isAdminResponse, jsonError, jsonSuccess, requireAdmin } from '@/lib/admin/api'

export async function PATCH(req: NextRequest, { params }: { params: { notificationId: string } }) {
  const admin = await requireAdmin(req, 'logs:read')
  if (isAdminResponse(admin)) return admin
  const notificationId = cleanText(params.notificationId, 120)
  if (!notificationId) return jsonError('الإشعار غير صحيح.', 400)

  try {
    await admin.db.collection('notifications').doc(notificationId).set({ read: true, readAt: Timestamp.now() }, { merge: true })
    return jsonSuccess()
  } catch (error) {
    console.error('Notification read error:', error)
    return jsonError('تعذر تحديث الإشعار.', 500)
  }
}
