import { NextRequest, NextResponse } from 'next/server'
import { FieldValue, type UpdateData } from 'firebase-admin/firestore'
import { getAdminDb } from '@/lib/firebase/admin'
import { adminErrorResponse, contentRoles, financeRoles, requireAdminSession, writeRoles } from '@/lib/server/admin-auth'
import { createNotification, writeAdminLog } from '@/lib/server/audit'
import { safeObject, text } from '@/lib/server/sanitize'
import { privateContentFields } from '@/lib/admin/operations'
import type { ProductType } from '@/types'

const orderActions = new Set(['order_payment_submitted', 'order_paid', 'order_rejected', 'order_cancelled', 'access_granted', 'order_note_added'])
const bookingActions = new Set(['booking_confirmed', 'booking_payment_confirmed', 'booking_meeting_link_added', 'booking_completed', 'booking_reschedule_requested', 'booking_cancelled', 'booking_note_added'])
const productActions = new Set(['product_publish', 'product_coming_soon', 'product_hide', 'product_archive', 'product_update_readiness_note'])
const reviewActions = new Set(['review_approved', 'review_rejected', 'review_hidden'])
const messageActions = new Set(['message_read', 'message_important', 'message_replied', 'message_archived', 'message_note_added'])
const userActions = new Set(['user_role_changed', 'customer_note_created', 'customer_tagged'])
const taskActions = new Set(['task_created', 'task_updated', 'task_done', 'task_archived'])
const protectedContentActions = new Set(['protected_content_saved', 'protected_content_disabled', 'protected_content_enabled'])

function ensureTargetId(value: unknown) {
  const targetId = text(value)
  if (!targetId) throw new Error('TARGET_ID_REQUIRED')
  return targetId
}

function assertNoPrivateFields(data: Record<string, unknown>) {
  const leaked = privateContentFields.filter((field) => typeof data[field] === 'string' && String(data[field]).trim())
  if (leaked.length > 0) {
    throw new Error(`PRIVATE_FIELDS_NOT_ALLOWED:${leaked.join(',')}`)
  }
}

function protectedContentDocId(productType: ProductType, productId: string) {
  return `${productType}_${productId}`
}

function getProductType(targetType: string): ProductType {
  if (targetType === 'courses') return 'course'
  if (targetType === 'books') return 'book'
  throw new Error('INVALID_PRODUCT_TYPE')
}

