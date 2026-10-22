'use server'

import { revalidatePath } from 'next/cache'
import { getServiceClient, hasSupabaseServerSecret } from '@/lib/supabase/server'
import { FRESH_ADMIN_ASSURANCE_ERROR, requireFreshAdminAssurance, requirePermission } from '@/lib/auth/permissions'
import { hasSupabasePublicConfig } from '@/lib/supabase/public-key'

type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string }
const NO_ENV = 'غير متاح في بيئة العرض التجريبية.'
const NOT_ALLOWED = 'لا تملكين الصلاحية المطلوبة لهذه العملية.'
const GENERIC = 'تعذّر إتمام العملية الآن — حاولي مرة أخرى.'
const hasEnv = () => hasSupabasePublicConfig() && hasSupabaseServerSecret()

function reviewError(message?: string) {
  if (message?.includes('booking_payment_requires_review')) return 'الحجز المرتبط ملغى أو تجاوز موعده. راجعي الحجز قبل اعتماد الدفع.'
  if (message?.includes('payment_not_found')) return 'الدفعة غير موجودة.'
  if (message?.includes('payment_not_pending')) return 'هذه الدفعة روجعت بالفعل أو لم تعد قابلة للمراجعة.'
  if (message?.includes('order_not_reviewable')) return 'حالة الطلب لا تسمح باعتماد الدفع.'
  if (message?.includes('payment_order_mismatch')) return 'قيمة الدفعة لا تطابق إجمالي الطلب؛ أوقفت العملية للمراجعة.'
  if (message?.includes('payment_proof_required')) return 'لا يمكن الاعتماد قبل وجود إيصال صحيح مرتبط بهذا الطلب.'
  if (message?.includes('payment_proof_review_required')) return 'افتحي الإيصال وراجعيه أولًا؛ صلاحية المراجعة ثلاثون دقيقة.'
  if (message?.includes('permission_required')) return NOT_ALLOWED
  if (message?.includes('invalid_reject_reason')) return 'سبب الرفض يجب أن يكون واضحًا وألا يتجاوز 500 حرف.'
  return GENERIC
}

export async function getProofUrl(paymentId: string): Promise<ActionResult<{ url: string }>> {
  if (!hasEnv()) return { ok: false, error: NO_ENV }
  const admin = await requirePermission('payments.view')
  if (!admin?.userId) return { ok: false, error: NOT_ALLOWED }
  const service = getServiceClient()
  const { data: proof, error: proofError } = await service.rpc('get_payment_proof_for_review', {
    p_actor_id: admin.userId,
    p_payment_id: paymentId,
  })
  if (proofError || !proof?.storagePath || !proof?.proofId) return { ok: false, error: proofError?.message.includes('not_found') ? 'لا يوجد إيصال مرفق.' : GENERIC }
  const { data, error } = await service.storage.from('payment-proofs').createSignedUrl(String(proof.storagePath), 10 * 60)
  if (error || !data) return { ok: false, error: GENERIC }
  const { error: confirmationError } = await service.rpc('confirm_payment_proof_review', {
    p_actor_id: admin.userId,
    p_payment_id: paymentId,
    p_proof_id: String(proof.proofId),
  })
  if (confirmationError) return { ok: false, error: GENERIC }
  return { ok: true, data: { url: data.signedUrl } }
}

export async function approvePayment(paymentId: string): Promise<ActionResult> {
  if (!hasEnv()) return { ok: false, error: NO_ENV }
  const admin = await requireFreshAdminAssurance('payments.approve')
  if (!admin?.userId) return { ok: false, error: FRESH_ADMIN_ASSURANCE_ERROR }
  const { data, error } = await getServiceClient().rpc('approve_payment_governed', { p_payment_id: paymentId, p_actor_id: admin.userId })
  if (error) return { ok: false, error: reviewError(error.message) }
  revalidatePath('/admin/payments'); revalidatePath('/admin/orders'); revalidatePath('/admin/overview'); revalidatePath('/dashboard/bookings'); revalidatePath('/dashboard'); revalidatePath('/booking')
  return { ok: true, data: (data ?? null) as null }
}

