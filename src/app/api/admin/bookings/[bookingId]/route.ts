import { NextRequest } from 'next/server'
import { cleanText, cleanUrl, createNotification, jsonError, jsonSuccess, now, requireAdmin, writeAdminLog } from '@/lib/server/admin-guard'

interface RouteContext {
  params: { bookingId: string }
}

const actionMap: Record<string, string> = {
  confirm_booking: 'booking_confirmed',
  booking_confirmed: 'booking_confirmed',
  confirm_payment: 'booking_payment_confirmed',
  booking_payment_confirmed: 'booking_payment_confirmed',
  add_meeting_link: 'booking_meeting_link_added',
  booking_meeting_link_added: 'booking_meeting_link_added',
  complete_booking: 'booking_completed',
  booking_completed: 'booking_completed',
  request_reschedule: 'booking_reschedule_requested',
  booking_reschedule_requested: 'booking_reschedule_requested',
  cancel_booking: 'booking_cancelled',
  booking_cancelled: 'booking_cancelled',
  note: 'booking_note_added',
  add_note: 'booking_note_added',
  booking_note_added: 'booking_note_added',
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const admin = await requireAdmin(req, ['owner', 'super_admin', 'admin', 'support', 'finance'])
    if (admin instanceof Response) return admin

    const db = admin.db
    const bookingId = cleanText(context.params.bookingId, 160)
    if (!bookingId) return jsonError('بيانات الحجز غير صحيحة.', 400)

    const body = (await req.json()) as Record<string, unknown>
    const action = actionMap[cleanText(body.action, 80)]
    if (!action) return jsonError('إجراء الحجز غير مدعوم.', 400)

    const ref = db.collection('bookings').doc(bookingId)
    const snap = await ref.get()
    if (!snap.exists) return jsonError('الحجز غير موجود.', 404)
    const before = snap.data() || {}
    const update: Record<string, unknown> = { updatedAt: now(), updatedBy: admin.uid }
    let title = 'تم تحديث الحجز'
    let notificationMessage = 'تم تحديث حالة الحجز داخل حسابك.'

    if (action === 'booking_confirmed') {
      update.status = 'confirmed'
      update.confirmedAt = now()
      update.confirmedBy = admin.uid
      title = 'تم تأكيد موعد الجلسة'
      notificationMessage = 'تم تأكيد موعد الجلسة. راجعي لوحة حسابك لمعرفة التفاصيل.'
    }
    if (action === 'booking_payment_confirmed') {
      update.paymentStatus = 'confirmed'
      update.paymentConfirmedAt = now()
      update.paymentConfirmedBy = admin.uid
      if (before.status === 'pending' || before.status === 'awaiting_payment' || before.status === 'payment_submitted') update.status = 'confirmed'
      title = 'تم تأكيد دفع الجلسة'
      notificationMessage = 'تم تأكيد الدفع الخاص بالجلسة.'
    }
    if (action === 'booking_meeting_link_added') {
      const meetingUrl = cleanUrl(body.meetingUrl)
      if (!meetingUrl) return jsonError('رابط الجلسة غير صحيح.', 400)
      update.meetingUrl = meetingUrl
      update.meetingUrlAddedAt = now()
      title = 'تم إضافة رابط الجلسة'
      notificationMessage = 'رابط الجلسة أصبح متاحًا داخل حسابك.'
    }
    if (action === 'booking_completed') {
      update.status = 'completed'
      update.completedAt = now()
      update.completedBy = admin.uid
      title = 'تم تسجيل الجلسة كمكتملة'
      notificationMessage = 'تم تسجيل الجلسة كمكتملة. يمكنك متابعة خطواتك التالية من حسابك.'
    }
    if (action === 'booking_reschedule_requested') {
      update.status = 'reschedule_requested'
      update.rescheduleReason = cleanText(body.reason || body.rescheduleReason, 1200)
      title = 'تم تسجيل طلب إعادة الجدولة'
      notificationMessage = 'سيتم مراجعة الموعد البديل والتواصل معك.'
    }
    if (action === 'booking_cancelled') {
      const reason = cleanText(body.reason || body.cancellationReason, 1200)
      update.status = 'cancelled'
      update.cancellationReason = reason
      update.cancelledAt = now()
      title = 'تم إلغاء الحجز'
      notificationMessage = reason || 'تم تحديث حالة الحجز إلى ملغي.'
    }
    if (action === 'booking_note_added') {
      update.adminNotes = cleanText(body.note || body.adminNotes, 2000)
    }

    await ref.set(update, { merge: true })
    await writeAdminLog({ db, adminId: admin.uid, adminEmail: admin.email, action, targetType: 'bookings', targetId: bookingId, before, after: update, message: `${action} - ${before.customerName || before.name || before.email || bookingId}` })
    await ref.collection('timeline').add({ action, title, by: admin.email, note: cleanText(body.reason || body.note || body.meetingUrl, 1200), createdAt: now() })
    if (before.userId && action !== 'booking_note_added') {
      await createNotification({ db, userId: String(before.userId), role: 'user', type: action, title, message: notificationMessage, href: '/dashboard/sessions', entityType: 'booking', entityId: bookingId, priority: action === 'booking_cancelled' ? 'high' : 'normal' })
    }

    return jsonSuccess({ values: update })
  } catch (error) {
    console.error('Admin booking shim error:', error)
    return jsonError('تعذر تنفيذ العملية الآن.', 500)
  }
}