async function handleOrderAction(action: string, targetId: string, values: Record<string, unknown>, session: Awaited<ReturnType<typeof requireAdminSession>>) {
  const db = getAdminDb()
  const orderRef = db.collection('orders').doc(targetId)
  const now = FieldValue.serverTimestamp()
  const result = await db.runTransaction(async (transaction) => {
    const orderSnap = await transaction.get(orderRef)
    if (!orderSnap.exists) throw new Error('ORDER_NOT_FOUND')
    const before = orderSnap.data() || {}
    const update: Record<string, unknown> = { updatedAt: now }
    let notificationTitle = 'تم تحديث طلبك'
    let notificationBody = 'تم تحديث حالة الطلب داخل حسابك.'

    if (action === 'order_payment_submitted') {
      update.status = 'payment_submitted'
      update.paymentStatus = 'submitted'
      update.paymentSubmittedAt = now
      notificationTitle = 'تم تسجيل إثبات الدفع'
      notificationBody = 'تم وضع الطلب في قائمة مراجعة الدفع.'
    }

    if (action === 'order_paid') {
      update.status = 'paid'
      update.paymentStatus = 'confirmed'
      update.paidAt = now
      notificationTitle = 'تم تأكيد الدفع'
      notificationBody = 'تم تأكيد الدفع وسيتم فتح المحتوى بعد مراجعة الربط.'
      transaction.set(db.collection('payment_attempts').doc(), {
        userId: before.userId || '',
        orderId: targetId,
        amount: Number(before.amount || before.finalAmount || 0),
        currency: 'EGP',
        method: before.paymentMethod || 'manual',
        reference: before.paymentReference || '',
        proofUrl: before.paymentProofUrl || '',
        status: 'confirmed',
        confirmedBy: session.uid,
        createdAt: now,
        updatedAt: now,
      })
    }

    if (action === 'access_granted') {
      update.status = 'access_granted'
      update.paymentStatus = 'confirmed'
      update.accessGrantedAt = now
      notificationTitle = 'تم فتح المحتوى'
      notificationBody = 'يمكنك الآن الدخول إلى المحتوى من لوحة حسابك.'
      transaction.set(db.collection('access_records').doc(), {
        userId: before.userId || '',
        productId: before.productId || '',
        productType: before.productType || '',
        orderId: targetId,
        status: 'active',
        grantedBy: session.uid,
        grantedAt: now,
      })
    }

    if (action === 'order_rejected') {
      const reason = text(values.reason || values.rejectionReason)
      if (!reason) throw new Error('REJECTION_REASON_REQUIRED')
      update.status = 'rejected'
      update.paymentStatus = 'failed'
      update.rejectionReason = reason
      update.rejectedAt = now
      notificationTitle = 'تمت مراجعة الطلب'
      notificationBody = reason
    }

    if (action === 'order_cancelled') {
      update.status = 'cancelled'
      update.cancelledAt = now
      notificationTitle = 'تم إلغاء الطلب'
      notificationBody = 'تم تحديث حالة الطلب إلى ملغي.'
    }

    if (action === 'order_note_added') {
      update.adminNote = text(values.adminNote || values.note)
    }

    transaction.update(orderRef, update as any)
    transaction.set(db.collection('admin_logs').doc(), {
      action,
      targetType: 'orders',
      targetId,
      adminId: session.uid,
      adminEmail: session.email,
      before: { status: before.status || '', paymentStatus: before.paymentStatus || '' },
      after: update,
      message: `${action} - ${before.productTitle || before.productId || targetId}`,
      createdAt: now,
    })
    transaction.set(db.collection('notifications').doc(), {
      audience: 'user',
      userId: before.userId || '',
      type: action,
      title: notificationTitle,
      body: notificationBody,
      href: '/dashboard/orders',
      priority: action === 'order_rejected' ? 'high' : 'normal',
      status: 'unread',
      createdAt: now,
    })

    return update
  })
  return result
}

