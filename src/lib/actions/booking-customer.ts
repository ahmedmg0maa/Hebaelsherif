'use server'

import { revalidatePath } from 'next/cache'
import { getServerClient, getServiceClient, hasSupabaseServerSecret } from '@/lib/supabase/server'
import { hasSupabasePublicConfig } from '@/lib/supabase/public-key'
import { isUuid } from '@/lib/delivery/security'
import { parseCairoLocalDateTime } from '@/lib/booking/cairo-time'

type Result = { ok: true; message: string } | { ok: false; error: string }

const hasEnv = () => hasSupabasePublicConfig() && hasSupabaseServerSecret()
const controlCharacters = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/

function normalizedReason(reason: string) {
  const value = reason.trim()
  return value.length <= 1000 && !controlCharacters.test(value) ? value : null
}

async function currentUserId() {
  const supabase = await getServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  return error ? null : user?.id ?? null
}

export async function cancelMyBooking(bookingId: string, reason: string): Promise<Result> {
  if (!hasEnv()) return { ok: false, error: 'إدارة الحجز غير متاحة في هذه البيئة.' }
  if (!isUuid(bookingId)) return { ok: false, error: 'تعذّر التحقق من الحجز.' }
  const safeReason = normalizedReason(reason)
  if (safeReason === null) return { ok: false, error: 'الملاحظة يجب ألا تتجاوز ١٠٠٠ حرف.' }
  const userId = await currentUserId()
  if (!userId) return { ok: false, error: 'سجّلي دخولك أولًا.' }
  const { data, error } = await getServiceClient().rpc('cancel_customer_booking_governed', {
    p_actor_id: userId,
    p_booking_id: bookingId,
    p_reason: safeReason,
  })
  if (error) {
    const code = error.message.toLowerCase()
    if (code.includes('booking_payment_under_review')) return { ok:false,error:'يوجد دفع أو استرداد قيد المراجعة لهذا الحجز. تواصلي معنا لاستكمال الإلغاء.' }
    if (code.includes('cancellation_notice_required')) return { ok: false, error: 'انتهت مهلة الإلغاء الذاتي. تواصلي معنا لمراجعة الحالة.' }
    if (code.includes('booking_cannot_be_cancelled')) return { ok: false, error: 'لا يمكن إلغاء هذا الحجز في حالته الحالية.' }
    return { ok: false, error: 'تعذّر إلغاء الحجز الآن.' }
  }
  if (!data?.outcome) return { ok: false, error: 'تعذّر تأكيد إلغاء الحجز.' }
  revalidatePath('/dashboard/bookings'); revalidatePath('/booking')
  return { ok: true, message: data.creditRestored ? 'تم إلغاء الحجز وإعادة رصيد الباقة.' : 'تم إلغاء الحجز.' }
}

export async function requestMyBookingReschedule(bookingId: string, proposedStartsAt: string, reason: string): Promise<Result> {
  if (!hasEnv()) return { ok: false, error: 'إدارة الحجز غير متاحة في هذه البيئة.' }
  if (!isUuid(bookingId)) return { ok: false, error: 'تعذّر التحقق من الحجز.' }
  const proposed = parseCairoLocalDateTime(proposedStartsAt)
  if (!proposed) return { ok: false, error: 'اختاري موعدًا صحيحًا بتوقيت القاهرة.' }
  const safeReason = normalizedReason(reason)
  if (safeReason === null) return { ok: false, error: 'الملاحظة يجب ألا تتجاوز ١٠٠٠ حرف.' }
  const userId = await currentUserId()
  if (!userId) return { ok: false, error: 'سجّلي دخولك أولًا.' }
  const { data, error } = await getServiceClient().rpc('request_customer_booking_reschedule_governed', {
    p_actor_id: userId,
    p_booking_id: bookingId,
    p_proposed_starts_at: proposed.toISOString(),
    p_reason: safeReason,
  })
  if (error) {
    const code = error.message.toLowerCase()
    if (code.includes('reschedule_already_pending')) return { ok: false, error: 'يوجد طلب تغيير قيد المراجعة بالفعل.' }
    if (code.includes('proposed_slot_unavailable')) return { ok: false, error: 'الموعد المقترح غير متاح فعليًا. اختاري وقتًا آخر.' }
    if (code.includes('reschedule_notice_required')) return { ok: false, error: 'انتهت مهلة تغيير الموعد الذاتي.' }
    if (code.includes('reschedule_limit_reached')) return { ok: false, error: 'وصلتِ إلى الحد المسموح لتغييرات هذا الحجز.' }
    if (code.includes('booking_cannot_be_rescheduled')) return { ok: false, error: 'لا يمكن تغيير هذا الحجز في حالته الحالية.' }
    return { ok: false, error: 'تعذّر إرسال طلب تغيير الموعد.' }
  }
  if (!data?.outcome) return { ok: false, error: 'تعذّر تأكيد إرسال الطلب.' }
  revalidatePath('/dashboard/bookings')
  return { ok: true, message: data.outcome === 'existing' ? 'هذا الطلب قيد المراجعة بالفعل.' : 'أُرسل الموعد المقترح للإدارة وستصلك نتيجة المراجعة.' }
}
