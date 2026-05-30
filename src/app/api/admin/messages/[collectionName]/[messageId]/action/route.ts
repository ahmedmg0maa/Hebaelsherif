import { NextRequest } from 'next/server'
import { cleanText, jsonError, jsonSuccess, now, requireAdmin, writeAdminLog } from '@/lib/server/admin-guard'

interface RouteContext {
  params: { collectionName: string; messageId: string }
}

const allowedCollections = new Set(['contact_messages', 'leads', 'newsletter_subscribers'])
const allowedStatuses = new Set(['new', 'read', 'replied', 'important', 'archived', 'contacted', 'converted'])

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const admin = await requireAdmin(req, ['owner', 'super_admin', 'admin', 'support'])
    if (admin instanceof Response) return admin

    const collectionName = cleanText(context.params.collectionName, 120)
    const messageId = cleanText(context.params.messageId, 160)
    if (!allowedCollections.has(collectionName) || !messageId) return jsonError('بيانات الرسالة غير صحيحة.', 400)

    const body = (await req.json()) as { status?: unknown; note?: unknown; intent?: unknown }
    const status = cleanText(body.status, 80)
    if (!allowedStatuses.has(status)) return jsonError('حالة الرسالة غير مدعومة.', 400)

    const ref = admin.db.collection(collectionName).doc(messageId)
    const snap = await ref.get()
    if (!snap.exists) return jsonError('الرسالة غير موجودة.', 404)

    const update = {
      status,
      leadIntent: cleanText(body.intent, 120),
      adminNote: cleanText(body.note, 2000),
      updatedAt: now(),
      updatedBy: admin.uid,
    }
    await ref.set(update, { merge: true })
    await writeAdminLog({
      db: admin.db,
      adminId: admin.uid,
      adminEmail: admin.email,
      action: 'message_status_updated',
      targetType: collectionName,
      targetId: messageId,
      before: { status: snap.data()?.status || 'new' },
      after: update,
      message: `تم تحديث حالة الرسالة إلى ${status}`,
    })

    return jsonSuccess({ id: messageId, status })
  } catch (error) {
    console.error('Message action API error:', error)
    return jsonError('تعذر تحديث الرسالة الآن.', 500)
  }
}