async function handleBookingAction(action: string, targetId: string, values: Record<string, unknown>, session: Awaited<ReturnType<typeof requireAdminSession>>) {
  const db = getAdminDb()
  const bookingRef = db.collection('bookings').doc(targetId)
  const now = FieldValue.serverTimestamp()
  const result = await db.runTransaction(async (transaction) => {
    const bookingSnap = await transaction.get(bookingRef)
    if (!bookingSnap.exists) throw new Error('BOOKING_NOT_FOUND')
    const before = bookingSnap.data() || {}
    const update: Record<string, unknown> = { updatedAt: now }
    let notificationTitle = 'تم تحديث الحجز'
    let notificationBody = 'تم تحديث حالة الحجز داخل حسابك.'

    if (action === 'booking_confirmed') {
      update.status = 'confirmed'
      update.confirmedAt = now
      notificationTitle = 'تم تأكيد الموعد'
      notificationBody = 'تم تأكيد موعد الجلسة. راجعي لوحة حسابك لمعرفة التفاصيل.'
    }

    if (action === 'booking_payment_confirmed') {
      update.paymentStatus = 'confirmed'
      update.paymentConfirmedAt = now
      if (before.status === 'pending' || before.status === 'awaiting_payment') update.status = 'confirmed'
      notificationTitle = 'تم تأكيد دفع الحجز'
      notificationBody = 'تم تأكيد الدفع الخاص بالجلسة.'
      transaction.set(db.collection('payment_attempts').doc(), {
        userId: before.userId || '',
        bookingId: targetId,
        amount: Number(before.amount || before.finalAmount || before.price || 0),
        currency: 'EGP',
        method: before.paymentMethod || 'manual',
        reference: before.paymentReference || '',
        proofUrl: before.paymentProofUrl || '',
        status: 'confirmed',
        confirmedBy: session.uid,
        createdAt: now,
        updatedAt: now,
      })
    }

    if (action === 'booking_meeting_link_added') {
      const meetingUrl = text(values.meetingUrl)
      if (!meetingUrl) throw new Error('MEETING_URL_REQUIRED')
      update.meetingUrl = meetingUrl
      update.meetingUrlAddedAt = now
      notificationTitle = 'تم إضافة رابط الجلسة'
      notificationBody = 'تم إضافة رابط أو وسيلة حضور الجلسة داخل لوحة حسابك.'
    }

    if (action === 'booking_completed') {
      update.status = 'completed'
      update.completedAt = now
      notificationTitle = 'تم تسجيل الجلسة كمكتملة'
      notificationBody = 'نتمنى أن تكون الجلسة كانت واضحة وهادئة.'
    }

    if (action === 'booking_reschedule_requested') {
      update.status = 'reschedule_requested'
      update.rescheduleReason = text(values.reason || values.rescheduleReason)
      notificationTitle = 'تم تسجيل طلب إعادة الجدولة'
      notificationBody = 'سيتم مراجعة الموعد البديل والتواصل معك.'
    }

    if (action === 'booking_cancelled') {
      const reason = text(values.reason || values.cancellationReason)
      update.status = 'cancelled'
      update.cancellationReason = reason
      update.cancelledAt = now
      notificationTitle = 'تم إلغاء الحجز'
      notificationBody = reason || 'تم تحديث حالة الحجز إلى ملغي.'
    }

    if (action === 'booking_note_added') {
      update.adminNotes = text(values.adminNotes || values.note)
    }

    transaction.update(bookingRef, update as any)
    transaction.set(db.collection('admin_logs').doc(), {
      action,
      targetType: 'bookings',
      targetId,
      adminId: session.uid,
      adminEmail: session.email,
      before: { status: before.status || '', paymentStatus: before.paymentStatus || '' },
      after: update,
      message: `${action} - ${before.customerName || before.name || before.email || targetId}`,
      createdAt: now,
    })
    transaction.set(db.collection('notifications').doc(), {
      audience: 'user',
      userId: before.userId || '',
      type: action,
      title: notificationTitle,
      body: notificationBody,
      href: '/dashboard/sessions',
      priority: action === 'booking_cancelled' ? 'high' : 'normal',
      status: 'unread',
      createdAt: now,
    })

    return update
  })
  return result
}

async function handleProductAction(action: string, targetType: string, targetId: string, values: Record<string, unknown>, session: Awaited<ReturnType<typeof requireAdminSession>>) {
  const db = getAdminDb()
  const ref = db.collection(targetType).doc(targetId)
  const snap = await ref.get()
  if (!snap.exists) throw new Error('PRODUCT_NOT_FOUND')
  const before = snap.data() || {}
  assertNoPrivateFields(before)
  const productType = getProductType(targetType)

  const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() }
  if (action === 'product_publish') {
    const contentDoc = await db.collection('protected_content').doc(protectedContentDocId(productType, targetId)).get()
    if (!contentDoc.exists && before.status !== 'coming_soon') throw new Error('PROTECTED_CONTENT_REQUIRED')
    update.status = 'published'
    update.publishedAt = FieldValue.serverTimestamp()
  }
  if (action === 'product_coming_soon') update.status = 'coming_soon'
  if (action === 'product_hide') update.status = 'hidden'
  if (action === 'product_archive') update.status = 'archived'
  if (action === 'product_update_readiness_note') update.adminReadinessNote = text(values.adminReadinessNote || values.note)

  await ref.update(update)
  await writeAdminLog(db, { session, action, targetType, targetId, before: { status: before.status || '' }, after: update, message: `${action} - ${before.title || targetId}` })
  return update
}

