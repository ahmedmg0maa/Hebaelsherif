import { NextRequest } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { asRecord, cleanString, createNotification, jsonError, jsonSuccess, requireAdmin } from '@/lib/server/admin-api'

const allowedActions = new Set([
  'confirm_booking',
  'confirm_payment',
  'mark_payment_submitted',
  'add_meeting_link',
  'complete_booking',
  'cancel_booking',
  'mark_no_show',
  'request_reschedule',
  'approve_reschedule',
  'add_note',
])

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { bookingId: string } }) {
  try {
    const { error, context } = await requireAdmin(req, ['owner', 'admin', 'super_admin', 'finance', 'support'])
    if (error || !context) return error

    const bookingId = cleanString(params.bookingId)
    if (!bookingId) return jsonError('رقم الحجز غير صحيح.', 400)

    const body = asRecord(await req.json().catch(() => ({})))
    const action = cleanString(body.action)
    const note = cleanString(body.note)
    const reason = cleanString(body.reason)
    const meetingUrl = cleanString(body.meetingUrl)
    const date = cleanString(body.date)
    const time = cleanString(body.time)

    if (!allowedActions.has(action)) return jsonError('إجراء الحجز غير مدعوم.', 400)

    const bookingRef = context.db.collection('bookings').doc(bookingId)
    const bookingSnap = await bookingRef.get()
    if (!bookingSnap.exists) return jsonError('الحجز غير موجود.', 404)

    const before = bookingSnap.data() || {}
    const userId = String(before.userId || '')
    const customerName = String(before.name || before.customerName || before.email || 'العميلة')
    const now = Timestamp.now()
    const update: Record<string, unknown> = { updatedAt: now, updatedBy: context.uid, lastAction: action }
    let logAction = `booking_${action}`
    let notificationTitle = ''
    let notificationBody = ''

    if (action === 'mark_payment_submitted') {
      update.status = 'payment_submitted'
      update.paymentStatus = 'submitted'
      notificationTitle = 'تم استلام إثبات دفع الحجز'
      notificationBody = 'تم تسجيل إثبات الدفع لجلسة الحجز وهو قيد المراجعة.'
    }

    if (action === 'confirm_payment') {
      update.paymentStatus = 'confirmed'
      update.paymentConfirmedAt = now
      update.paymentConfirmedBy = context.uid
      if (['pending', 'awaiting_payment', 'payment_submitted'].includes(String(before.status || ''))) update.status = 'confirmed'
      notificationTitle = 'تم تأكيد دفع الجلسة'
      notificationBody = 'تم تأكيد دفع الحجز. ستظهر تفاصيل الموعد داخل حسابك.'
    }

    if (action === 'confirm_booking') {
      update.status = 'confirmed'
      update.confirmedAt = now
      update.confirmedBy = context.uid
      if (meetingUrl) update.meetingUrl = meetingUrl
      notificationTitle = 'تم تأكيد موعد الجلسة'
      notificationBody = 'تم تأكيد موعد الجلسة. راجعي لوحة حسابك لتفاصيل الموعد.'
    }

    if (action === 'add_meeting_link') {
      if (!meetingUrl) return jsonError('رابط الجلسة مطلوب.', 400)
      update.meetingUrl = meetingUrl
      update.meetingUrlUpdatedAt = now
      update.meetingUrlUpdatedBy = context.uid
      notificationTitle = 'تم إضافة رابط الجلسة'
      notificationBody = 'تم إضافة رابط الجلسة داخل حسابك.'
    }

    if (action === 'complete_booking') {
      update.status = 'completed'
      update.completedAt = now
      update.completedBy = context.uid
      notificationTitle = 'تم تسجيل الجلسة كمكتملة'
      notificationBody = 'تم تسجيل الجلسة كمكتملة. يمكنك متابعة رحلتك من لوحة حسابك.'
    }

    if (action === 'cancel_booking') {
      if (!reason) return jsonError('سبب الإلغاء مطلوب.', 400)
      update.status = 'cancelled'
      update.cancelledAt = now
      update.cancelledBy = context.uid
      update.cancellationReason = reason
      notificationTitle = 'تم إلغاء الحجز'
      notificationBody = `تم إلغاء الحجز. السبب: ${reason}`
    }

    if (action === 'mark_no_show') {
      update.status = 'no_show'
      update.noShowAt = now
      update.noShowBy = context.uid
      update.noShowNote = reason || note || ''
    }

    if (action === 'request_reschedule') {
      update.status = 'reschedule_requested'
      update.rescheduleReason = reason || note || 'طلب إعادة جدولة.'
      update.rescheduleRequestedAt = now
      update.rescheduleRequestedBy = context.uid
      notificationTitle = 'طلب إعادة جدولة الحجز'
      notificationBody = 'تم تسجيل طلب إعادة جدولة الحجز. سيتم تحديث الموعد بعد المراجعة.'
    }

    if (action === 'approve_reschedule') {
      if (!date || !time) return jsonError('التاريخ والوقت الجديدان مطلوبان.', 400)
      update.status = 'confirmed'
      update.date = date
      update.time = time
      update.rescheduledAt = now
      update.rescheduledBy = context.uid
      update.rescheduleApprovedNote = note
      notificationTitle = 'تم اعتماد الموعد الجديد'
      notificationBody = `تم تحديث موعد الجلسة إلى ${date} ${time}.`
    }

    if (action === 'add_note') {
      if (!note) return jsonError('الملاحظة مطلوبة.', 400)
      update.adminNotes = note
    }

    const batch = context.db.batch()
    batch.set(bookingRef, update, { merge: true })
    batch.set(context.db.collection('admin_logs').doc(), {
      adminId: context.uid,
      adminEmail: context.email || '',
      action: logAction,
      targetType: 'bookings',
      targetId: bookingId,
      before: { status: before.status || '', paymentStatus: before.paymentStatus || '', date: before.date || '', time: before.time || '' },
      after: update,
      message: note || reason || meetingUrl || `تحديث الحجز ${customerName}`,
      createdAt: now,
    })

    batch.set(bookingRef.collection('timeline').doc(), {
      action: logAction,
      title: notificationTitle || 'تحديث الحجز',
      by: context.email || context.uid,
      note: note || reason || meetingUrl || '',
      meta: update,
      createdAt: now,
    })

    if (notificationTitle) {
      batch.set(context.db.collection('notifications').doc(), {
        userId,
        role: 'user',
        type: logAction,
        title: notificationTitle,
        message: notificationBody,
        body: notificationBody,
        href: '/dashboard/sessions',
        entityType: 'booking',
        entityId: bookingId,
        priority: action === 'cancel_booking' ? 'high' : 'normal',
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
      title: 'تم تنفيذ إجراء حجز',
      body: `${context.email || context.uid} نفذ: ${logAction}`,
      href: '/admin/bookings',
      entityType: 'booking',
      entityId: bookingId,
    }).catch(() => undefined)

    return jsonSuccess({ bookingId, action, values: update })
  } catch (error) {
    console.error('Admin booking action API error:', error)
    return jsonError('تعذر تنفيذ إجراء الحجز الآن.', 500)
  }
}
