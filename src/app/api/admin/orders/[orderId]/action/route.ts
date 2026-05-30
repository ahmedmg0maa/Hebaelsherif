import { NextRequest } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { asRecord, cleanString, createNotification, jsonError, jsonSuccess, requireAdmin } from '@/lib/server/admin-api'

const allowedActions = new Set([
  'mark_payment_submitted',
  'confirm_payment',
  'grant_access',
  'reject_payment',
  'cancel_order',
  'cancel',
  'refund_order',
  'refund',
  'add_note',
  'request_review',
])

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const { error, context } = await requireAdmin(req, ['owner', 'admin', 'super_admin', 'finance'])
    if (error || !context) return error

    const orderId = cleanString(params.orderId)
    if (!orderId) return jsonError('رقم الطلب غير صحيح.', 400)

    const body = asRecord(await req.json().catch(() => ({})))
    const action = cleanString(body.action)
    const note = cleanString(body.note)
    const reason = cleanString(body.reason)
    const paymentReference = cleanString(body.paymentReference)
    const paymentProofUrl = cleanString(body.paymentProofUrl)

    if (!allowedActions.has(action)) return jsonError('إجراء الطلب غير مدعوم.', 400)

    const orderRef = context.db.collection('orders').doc(orderId)
    const orderSnap = await orderRef.get()
    if (!orderSnap.exists) return jsonError('الطلب غير موجود.', 404)

    const before = orderSnap.data() || {}
    const userId = String(before.userId || '')
    const productTitle = String(before.productTitle || before.title || before.productId || 'المحتوى')
    const now = Timestamp.now()
    const update: Record<string, unknown> = { updatedAt: now, updatedBy: context.uid, lastAction: action }
    let logAction = `order_${action}`
    let notificationTitle = ''
    let notificationBody = ''

    if (action === 'mark_payment_submitted') {
      update.status = 'payment_submitted'
      update.paymentStatus = 'submitted'
      if (paymentReference) update.paymentReference = paymentReference
      if (paymentProofUrl) update.paymentProofUrl = paymentProofUrl
      notificationTitle = 'تم استلام إثبات الدفع'
      notificationBody = `تم تسجيل إثبات الدفع لطلب ${productTitle} وهو الآن قيد المراجعة.`
    }

    if (action === 'request_review') {
      update.status = 'awaiting_payment'
      update.paymentStatus = 'pending'
      update.adminNote = note || 'يحتاج مراجعة إضافية.'
      logAction = 'order_review_requested'
    }

    if (action === 'confirm_payment') {
      update.status = 'paid'
      update.paymentStatus = 'confirmed'
      update.paidAt = now
      update.paymentConfirmedAt = now
      update.paymentConfirmedBy = context.uid
      notificationTitle = 'تم تأكيد الدفع'
      notificationBody = `تم تأكيد الدفع لطلب ${productTitle}. سيتم فتح المحتوى بعد المراجعة النهائية.`
    }

    if (action === 'grant_access') {
      update.status = 'access_granted'
      update.paymentStatus = 'confirmed'
      update.accessGrantedAt = now
      update.accessGrantedBy = context.uid
      notificationTitle = 'تم فتح المحتوى'
      notificationBody = `تم فتح الوصول إلى ${productTitle} داخل حسابك.`
    }

    if (action === 'reject_payment') {
      if (!reason) return jsonError('سبب الرفض مطلوب.', 400)
      update.status = 'rejected'
      update.paymentStatus = 'failed'
      update.rejectionReason = reason
      update.rejectedAt = now
      update.rejectedBy = context.uid
      notificationTitle = 'تعذر تأكيد الدفع'
      notificationBody = `تمت مراجعة طلب ${productTitle}. سبب المراجعة: ${reason}`
    }

    if (action === 'cancel_order' || action === 'cancel') {
      update.status = 'cancelled'
      update.cancelledAt = now
      update.cancelledBy = context.uid
      update.cancellationReason = reason || note || ''
      notificationTitle = 'تم إلغاء الطلب'
      notificationBody = `تم إلغاء طلب ${productTitle}.`
    }

    if (action === 'refund_order' || action === 'refund') {
      update.status = 'refunded'
      update.paymentStatus = 'refunded'
      update.refundedAt = now
      update.refundedBy = context.uid
      update.refundReason = reason || note || ''
      notificationTitle = 'تم تحديث حالة الاسترداد'
      notificationBody = `تم تسجيل حالة الاسترداد لطلب ${productTitle}.`
    }

    if (action === 'add_note') {
      if (!note) return jsonError('الملاحظة مطلوبة.', 400)
      update.adminNote = note
    }

    const batch = context.db.batch()
    batch.set(orderRef, update, { merge: true })
    batch.set(context.db.collection('admin_logs').doc(), {
      adminId: context.uid,
      adminEmail: context.email || '',
      action: logAction,
      targetType: 'orders',
      targetId: orderId,
      before: { status: before.status || '', paymentStatus: before.paymentStatus || '' },
      after: update,
      message: note || reason || `تحديث الطلب ${productTitle}`,
      createdAt: now,
    })

    batch.set(orderRef.collection('timeline').doc(), {
      action: logAction,
      title: notificationTitle || 'تحديث الطلب',
      by: context.email || context.uid,
      note: note || reason || '',
      meta: update,
      createdAt: now,
    })

    if (action === 'grant_access') {
      batch.set(
        context.db.collection('access_records').doc(`${userId}_${before.productType || 'product'}_${before.productId || orderId}`),
        {
          userId,
          orderId,
          productId: before.productId || '',
          productType: before.productType || '',
          productTitle,
          grantedBy: context.uid,
          grantedAt: now,
          active: true,
          status: 'active',
          updatedAt: now,
        },
        { merge: true },
      )
    }

    if (['confirm_payment', 'mark_payment_submitted', 'reject_payment', 'refund_order'].includes(action)) {
      batch.set(context.db.collection('payment_attempts').doc(), {
        orderId,
        userId,
        productId: before.productId || '',
        productType: before.productType || '',
        amount: before.amount || 0,
        currency: before.currency || 'EGP',
        status: update.paymentStatus || before.paymentStatus || 'pending',
        action,
        method: before.paymentMethod || 'manual',
        reference: before.paymentReference || paymentReference || '',
        proofUrl: before.paymentProofUrl || paymentProofUrl || '',
        createdAt: now,
        createdBy: context.uid,
      })
    }

    if (notificationTitle) {
      batch.set(context.db.collection('notifications').doc(), {
        userId,
        role: 'user',
        type: logAction,
        title: notificationTitle,
        message: notificationBody,
        body: notificationBody,
        href: '/dashboard/orders',
        entityType: 'order',
        entityId: orderId,
        priority: action === 'reject_payment' ? 'high' : 'normal',
        read: false,
        status: 'unread',
        createdAt: now,
        updatedAt: now,
      })
    }

    await batch.commit()

    await createNotification(context.db, {
      adminOnly: true,
      type: `admin_${logAction}`,
      title: 'تم تنفيذ إجراء طلب',
      body: `${context.email || context.uid} نفذ: ${logAction}`,
      href: '/admin/orders',
      entityType: 'order',
      entityId: orderId,
    }).catch(() => undefined)

    return jsonSuccess({ orderId, action, values: update })
  } catch (error) {
    console.error('Admin order action API error:', error)
    return jsonError('تعذر تنفيذ إجراء الطلب الآن.', 500)
  }
}