async function handleProtectedContentAction(action: string, targetId: string | undefined, values: Record<string, unknown>, session: Awaited<ReturnType<typeof requireAdminSession>>) {
  const db = getAdminDb()
  const productType = text(values.productType) as ProductType
  const productId = text(values.productId)
  const safeId = targetId || (productType && productId ? protectedContentDocId(productType, productId) : '')
  if (!safeId) throw new Error('PROTECTED_CONTENT_ID_REQUIRED')
  const ref = db.collection('protected_content').doc(safeId)
  const beforeSnap = await ref.get()
  const before = beforeSnap.data() || {}

  const update: Record<string, unknown> = {
    productType,
    productId,
    productSlug: text(values.productSlug),
    title: text(values.title),
    contentUrl: text(values.contentUrl),
    resourceUrl: text(values.resourceUrl),
    accessType: text(values.accessType) || 'paid',
    isActive: values.isActive !== false,
    updatedAt: FieldValue.serverTimestamp(),
  }

  if (action === 'protected_content_disabled') {
    update.isActive = false
  }
  if (action === 'protected_content_enabled') {
    update.isActive = true
  }

  if (action === 'protected_content_saved' && (!update.productType || !update.productId || !update.title || !update.contentUrl)) {
    throw new Error('PROTECTED_CONTENT_REQUIRED_FIELDS')
  }

  await ref.set({ ...update, createdAt: before.createdAt || FieldValue.serverTimestamp() }, { merge: true })
  await writeAdminLog(db, { session, action, targetType: 'protected_content', targetId: safeId, before, after: update, message: `${action} - ${update.title || safeId}` })
  return update
}

async function handleSimpleAction(action: string, targetType: string, targetId: string | undefined, values: Record<string, unknown>, session: Awaited<ReturnType<typeof requireAdminSession>>) {
  const db = getAdminDb()
  const id = targetId || ''
  const now = FieldValue.serverTimestamp()

  if (reviewActions.has(action)) {
    const target = ensureTargetId(id)
    const status = action === 'review_approved' ? 'approved' : action === 'review_hidden' ? 'hidden' : 'rejected'
    await db.collection('reviews').doc(target).update({ status, updatedAt: now })
    await writeAdminLog(db, { session, action, targetType: 'reviews', targetId: target, after: { status } })
    return { status }
  }

  if (messageActions.has(action)) {
    const target = ensureTargetId(id)
    const collectionName = text(values.collectionName) || 'contact_messages'
    const status = action === 'message_read' ? 'read' : action === 'message_important' ? 'important' : action === 'message_replied' ? 'replied' : action === 'message_archived' ? 'archived' : undefined
    const update: Record<string, unknown> = { updatedAt: now }
    if (status) update.status = status
    if (action === 'message_note_added') update.adminNote = text(values.adminNote || values.note)
    await db.collection(collectionName).doc(target).update(update)
    await writeAdminLog(db, { session, action, targetType: collectionName, targetId: target, after: update })
    return update
  }

  if (userActions.has(action)) {
    const target = ensureTargetId(id)
    if (action === 'user_role_changed') {
      const role = text(values.role)
      if (!['user', 'owner', 'admin', 'support', 'content_manager', 'finance', 'viewer'].includes(role)) throw new Error('INVALID_ROLE')
      await db.collection('users').doc(target).update({ role, updatedAt: now })
      await writeAdminLog(db, { session, action, targetType: 'users', targetId: target, after: { role } })
      return { role }
    }
    if (action === 'customer_note_created') {
      const note = text(values.note)
      if (!note) throw new Error('NOTE_REQUIRED')
      const ref = await db.collection('customer_notes').add({ userId: target, note, tags: values.tags || [], createdBy: session.uid, createdAt: now })
      await writeAdminLog(db, { session, action, targetType: 'users', targetId: target, after: { noteId: ref.id } })
      return { id: ref.id }
    }
  }

  if (taskActions.has(action)) {
    if (action === 'task_created') {
      const title = text(values.title)
      if (!title) throw new Error('TASK_TITLE_REQUIRED')
      const ref = await db.collection('admin_tasks').add({
        title,
        description: text(values.description),
        status: 'open',
        priority: text(values.priority) || 'normal',
        relatedType: text(values.relatedType),
        relatedId: text(values.relatedId),
        assignedTo: text(values.assignedTo),
        createdBy: session.uid,
        createdAt: now,
        updatedAt: now,
      })
      await writeAdminLog(db, { session, action, targetType: 'admin_tasks', targetId: ref.id, after: { title } })
      return { id: ref.id }
    }

    const target = ensureTargetId(id)
    const update: Record<string, unknown> = { updatedAt: now }
    if (action === 'task_done') update.status = 'done'
    if (action === 'task_archived') update.status = 'archived'
    if (action === 'task_updated') Object.assign(update, values)
    await db.collection('admin_tasks').doc(target).update(update)
    await writeAdminLog(db, { session, action, targetType: 'admin_tasks', targetId: target, after: update })
    return update
  }

  throw new Error('UNSUPPORTED_ACTION')
}

