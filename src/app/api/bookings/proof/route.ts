import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin'
import { createNotification, trackServerEvent } from '@/lib/admin/api'

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
    const body = (await req.json()) as { bookingId?: unknown; paymentReference?: unknown; paymentProofUrl?: unknown; note?: unknown }
    const bookingId = clean(body.bookingId)
    const paymentReference = clean(body.paymentReference)
    const paymentProofUrl = clean(body.paymentProofUrl)
    const note = clean(body.note)

    if (!bookingId || (!paymentReference && !paymentProofUrl)) {
      return NextResponse.json({ error: 'أضيفي رقم العملية أو رابط إثبات الدفع.' }, { status: 400 })
    }

    const bookingRef = db.collection('bookings').doc(bookingId)
    const bookingSnap = await bookingRef.get()
    if (!bookingSnap.exists || bookingSnap.data()?.userId !== decoded.uid) {
      return NextResponse.json({ error: 'الحجز غير موجود.' }, { status: 404 })
    }

    await bookingRef.update({
      paymentReference,
      paymentProofUrl,
      paymentNote: note,
      status: 'payment_submitted',
      paymentStatus: 'submitted',
      updatedAt: Timestamp.now(),
    })

    await db.collection('admin_logs').add({
      adminId: 'system',
      action: 'booking_payment_proof_submitted',
      targetType: 'booking',
      targetId: bookingId,
      after: { paymentReference, paymentProofUrl, status: 'payment_submitted', paymentStatus: 'submitted' },
      createdAt: Timestamp.now(),
    })

    await createNotification({
      db,
      type: 'booking_payment_proof_submitted',
      title: 'إثبات دفع حجز جديد',
      body: paymentReference || paymentProofUrl || 'إثبات دفع يحتاج مراجعة.',
      audience: 'admin',
      href: '/admin/bookings',
      priority: 'high',
    })

    await trackServerEvent({ db, type: 'booking_payment_proof_submitted', userId: decoded.uid, entityType: 'booking', entityId: bookingId, source: 'proof_api' })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Booking payment proof API error:', error)
    return NextResponse.json({ error: 'تعذر إرسال إثبات دفع الحجز الآن.' }, { status: 500 })
  }
}
