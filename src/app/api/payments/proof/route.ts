import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin'

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 })

    const auth = getAdminAuth()
    const db = getAdminDb()
    const decoded = await auth.verifyIdToken(token)
    const body = (await req.json()) as { orderId?: unknown; paymentReference?: unknown; paymentProofUrl?: unknown; note?: unknown }
    const orderId = clean(body.orderId)
    const paymentReference = clean(body.paymentReference)
    const paymentProofUrl = clean(body.paymentProofUrl)
    const note = clean(body.note)

    if (!orderId || (!paymentReference && !paymentProofUrl)) {
      return NextResponse.json({ error: 'أضيفي رقم العملية أو رابط إثبات الدفع.' }, { status: 400 })
    }

    const orderRef = db.collection('orders').doc(orderId)
    const orderSnap = await orderRef.get()
    if (!orderSnap.exists || orderSnap.data()?.userId !== decoded.uid) {
      return NextResponse.json({ error: 'الطلب غير موجود.' }, { status: 404 })
    }

    await orderRef.update({
      paymentReference,
      paymentProofUrl,
      paymentNote: note,
      status: 'payment_submitted',
      updatedAt: Timestamp.now(),
    })

    await db.collection('admin_logs').add({
      adminId: 'system',
      action: 'payment_proof_submitted',
      targetType: 'order',
      targetId: orderId,
      after: { paymentReference, paymentProofUrl },
      createdAt: Timestamp.now(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Payment proof API error:', error)
    return NextResponse.json({ error: 'تعذر إرسال إثبات الدفع الآن.' }, { status: 500 })
  }
}
