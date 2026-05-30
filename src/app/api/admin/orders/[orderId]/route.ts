import { NextRequest } from 'next/server'
import { cleanText, createNotification, jsonError, jsonSuccess, now, requireAdmin, writeAdminLog } from '@/lib/server/admin-guard'

interface RouteContext {
  params: { orderId: string }
}

const actionMap: Record<string, string> = {
  confirm_payment: 'order_paid',
  grant_access: 'access_granted',
  reject_payment: 'order_rejected',
  cancel: 'order_cancelled',
  cancel_order: 'order_cancelled',
  refund: 'order_refunded',
  refund_order: 'order_refunded',
  note: 'order_note_added',
  add_note: 'order_note_added',
  mark_payment_submitted: 'order_payment_submitted',
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const admin = await requireAdmin(req, ['owner', 'super_admin', 'admin', 'finance'])
    if (admin instanceof Response) return admin

    const db = admin.db
    const orderId = cleanText(context.params.orderId, 160)
    if (!orderId) return jsonError('بيانات الطلب غير صحيحة.', 400)

    const body = (await req.json()) as Record<string, unknown>
    const action = actionMap[cleanText(body.action, 80)]
    if (!action) return jsonError('إجراء الطلب غير مدعوم.', 400)

    const ref = db.collection('orders').doc(orderId)
    const snap = await ref.get()
    if (!snap.exists) return jsonError('الطلب غير موجود.', 404)
    const before = snap.data() || {}
    const update: Record<string, unknown> = { updatedAt: now(), updatedBy: admin.uid }
    let title = 'تم تحديث طلبك'
    let notificationMessage = 'تم تحديث حالة الطلب داخل حسابك.'

    if (action === 'order_payment_submitted') {
      update.status = 'payment_submitted'
      update.paymentStatus = 'submitted'
      update.paymentSubmittedAt = now()
      title = 'تم تسجيل إثبات الدفع'
      notificationMessage = 'تم وضع الطلب في قائمة مراجعة الدفع.'
    }
    if (action === 'order_paid') {
      update.status = 'paid'
      update.paymentStatus = 'confirmed'
      update.paidAt = now()
      update.paidBy = admin.uid
      title = 'تم تأكيد الدفع'
      notificationMessage = 'تم تأكيد الدفع وسيتم فتح المحتوى بعد التحقق من الربط.'
      await db.collection('payment_attempts').add({
        userId: before.userId || '',
        orderId,
        amount: Number(before.amount || before.finalAmount || 0),
        currency: 'EGP',
        method: before.paymentMethod || 'manual',
        reference: before.paymentReference || '',
        proofUrl: before.paymentProofUrl || '',
        status: 'confirmed',
        confirmedBy: admin.uid,
        createdAt: now(),
        updatedAt: now(),
      })
    }
    if (action === 'access_granted') {
      update.status = 'access_granted'
      update.paymentStatus = 'confirmed'
      update.accessGrantedAt = now()
      update.accessGrantedBy = admin.uid
      title = 'تم فتح المحتوى'
      notificationMessage = 'يمكنك الآن الدخول إلى المحتوى من لوحة حسابك.'
      await db.collection('access_records').add({
        userId: before.userId || '',
        productId: before.productId || '',
        productType: before.productType || '',
        orderId,
        status: 'active',
        grantedBy: admin.uid,
        grantedAt: now(),
      })
    }
    if (action === 'order_rejected') {
      const reason = cleanText(body.reason || body.rejectionReason, 1200)
      if (!reason) return jsonError('سبب الرفض مطلوب.', 400)
      update.status = 'rejected'
      update.paymentStatus = 'failed'
      update.rejectionReason = reason
      update.rejectedAt = now()
      title = 'تمت مراجعة الطلب'
      notificationMessage = reason
    }
    if (action === 'order_cancelled') {
      update.status = 'cancelled'
      update.cancellationReason = cleanText(body.reason, 1200)
      update.cancelledAt = now()
      title = 'تم إلغاء الطلب'
      notificationMessage = 'تم تحديث حالة الطلب إلى ملغي.'
    }
    if (action === 'order_refunded') {
      update.status = 'refunded'
      update.paymentStatus = 'refunded'
      update.refundReason = cleanText(body.reason, 1200)
      update.refundedAt = now()
      title = 'تم تسجيل الاسترداد'
      notificationMessage = 'تم تحديث الطلب كاسترداد داخل حسابك.'
    }
    if (action === 'order_note_added') {
      update.adminNote = cleanText(body.note || body.adminNote, 2000)
    }

    await ref.set(update, { merge: true })
    await writeAdminLog({ db, adminId: admin.uid, adminEmail: admin.email, action, targetType: 'orders', targetId: orderId, before, after: update, message: `${action} - ${before.productTitle || before.productId || orderId}` })
    await ref.collection('timeline').add({ action, title, by: admin.email, note: cleanText(body.reason || body.note, 1200), createdAt: now() })
    if (before.userId && action !== 'order_note_added') {
      await createNotification({ db, userId: String(before.userId), role: 'user', type: action, title, message: notificationMessage, href: '/dashboard/orders', entityType: 'order', entityId: orderId, priority: action === 'order_rejected' ? 'high' : 'normal' })
    }

    return jsonSuccess({ values: update })
  } catch (error) {
    console.error('Admin order shim error:', error)
    return jsonError('تعذر تنفيذ العملية الآن.', 500)
  }
}