export async function POST(req: NextRequest) {
  try {
    const body = safeObject(await req.json())
    const action = text(body.action)
    const targetType = text(body.targetType)
    const targetId = text(body.targetId)
    const values = safeObject(body.values)

    const allowedRoles = orderActions.has(action) ? financeRoles : productActions.has(action) || protectedContentActions.has(action) ? contentRoles : writeRoles
    const session = await requireAdminSession(req, allowedRoles)

    let data: unknown
    if (orderActions.has(action)) data = await handleOrderAction(action, ensureTargetId(targetId), values, session)
    else if (bookingActions.has(action)) data = await handleBookingAction(action, ensureTargetId(targetId), values, session)
    else if (productActions.has(action)) data = await handleProductAction(action, targetType, ensureTargetId(targetId), values, session)
    else if (protectedContentActions.has(action)) data = await handleProtectedContentAction(action, targetId || undefined, values, session)
    else data = await handleSimpleAction(action, targetType, targetId || undefined, values, session)

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Admin action API error:', error)
    const message = error instanceof Error ? error.message : String(error)
    if (message === 'TARGET_ID_REQUIRED') return NextResponse.json({ success: false, error: 'معرف العنصر مطلوب.' }, { status: 400 })
    if (message.includes('PRIVATE_FIELDS_NOT_ALLOWED')) return NextResponse.json({ success: false, error: 'لا يمكن نشر عنصر يحتوي روابط خاصة في بيانات عامة.' }, { status: 400 })
    if (message === 'PROTECTED_CONTENT_REQUIRED') return NextResponse.json({ success: false, error: 'لا يمكن النشر قبل ربط محتوى محمي.' }, { status: 400 })
    if (message === 'REJECTION_REASON_REQUIRED') return NextResponse.json({ success: false, error: 'سبب الرفض مطلوب.' }, { status: 400 })
    if (message === 'MEETING_URL_REQUIRED') return NextResponse.json({ success: false, error: 'رابط الجلسة مطلوب.' }, { status: 400 })
    if (message === 'NOTE_REQUIRED') return NextResponse.json({ success: false, error: 'الملاحظة مطلوبة.' }, { status: 400 })
    if (message === 'INVALID_ROLE') return NextResponse.json({ success: false, error: 'الدور غير صحيح.' }, { status: 400 })
    if (message === 'TASK_TITLE_REQUIRED') return NextResponse.json({ success: false, error: 'عنوان المهمة مطلوب.' }, { status: 400 })
    const { status, error: translated } = adminErrorResponse(error)
    return NextResponse.json({ success: false, error: translated }, { status })
  }
}
