import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin'
import { BOOKING_RULES, TIME_SLOTS } from '@/constants/booking'
import type { BookingDuration } from '@/types'

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

function sanitizeText(value: unknown) {
  if (typeof value !== 'string') return ''
  return value.trim()
}


export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const date = sanitizeText(searchParams.get('date'))

    if (!date || !isValidDateString(date)) {
      return NextResponse.json({ unavailableSlots: [] })
    }

    const adminDb = getAdminDb()
    const bookingsSnap = await adminDb
      .collection('bookings')
      .where('date', '==', date)
      .where('status', 'in', ['pending', 'confirmed'])
      .get()

    const unavailableSlots = new Set<string>()

    bookingsSnap.docs.forEach((docItem) => {
      const booking = docItem.data()
      const existingTime = String(booking.time || '')
      const existingDuration = Number(booking.duration || 60)

      if (!existingTime.includes(':')) return

      const existingStart = toMinutes(existingTime)
      const existingEndWithBuffer = existingStart + existingDuration + BOOKING_RULES.bufferMinutes

      TIME_SLOTS.forEach((slot) => {
        const slotStart = toMinutes(slot)
        const slotEnd = slotStart + 90 + BOOKING_RULES.bufferMinutes
        if (slotStart < existingEndWithBuffer && existingStart < slotEnd) {
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
    }

    const name = sanitizeText(body.name)
    const email = sanitizeText(body.email)
    const phone = sanitizeText(body.phone)
    const date = sanitizeText(body.date)
    const time = sanitizeText(body.time)
    const notes = sanitizeText(body.notes)
    const duration = body.duration

    if (!name || !email || !phone || !date || !time || !isAllowedDuration(duration)) {
      return NextResponse.json({ error: 'بيانات الحجز غير مكتملة.' }, { status: 400 })
    }

    if (!isValidDateString(date)) {
      return NextResponse.json({ error: 'تاريخ الحجز غير صحيح.' }, { status: 400 })
    }

    if (!TIME_SLOTS.includes(time as (typeof TIME_SLOTS)[number])) {
      return NextResponse.json({ error: 'وقت الحجز غير متاح.' }, { status: 400 })
    }

    if (isFriday(date)) {
      return NextResponse.json({ error: 'لا تتوفر حجوزات يوم الجمعة.' }, { status: 400 })
    }

    const minDate = getDateAfterDays(BOOKING_RULES.minDaysAhead)
    const maxDate = getDateAfterDays(BOOKING_RULES.maxDaysAhead)

    if (date < minDate) {
      return NextResponse.json(
        { error: 'لا يمكن حجز جلسة في نفس اليوم أو في الماضي.' },
        { status: 400 },
      )
    }

    if (date > maxDate) {
      return NextResponse.json(
        { error: 'لا يمكن الحجز لأكثر من 30 يومًا مقدمًا.' },
        { status: 400 },
      )
    }

    const newStart = toMinutes(time)
    const newEndWithBuffer = newStart + duration + BOOKING_RULES.bufferMinutes

    const existingSnap = await adminDb
      .collection('bookings')
      .where('date', '==', date)
      .where('status', 'in', ['pending', 'confirmed'])
      .get()

    const hasConflict = existingSnap.docs.some((docItem) => {
      const booking = docItem.data()
      const existingTime = String(booking.time || '')
      const existingDuration = Number(booking.duration || 60)

      if (!existingTime.includes(':')) return false

      const existingStart = toMinutes(existingTime)
      const existingEndWithBuffer =
        existingStart + existingDuration + BOOKING_RULES.bufferMinutes

      return newStart < existingEndWithBuffer && existingStart < newEndWithBuffer
    })

    if (hasConflict) {
      return NextResponse.json(
        { error: 'هذا الموعد غير متاح بالفعل. اختاري وقتًا آخر.' },
        { status: 409 },
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
      status: 'pending',
      notes,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })

    return NextResponse.json({ success: true, bookingId: bookingRef.id })
  } catch (error) {
    console.error('Booking API error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ أثناء إرسال طلب الحجز. حاولي مرة أخرى.' },
      { status: 500 },
    )
  }
}
