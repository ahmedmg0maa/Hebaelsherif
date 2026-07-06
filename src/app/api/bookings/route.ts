export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { assertSupabasePublicEnv } from '@/lib/supabase/env'
import { BOOKING_RULES, getBookableTimeSlots } from '@/constants/booking'
import { createBookingSchema, validateBookingBusinessRules } from '@/lib/validation/booking'
import { calculateFinalAmount, getSessionPrice } from '@/lib/booking/pricing'
import { timeToMinutes } from '@/lib/booking/date'

const ACTIVE_BOOKING_STATUSES = ['pending', 'awaiting_payment', 'payment_submitted', 'confirmed', 'reschedule_requested']

function bearer(req: NextRequest) {
  const header = req.headers.get('authorization') || ''
  return header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : ''
}

function createUserSupabaseClient(token: string): any {
  const { url, anonKey } = assertSupabasePublicEnv()
  return createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

function normalizeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes('BOOKING_SLOT_CONFLICT') || message.includes('bookings_no_overlap')) return 'هذا الموعد غير متاح بالفعل. اختاري وقتًا آخر.'
  if (message.includes('FRIDAY_BLOCKED')) return 'لا تتوفر حجوزات يوم الجمعة.'
  if (message.includes('BOOKING_DATE_TOO_SOON')) return 'لا يمكن حجز جلسة في نفس اليوم أو في الماضي.'
  if (message.includes('BOOKING_DATE_TOO_FAR')) return 'لا يمكن الحجز لأكثر من 30 يومًا مقدمًا.'
  if (message.includes('UNAUTHENTICATED')) return 'يجب تسجيل الدخول أولًا.'
  return 'تعذر إنشاء الحجز الآن. راجعي البيانات وحاولي مرة أخرى.'
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const date = String(searchParams.get('date') || '').trim()
    const duration = Number(searchParams.get('duration') || 60) === 90 ? 90 : 60

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ unavailableSlots: [] })
    }

    const admin = createSupabaseAdminClient()
    const { data, error } = await admin
      .from('bookings')
      .select('start_time,duration_minutes,status')
      .eq('date', date)
      .in('status', ACTIVE_BOOKING_STATUSES)

    if (error) throw error

    const unavailableSlots = new Set<string>()

    ;(data || []).forEach((booking: any) => {
      const existingTime = String(booking.start_time || '').slice(0, 5)
      const existingDuration = Number(booking.duration_minutes || 60)
      if (!existingTime.includes(':')) return

      const existingStart = timeToMinutes(existingTime)
      const existingEndWithBuffer = existingStart + existingDuration + BOOKING_RULES.bufferMinutes

      getBookableTimeSlots(duration).forEach((slot) => {
        const slotStart = timeToMinutes(slot)
        const slotEndWithBuffer = slotStart + duration + BOOKING_RULES.bufferMinutes
        if (slotStart < existingEndWithBuffer && existingStart < slotEndWithBuffer) {
          unavailableSlots.add(slot)
        }
      })
    })

    return NextResponse.json({ unavailableSlots: Array.from(unavailableSlots) })
  } catch (error) {
    console.error('Supabase booking availability API error:', error)
    return NextResponse.json({ unavailableSlots: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = bearer(req)
    if (!token) return NextResponse.json({ error: 'يجب تسجيل الدخول أولًا.' }, { status: 401 })

    const admin = createSupabaseAdminClient()
    const { data: authData, error: authError } = await admin.auth.getUser(token)
    if (authError || !authData.user) return NextResponse.json({ error: 'انتهت صلاحية الجلسة. سجلي الدخول مرة أخرى.' }, { status: 401 })

    const parsed = createBookingSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'بيانات الحجز غير مكتملة أو غير صحيحة.' }, { status: 400 })
    }

    const input = parsed.data
    const businessError = validateBookingBusinessRules(input)
    if (businessError) return NextResponse.json({ error: businessError }, { status: 400 })

    const originalAmount = getSessionPrice(input.duration)
    const userClient = createUserSupabaseClient(token)

    const couponResult = input.couponCode
      ? await userClient.rpc('validate_coupon', {
          input_code: input.couponCode.toUpperCase(),
          input_amount: originalAmount,
          input_scope: 'sessions',
        })
      : { data: { valid: false, appliedCode: '', discountAmount: 0, couponId: null }, error: null }

    if (couponResult.error) throw couponResult.error

    const coupon = (couponResult.data || {}) as { discountAmount?: number; couponId?: string | null; appliedCode?: string }
    const discountAmount = Number(coupon.discountAmount || 0)
    const finalAmount = calculateFinalAmount(originalAmount, discountAmount)

    const { data, error } = await userClient.rpc('create_booking_with_lock', {
      payload: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        date: input.date,
        time: input.time,
        duration: input.duration,
        notes: input.notes,
        paymentMethod: input.paymentMethod,
        paymentReference: input.paymentReference,
        paymentNote: input.paymentNote,
        originalAmount,
        discountAmount,
        finalAmount,
        couponId: coupon.couponId || '',
        appliedCode: coupon.appliedCode || '',
      },
    })

    if (error) throw error

    return NextResponse.json({
      success: true,
      bookingId: (data as { bookingId?: string })?.bookingId,
      status: 'payment_submitted',
      originalAmount,
      discountAmount,
      finalAmount,
    })
  } catch (error) {
    console.error('Supabase create booking API error:', error)
    const message = normalizeError(error)
    return NextResponse.json({ error: message }, { status: message.includes('غير متاح') ? 409 : 400 })
  }
}
