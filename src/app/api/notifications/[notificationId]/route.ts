import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase/admin'
import { cleanText, getAuthenticatedUser, jsonError, now } from '@/lib/server/adminApi'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { notificationId: string } }) {
  try {
    const user = await getAuthenticatedUser(req)
    if (!user) return jsonError('يجب تسجيل الدخول.', 401)

    const id = cleanText(params.notificationId, 140)
    const db = getAdminDb()
    const ref = db.collection('notifications').doc(id)
    const snap = await ref.get()
    if (!snap.exists) return jsonError('الإشعار غير موجود.', 404)

    const data = snap.data() || {}
    const allowed = data.userId === user.uid || (data.adminOnly === true && ['admin', 'owner', 'super_admin'].includes(user.role))
    if (!allowed) return jsonError('غير مصرح لك بتعديل هذا الإشعار.', 403)

    await ref.set({ read: true, readAt: now(), readBy: user.uid }, { merge: true })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Notification PATCH error:', error)
    return jsonError('تعذر تحديث الإشعار.', 500)
  }
}
