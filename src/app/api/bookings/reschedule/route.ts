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

    const decoded = await getAdminAuth().verifyIdToken(token)
    const db = getAdminDb()
    const body = (await req.json()) as { bookingId?: unknown; requestedDate?: unknown; requestedTime?: unknown; reason?: unknown }
    const bookingId = clean(body.bookingId)
    const requestedDate = clean(body.requestedDate)
    const requestedTime = clean(body.requestedTime)
    const reason = clean(body.reason)

    if (!bookingId || !requestedDate || !requestedTime) {
      return NextResponse.json({ error: 'بيانات تغيير الموعد غير مكتملة.' }, { status: 400 })
    }

    const ref = db.collection('bookings').doc(bookingId)
    const snap = await ref.get()
    if (!snap.exists || snap.data()?.userId !== decoded.uid) {
      return NextResponse.json({ error: 'الحجز غير موجود.' }, { status: 404 })
    }

    await ref.update({
      status: 'reschedule_requested',
      requestedDate,
      requestedTime,
      rescheduleReason: reason,
      updatedAt: Timestamp.now(),
    })

    await createNotification({ db, type: 'booking_reschedule_requested_by_user', title: 'طلب إعادة جدولة جديد', body: `${requestedDate} ${requestedTime} - ${reason || 'بدون سبب'}`, audience: 'admin', href: '/admin/bookings', priority: 'high' })
    await trackServerEvent({ db, type: 'booking_reschedule_requested_by_user', userId: decoded.uid, entityType: 'booking', entityId: bookingId, source: 'reschedule_api' })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Reschedule API error:', error)
    return NextResponse.json({ error: 'تعذر طلب تغيير الموعد الآن.' }, { status: 500 })
  }
}
