import { NextRequest } from 'next/server'
import { cleanText, jsonError, jsonSuccess, now, requireUser } from '@/lib/server/admin-guard'

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req)
    if (user instanceof Response) return user

    const snap = await user.db
      .collection('notifications')
      .where('userId', 'in', [user.uid, ''])
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get()

    const notifications = snap.docs
      .map((docItem) => ({ id: docItem.id, ...docItem.data() }) as Record<string, unknown>)
      .filter((rawItem) => {
        const item = rawItem as Record<string, unknown>
        return item.userId === user.uid || (item.role === 'admin' && ['admin', 'owner', 'super_admin'].includes(String(user.role)))
      })

    return jsonSuccess({ notifications, items: notifications })
  } catch (error) {
    console.error('Notifications API error:', error)
    return jsonError('تعذر تحميل الإشعارات الآن.', 500)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser(req)
    if (user instanceof Response) return user

    const body = (await req.json()) as { id?: unknown; all?: unknown }
    const id = cleanText(body.id, 180)

    if (body.all === true) {
      const snap = await user.db.collection('notifications').where('userId', '==', user.uid).where('read', '==', false).limit(50).get()
      const batch = user.db.batch()
      snap.docs.forEach((docItem) => batch.set(docItem.ref, { read: true, readAt: now(), updatedAt: now() }, { merge: true }))
      await batch.commit()
      return jsonSuccess({ updated: snap.size })
    }

    if (!id) return jsonError('بيانات الإشعار غير صحيحة.', 400)
    const ref = user.db.collection('notifications').doc(id)
    const snap = await ref.get()
    if (!snap.exists || snap.data()?.userId !== user.uid) return jsonError('الإشعار غير موجود.', 404)
    await ref.set({ read: true, readAt: now(), updatedAt: now() }, { merge: true })
    return jsonSuccess({ id })
  } catch (error) {
    console.error('Notifications PATCH error:', error)
    return jsonError('تعذر تحديث الإشعار الآن.', 500)
  }
}


export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req)
    if (user instanceof Response) return user
    const body = (await req.json()) as { notificationId?: unknown }
    const notificationId = cleanText(body.notificationId, 180)
    if (!notificationId) return jsonError('بيانات الإشعار غير صحيحة.', 400)
    const ref = user.db.collection('notifications').doc(notificationId)
    const snap = await ref.get()
    if (!snap.exists) return jsonError('الإشعار غير موجود.', 404)
    const data = snap.data() || {}
    const allowed = data.userId === user.uid || (data.role === 'admin' && ['admin', 'owner', 'super_admin'].includes(String(user.role)))
    if (!allowed) return jsonError('لا توجد صلاحية لتعديل هذا الإشعار.', 403)
    await ref.set({ status: 'read', read: true, readAt: now(), updatedAt: now() }, { merge: true })
    return jsonSuccess({ id: notificationId })
  } catch (error) {
    console.error('Notifications POST error:', error)
    return jsonError('تعذر تحديث الإشعار الآن.', 500)
  }
}
