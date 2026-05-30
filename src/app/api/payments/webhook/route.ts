import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase/admin'
import { cleanText, createNotification, now, serverError, writeAdminLog } from '@/lib/admin/server'

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.PAYMENT_WEBHOOK_SECRET
    const incoming = req.headers.get('x-payment-webhook-secret') || ''
    if (!secret || incoming !== secret) {
      return serverError('Webhook unauthorized.', 401)
    }

    const body = (await req.json()) as Record<string, unknown>
    const orderId = cleanText(body.orderId)
    const provider = cleanText(body.provider || 'manual')
    const providerPaymentId = cleanText(body.providerPaymentId || body.paymentId)
    const status = cleanText(body.status)

    if (!orderId || !providerPaymentId) return serverError('بيانات الدفع غير مكتملة.', 400)

    const db = getAdminDb()
    const orderRef = db.collection('orders').doc(orderId)
    const orderSnap = await orderRef.get()
    if (!orderSnap.exists) return serverError('الطلب غير موجود.', 404)
    const order = orderSnap.data() || {}

    const paymentStatus = ['paid', 'confirmed', 'success', 'succeeded'].includes(status) ? 'confirmed' : 'failed'
    const orderStatus = paymentStatus === 'confirmed' ? 'paid' : 'rejected'

    await db.runTransaction(async (transaction) => {
      transaction.set(db.collection('payment_attempts').doc(providerPaymentId), {
        orderId,
        userId: order.userId || '',
        provider,
        providerPaymentId,
        rawStatus: status,
        paymentStatus,
        amount: Number(order.amount || 0),
        currency: 'EGP',
        updatedAt: now(),
        createdAt: now(),
      }, { merge: true })
      transaction.set(orderRef, {
        status: orderStatus,
        paymentStatus,
        paymentProvider: provider,
        providerPaymentId,
        paidAt: paymentStatus === 'confirmed' ? now() : order.paidAt || null,
        updatedAt: now(),
      }, { merge: true })
    })

    await writeAdminLog({
      admin: { uid: 'payment_webhook', email: 'system', role: 'system' },
      action: paymentStatus === 'confirmed' ? 'payment_webhook_confirmed' : 'payment_webhook_failed',
      targetType: 'order',
      targetId: orderId,
      after: { provider, providerPaymentId, status, paymentStatus },
    })

    if (paymentStatus === 'confirmed' && order.userId) {
      await createNotification({
        userId: String(order.userId),
        type: 'payment_confirmed',
        title: 'تم تأكيد الدفع',
        body: 'تم تأكيد الدفع بنجاح، وسيتم فتح المحتوى حسب إعدادات الطلب.',
        href: '/dashboard/orders',
        entityType: 'order',
        entityId: orderId,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Payment webhook error:', error)
    return serverError('تعذر معالجة Webhook الدفع.')
  }
}