export async function rejectPayment(paymentId: string, reason: string): Promise<ActionResult> {
  if (!hasEnv()) return { ok: false, error: NO_ENV }
  const admin = await requireFreshAdminAssurance('payments.reject')
  if (!admin?.userId) return { ok: false, error: FRESH_ADMIN_ASSURANCE_ERROR }
  const trimmed = reason.trim()
  if (trimmed.length < 3 || trimmed.length > 500) return { ok: false, error: 'اكتبي سببًا واضحًا من 3 إلى 500 حرف ليظهر للعميلة.' }
  const { data, error } = await getServiceClient().rpc('reject_payment_governed', { p_payment_id: paymentId, p_actor_id: admin.userId, p_reason: trimmed })
  if (error) return { ok: false, error: reviewError(error.message) }
  revalidatePath('/admin/payments'); revalidatePath('/admin/orders'); revalidatePath('/admin/overview'); revalidatePath('/dashboard/bookings'); revalidatePath('/dashboard'); revalidatePath('/booking')
  return { ok: true, data: (data ?? null) as null }
}

export async function updateOrderStatus(orderId: string, status: 'cancelled' | 'expired', reason?: string): Promise<ActionResult> {
  if (!hasEnv()) return { ok: false, error: NO_ENV }
  const admin = await requirePermission('orders.update')
  if (!admin?.userId) return { ok: false, error: NOT_ALLOWED }
  const cleanReason = reason?.trim() ?? ''
  if (status === 'cancelled' && (cleanReason.length < 3 || cleanReason.length > 500))
    return { ok: false, error: 'اكتبي سبب إلغاء واضحًا من 3 إلى 500 حرف.' }
  const { error } = await getServiceClient().rpc('transition_order_governed', { p_order_id: orderId, p_actor_id: admin.userId, p_status: status, p_reason: cleanReason || null })
  if (error) {
    if (error.message.includes('order_not_found')) return { ok: false, error: 'الطلب غير موجود.' }
    if (error.message.includes('invalid_order_transition')) return { ok: false, error: 'حالة الطلب الحالية لا تسمح بهذا الانتقال.' }
    return { ok: false, error: GENERIC }
  }
  revalidatePath('/admin/orders'); revalidatePath('/admin/overview')
  return { ok: true, data: null }
}

export async function manageOrderRefund(
  orderId: string,
  action: 'initiate' | 'complete' | 'fail',
  input: { reason?: string; evidenceReference?: string } = {},
): Promise<ActionResult> {
  if (!hasEnv()) return { ok: false, error: NO_ENV }
  const admin = await requireFreshAdminAssurance('orders.refund')
  if (!admin?.userId) return { ok: false, error: FRESH_ADMIN_ASSURANCE_ERROR }
  const reason = input.reason?.trim() ?? ''
  const evidenceReference = input.evidenceReference?.trim() ?? ''
  if ((action === 'initiate' || action === 'fail') && (reason.length < 3 || reason.length > 500))
    return { ok: false, error: 'اكتبي سببًا واضحًا من 3 إلى 500 حرف.' }
  if (action === 'complete' && (evidenceReference.length < 3 || evidenceReference.length > 120))
    return { ok: false, error: 'أدخلي مرجع تنفيذ الاسترداد من 3 إلى 120 حرفًا.' }
  const { error } = await getServiceClient().rpc('manage_order_refund', {
    p_actor_id: admin.userId,
    p_order_id: orderId,
    p_action: action,
    p_reason: reason || null,
    p_evidence_reference: evidenceReference || null,
  })
  if (error) {
    if (error.message.includes('subscription_future_bookings_require_cancellation')) return {ok:false,error:'الباقة مرتبطة بجلسات قادمة. ألغِي هذه الحجوزات أولًا قبل إكمال الاسترداد.'}
    if (error.message.includes('approved_payment_not_found')) return { ok: false, error: 'لا توجد دفعة معتمدة قابلة للاسترداد.' }
    if (error.message.includes('order_not_refundable') || error.message.includes('refund_not_processing')) return { ok: false, error: 'حالة الطلب لا تسمح بهذه الخطوة.' }
    if (error.message.includes('permission_required')) return { ok: false, error: NOT_ALLOWED }
    return { ok: false, error: GENERIC }
  }
  revalidatePath('/admin/orders'); revalidatePath('/admin/payments'); revalidatePath('/admin/overview')
  revalidatePath('/dashboard/orders'); revalidatePath('/dashboard/payments'); revalidatePath('/dashboard/bookings'); revalidatePath('/booking')
  return { ok: true, data: null }
}
