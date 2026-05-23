import { NextRequest, NextResponse } from 'next/server'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin'
import { BOOKING_RULES, SESSION_PRICES, getBookableTimeSlots } from '@/constants/booking'
import type { BookingDuration, PaymentMethod } from '@/types'

function toMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function isValidDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function isFriday(dateValue: string) {
  const date = new Date(`${dateValue}T12:00:00`)
  return date.getDay() === 5
}

function getDateAfterDays(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function isAllowedDuration(value: unknown): value is BookingDuration {
  return value === 60 || value === 90
}

function isAllowedPaymentMethod(value: string): value is PaymentMethod {
  return value === 'instapay' || value === 'vodafone_cash' || value === 'bank_transfer' || value === 'manual'
}

function sanitizeText(value: unknown) {
  if (typeof value !== 'string') return ''
  return value.trim()
}

async function validateCoupon(code: string, amount: number) {
  if (!code) return { appliedCode: '', discountAmount: 0, couponId: '' }

  const db = getAdminDb()
  const snap = await db.collection('coupons').where('code', '==', code.toUpperCase()).where('active', '==', true).limit(1).get()

  if (snap.empty) return { appliedCode: '', discountAmount: 0, couponId: '' }

  const coupon = snap.docs[0].data() as {
    type?: string
    value?: number
    scope?: string
    minAmount?: number
    expiresAtText?: string
    usageLimit?: number
    usageCount?: number
  }

  if (coupon.scope && coupon.scope !== 'all' && coupon.scope !== 'sessions') return { appliedCode: '', discountAmount: 0, couponId: '' }
  if (Number(coupon.minAmount || 0) > amount) return { appliedCode: '', discountAmount: 0, couponId: '' }
  if (coupon.expiresAtText) {
    const expiresAt = new Date(`${coupon.expiresAtText}T23:59:59`)
    if (!Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() < Date.now()) return { appliedCode: '', discountAmount: 0, couponId: '' }
  }
  if (Number(coupon.usageLimit || 0) > 0 && Number(coupon.usageCount || 0) >= Number(coupon.usageLimit)) {
    return { appliedCode: '', discountAmount: 0, couponId: '' }
  }

  const value = Number(coupon.value || 0)
  const rawDiscount = coupon.type === 'percentage' ? Math.round((amount * value) / 100) : value
  return {
    appliedCode: code.toUpperCase(),
    discountAmount: Math.max(0, Math.min(rawDiscount, amount)),
    couponId: snap.docs[0].id,
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const date = sanitizeText(searchParams.get('date'))
    const durationInput = Number(searchParams.get('duration') || 60)
    const duration = isAllowedDuration(durationInput) ? durationInput : 60

    if (!date || !isValidDateString(date)) {
      return NextResponse.json({ unavailableSlots: [] })
    }

    const adminDb = getAdminDb()
    const bookingsSnap = await adminDb
      .collection('bookings')
      .where('date', '==', date)
      .where('status', 'in', ['pending', 'payment_submitted', 'confirmed'])
      .get()

    const unavailableSlots = new Set<string>()

    bookingsSnap.docs.forEach((docItem) => {
      const booking = docItem.data()
      const existingTime = String(booking.time || '')
      const existingDuration = Number(booking.duration || 60)

      if (!existingTime.includes(':')) return

      const existingStart = toMinutes(existingTime)
      const existingEndWithBuffer = existingStart + existingDuration + BOOKING_RULES.bufferMinutes

      getBookableTimeSlots(duration).forEach((slot) => {
        const slotStart = toMinutes(slot)
        const slotEndWithBuffer = slotStart + duration + BOOKING_RULES.bufferMinutes
        if (slotStart < existingEndWithBuffer && existingStart < slotEndWithBuffer) {
          unavailableSlots.add(slot)
        }
      })
    })

    return NextResponse.json({ unavailableSlots: Array.from(unavailableSlots) })
  } catch (error) {
    console.error('Booking availability API error:', error)
    return NextResponse.json({ unavailableSlots: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'يجب تسجيل الدخول أولًا.' }, { status: 401 })
    }

    const adminAuth = getAdminAuth()
    const adminDb = getAdminDb()
    const decoded = await adminAuth.verifyIdToken(token)

    const body = (await req.json()) as {
      name?: unknown
      email?: unknown
      phone?: unknown
      date?: unknown
      time?: unknown
      duration?: unknown
      notes?: unknown
      paymentMethod?: unknown
      paymentReference?: unknown
      paymentNote?: unknown
      couponCode?: unknown
      discountAmount?: unknown
    }

    const name = sanitizeText(body.name)
    const email = sanitizeText(body.email)
    const phone = sanitizeText(body.phone)
    const date = sanitizeText(body.date)
    const time = sanitizeText(body.time)
    const notes = sanitizeText(body.notes)
    const paymentMethodInput = sanitizeText(body.paymentMethod)
    const paymentReference = sanitizeText(body.paymentReference)
    const paymentNote = sanitizeText(body.paymentNote)
    const couponCode = sanitizeText(body.couponCode).toUpperCase()
    const duration = body.duration

    if (!name || !email || !phone || !date || !time || !isAllowedDuration(duration)) {
      return NextResponse.json({ error: 'بيانات الحجز غير مكتملة.' }, { status: 400 })
    }

    if (!isValidDateString(date)) {
      return NextResponse.json({ error: 'تاريخ الحجز غير صحيح.' }, { status: 400 })
    }

    const validSlots = getBookableTimeSlots(duration)
    if (!validSlots.includes(time)) {
      return NextResponse.json({ error: 'وقت الحجز غير متاح لهذه المدة.' }, { status: 400 })
    }

    if (isFriday(date)) {
      return NextResponse.json({ error: 'لا تتوفر حجوزات يوم الجمعة.' }, { status: 400 })
    }

    const minDate = getDateAfterDays(BOOKING_RULES.minDaysAhead)
    const maxDate = getDateAfterDays(BOOKING_RULES.maxDaysAhead)

    if (date < minDate) {
      return NextResponse.json({ error: 'لا يمكن حجز جلسة في نفس اليوم أو في الماضي.' }, { status: 400 })
    }

    if (date > maxDate) {
      return NextResponse.json({ error: 'لا يمكن الحجز لأكثر من 30 يومًا مقدمًا.' }, { status: 400 })
    }

    const paymentMethod = isAllowedPaymentMethod(paymentMethodInput) ? paymentMethodInput : 'manual'

    if (!paymentReference) {
      return NextResponse.json({ error: 'اكتبي رقم العملية أو مرجع الدفع لمراجعة الحجز.' }, { status: 400 })
    }

    const newStart = toMinutes(time)
    const newEndWithBuffer = newStart + duration + BOOKING_RULES.bufferMinutes

    const existingSnap = await adminDb
      .collection('bookings')
      .where('date', '==', date)
      .where('status', 'in', ['pending', 'payment_submitted', 'confirmed'])
      .get()

    const hasConflict = existingSnap.docs.some((docItem) => {
      const booking = docItem.data()
      const existingTime = String(booking.time || '')
      const existingDuration = Number(booking.duration || 60)

      if (!existingTime.includes(':')) return false

      const existingStart = toMinutes(existingTime)
      const existingEndWithBuffer = existingStart + existingDuration + BOOKING_RULES.bufferMinutes

      return newStart < existingEndWithBuffer && existingStart < newEndWithBuffer
    })

    if (hasConflict) {
      return NextResponse.json({ error: 'هذا الموعد غير متاح بالفعل. اختاري وقتًا آخر.' }, { status: 409 })
    }

    const originalPrice = SESSION_PRICES[duration]
    const couponResult = await validateCoupon(couponCode, originalPrice)
    const discountAmount = couponResult.discountAmount
    const finalAmount = Math.max(0, originalPrice - discountAmount)

    if (couponResult.couponId && discountAmount > 0) {
      await adminDb.collection('coupons').doc(couponResult.couponId).set(
        {
          usageCount: FieldValue.increment(1),
          updatedAt: Timestamp.now(),
        },
        { merge: true },
      )
    }

    const bookingRef = await adminDb.collection('bookings').add({
      userId: decoded.uid,
      name,
      email,
      phone,
      date,
      time,
      duration,
      status: 'payment_submitted',
      paymentStatus: 'submitted',
      sessionType: duration === 90 ? 'deep_session' : 'clarity_session',
      price: finalAmount,
      originalPrice,
      discountAmount,
      finalAmount,
      couponCode: couponResult.appliedCode,
      paymentMethod,
      paymentReference,
      paymentNote,
      notes,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })

    return NextResponse.json({ success: true, bookingId: bookingRef.id })
  } catch (error) {
    console.error('Booking API error:', error)
    return NextResponse.json({ error: 'حدث خطأ أثناء إرسال طلب الحجز. حاولي مرة أخرى.' }, { status: 500 })
  }
}
