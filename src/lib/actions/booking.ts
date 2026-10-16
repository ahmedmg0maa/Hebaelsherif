'use server'

import { getServerClient } from '@/lib/supabase/server'
import { isUuid } from '@/lib/delivery/security'
import { hasSupabasePublicConfig } from '@/lib/supabase/public-key'

export type BookingInput = {
  serviceId: string
  date: string
  time: string
  fullName: string
  phone: string
  notes: string
  subscriptionId?: string
}

export type BookingData = { bookingId: string; orderId?: string; total: number; expiresAt?: string | null; packageBacked?: boolean; confirmed?: boolean; bookingStatus?: string; orderStatus?: string | null }
type Result =
  | { ok: true; data: BookingData }
  | { ok: false; error: string; code?: 'AUTH' | 'SLOT_TAKEN'; terminal?: boolean }

const hasEnv = hasSupabasePublicConfig

const messages: Record<string, string> = {
  offer_capacity_exhausted: 'اكتملت سعة العرض. حدّثي الصفحة لمراجعة سعر الجلسة الحالي.',
  site_intake_closed: 'استقبال الحجوزات أو الطلبات الجديدة متوقف مؤقتًا. حجوزاتك السابقة محفوظة.',
  BOOKING_ATTEMPT_CONFLICT: 'هذه المحاولة مرتبطة ببيانات حجز سابقة. تابعي النتيجة من حسابك.',
  INVALID_NOTES: 'الملاحظة يجب ألا تتجاوز ٢٠٠٠ حرف.',
  INVALID_PAYMENT_MODE: 'طريقة تأكيد هذا الحجز غير متاحة. راجعي الاختيار.',
  INVALID_CUSTOMER_DETAILS: 'راجعي الاسم ورقم الهاتف.',
  INVALID_NAME: 'اكتبي الاسم الكامل.',
  INVALID_PHONE: 'اكتبي رقم هاتف صحيحًا.',
  SERVICE_UNAVAILABLE: 'هذه الجلسة غير متاحة للحجز حاليًا.',
  DATE_OUT_OF_RANGE: 'اختاري يومًا متاحًا خلال الثلاثين يومًا القادمة.',
  TIME_IN_PAST: 'اختاري موعدًا لاحقًا.',
  OUTSIDE_AVAILABILITY: 'هذا الوقت خارج مواعيد الإتاحة.',
  DAY_CLOSED: 'هذا اليوم مغلق أو الوقت غير متاح.',
  SLOT_TAKEN: 'حُجز هذا الموعد للتو — اختاري وقتًا آخر.',
  SLOT_UNAVAILABLE: 'لم يعد هذا الموعد متاحًا. اختاري وقتًا آخر.',
  HOLD_EXPIRED: 'انتهت مهلة تثبيت الموعد. اختاري الوقت مرة أخرى.',
  PAYMENT_REQUIRED: 'هذه الخدمة تتطلب وسيلة دفع مهيأة.',
  PACKAGE_NOT_FOUND: 'الباقة غير متاحة لهذا الحساب.',
  subscription_inactive: 'الباقة منتهية أو غير نشطة.',
  credit_balance_out_of_range: 'لا يوجد رصيد جلسات كافٍ في الباقة.',
}

type HoldData = { holdId: string; expiresAt: string; startsAt: string }
type HoldResult = { ok: true; data: HoldData } | { ok: false; error: string; code?: 'AUTH' | 'SLOT_TAKEN'; terminal?: boolean }

async function requireBookingUser() {
  if (!hasEnv()) return { error: 'إنشاء الحجوزات غير متاح في وضع العرض.' } as const
  const supabase = await getServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'سجّلي دخولك أولًا لإتمام الحجز وحفظه داخل حسابك.', auth: true } as const
  return { supabase, user } as const
}

export async function createBookingHold(input: Pick<BookingInput, 'serviceId' | 'date' | 'time'>): Promise<HoldResult> {
  const context = await requireBookingUser()
  if ('error' in context) return { ok: false, code: context.auth ? 'AUTH' : undefined, error: context.error ?? 'إنشاء الحجوزات غير متاح حاليًا.' }
  const { data, error } = await context.supabase.rpc('create_booking_hold', {
    p_service_id: input.serviceId, p_date: input.date, p_time: input.time,
  })
  if (error || !data?.holdId) {
    const slotTaken = error?.message.includes('SLOT_') || error?.code === '23P01'
    return { ok: false, code: slotTaken ? 'SLOT_TAKEN' : undefined, error: error?.message.includes('site_intake_closed') ? messages.site_intake_closed : slotTaken ? messages.SLOT_UNAVAILABLE : 'تعذّر تثبيت الموعد مؤقتًا.' }
  }
  return { ok: true, data: data as HoldData }
}

export async function releaseBookingHold(holdId: string) {
  const context = await requireBookingUser()
  if ('error' in context) return
  await context.supabase.rpc('release_my_booking_hold', { p_hold_id: holdId })
}

export async function completeBookingFromHold(input: BookingInput, holdId: string, isFree: boolean): Promise<Result> {
  const context = await requireBookingUser()
  if ('error' in context) return { ok: false, code: context.auth ? 'AUTH' : undefined, error: context.error ?? 'إنشاء الحجوزات غير متاح حاليًا.' }
  if (!isUuid(holdId) || !isUuid(input.serviceId) || (input.subscriptionId && !isUuid(input.subscriptionId))) return { ok:false, terminal:true, error:'بيانات الحجز غير صحيحة.' }
  const { data, error } = await context.supabase.rpc('complete_booking_hold_v2', {
    p_hold_id:holdId, p_mode:isFree ? 'free' : input.subscriptionId ? 'package' : 'paid',
    p_full_name:input.fullName.trim(), p_phone:input.phone.trim(), p_notes:input.notes.trim(),
    p_subscription_id:isFree ? null : input.subscriptionId || null,
  })
  if (error || !data) {
    const key = Object.keys(messages).find((candidate) => error?.message.includes(candidate))
    const slotTaken = key === 'SLOT_TAKEN' || key === 'SLOT_UNAVAILABLE' || error?.code === '23P01'
    return { ok: false, code: slotTaken ? 'SLOT_TAKEN' : undefined, terminal: Boolean(key && key !== 'BOOKING_ATTEMPT_CONFLICT') || slotTaken, error: key ? messages[key] : 'تعذّر تأكيد نتيجة الحجز. أعيدي المحاولة نفسها أو راجعي حجوزاتك من حسابك.' }
  }
  if (!isUuid(data.bookingId) || !Number.isFinite(data.total) || data.total < 0 || !['pending','confirmed','completed','cancelled','no_show'].includes(data.bookingStatus)) return { ok:false, error:'تعذّر تأكيد نتيجة الحجز. أعيدي المحاولة نفسها.' }
  return { ok: true, data: data as BookingData }
}

export async function createFreeBooking(input: BookingInput): Promise<Result> {
  const hold = await createBookingHold(input)
  if (!hold.ok) return hold
  return completeBookingFromHold(input, hold.data.holdId, true)
}

export async function createBookingOrder(input: BookingInput): Promise<Result> {
  const hold = await createBookingHold(input)
  if (!hold.ok) return hold
  return completeBookingFromHold(input, hold.data.holdId, false)
}
