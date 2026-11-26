'use server'

import { revalidatePath } from 'next/cache'
import { isAccountDeletionStatus, type AccountDeletionStatus } from '@/lib/account-deletion/status'
import { FRESH_ADMIN_ASSURANCE_ERROR, requireFreshAdminAssurance, requirePermission } from '@/lib/auth/permissions'
import { hasSupabasePublicConfig } from '@/lib/supabase/public-key'
import { getServerClient, getServiceClient, hasSupabaseServerSecret } from '@/lib/supabase/server'

type Result = { ok: true; status: AccountDeletionStatus } | { ok: false; error: string }
type ReviewStatus = Extract<AccountDeletionStatus, 'in_review' | 'awaiting_customer' | 'approved_for_execution' | 'declined'>

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const controlCharacters = /[\u0000-\u001f\u007f]/
const configured = () => hasSupabasePublicConfig() && hasSupabaseServerSecret()

async function customerId() {
  const { data: { user }, error } = await (await getServerClient()).auth.getUser()
  return error ? null : user?.id ?? null
}

function customerError(message: string) {
  if (message.includes('admin_role_transfer_required')) return 'يجب نقل أو إزالة الدور الإداري أولًا عبر بوابة الصلاحيات الآمنة.'
  if (message.includes('rate_limited')) return 'وصلتِ إلى حد الطلبات الآمن خلال ٣٠ يومًا. تواصلي مع الدعم للمراجعة.'
  return 'تعذّر تحديث طلب حذف الحساب الآن.'
}

export async function requestAccountDeletion(): Promise<Result> {
  if (!configured()) return { ok: false, error: 'إدارة حذف الحساب غير متاحة في هذه البيئة.' }
  const actorId = await customerId()
  if (!actorId) return { ok: false, error: 'سجّلي دخولك أولًا.' }
  const { data, error } = await getServiceClient().rpc('request_customer_account_deletion', { p_actor_id: actorId })
  if (error) return { ok: false, error: customerError(error.message) }
  if (!data || !isAccountDeletionStatus(data.status)) return { ok: false, error: 'تعذّر تأكيد تسجيل الطلب.' }
  revalidatePath('/dashboard/settings'); revalidatePath('/dashboard/notifications'); revalidatePath('/admin/users')
  return { ok: true, status: data.status }
}

export async function cancelAccountDeletion(): Promise<Result> {
  if (!configured()) return { ok: false, error: 'إدارة حذف الحساب غير متاحة في هذه البيئة.' }
  const actorId = await customerId()
  if (!actorId) return { ok: false, error: 'سجّلي دخولك أولًا.' }
  const { data, error } = await getServiceClient().rpc('cancel_customer_account_deletion', { p_actor_id: actorId })
  if (error) return { ok: false, error: customerError(error.message) }
  if (!data || !isAccountDeletionStatus(data.status)) return { ok: false, error: 'تعذّر تأكيد إلغاء الطلب.' }
  revalidatePath('/dashboard/settings'); revalidatePath('/dashboard/notifications'); revalidatePath('/admin/users')
  return { ok: true, status: data.status }
}

export async function reviewAccountDeletionRequest(requestId: string, status: ReviewStatus, note: string): Promise<Result> {
  if (!configured() || !UUID.test(requestId)) return { ok: false, error: 'تعذّر التحقق من الطلب.' }
  if (!['in_review', 'awaiting_customer', 'approved_for_execution', 'declined'].includes(status)) {
    return { ok: false, error: 'حالة المراجعة غير صحيحة.' }
  }
  const cleanNote = note.trim().replace(/\s+/g, ' ')
  if ((cleanNote && (cleanNote.length < 3 || cleanNote.length > 1000 || controlCharacters.test(note)))
    || (['awaiting_customer', 'declined'].includes(status) && !cleanNote)) {
    return { ok: false, error: 'اكتبي ملاحظة واضحة من ٣ إلى ١٠٠٠ حرف لهذه الحالة.' }
  }
  const admin = status === 'approved_for_execution'
    ? await requireFreshAdminAssurance('users.manage')
    : await requirePermission('users.manage')
  if (!admin?.userId) {
    return { ok: false, error: status === 'approved_for_execution' ? FRESH_ADMIN_ASSURANCE_ERROR : 'لا تملكين صلاحية إدارة طلبات الحذف.' }
  }
  const { data, error } = await getServiceClient().rpc('review_customer_account_deletion', {
    p_actor_id: admin.userId,
    p_request_id: requestId,
    p_status: status,
    p_note: cleanNote || null,
  })
  if (error) {
    if (error.message.includes('admin_role_transfer_required')) return { ok: false, error: 'انقلي الدور الإداري أو أزيليه قبل اعتماد الحذف.' }
    return { ok: false, error: 'تعذّر حفظ مراجعة الطلب.' }
  }
  if (!data || !isAccountDeletionStatus(data.status)) return { ok: false, error: 'تعذّر تأكيد نتيجة المراجعة.' }
  revalidatePath('/admin/users'); revalidatePath('/dashboard/settings'); revalidatePath('/dashboard/notifications')
  return { ok: true, status: data.status }
}

export async function completeAccountDeletionRequest(requestId: string, executionReference: string): Promise<Result> {
  if (!configured() || !UUID.test(requestId)) return { ok: false, error: 'تعذّر التحقق من الطلب.' }
  const reference = executionReference.trim()
  if (!/^[A-Za-z0-9._:/-]{3,128}$/.test(reference)) return { ok: false, error: 'مرجع التنفيذ غير صالح.' }
  const admin = await requireFreshAdminAssurance('users.manage')
  if (!admin?.userId) return { ok: false, error: FRESH_ADMIN_ASSURANCE_ERROR }
  const { data, error } = await getServiceClient().rpc('complete_customer_account_deletion', {
    p_actor_id: admin.userId,
    p_request_id: requestId,
    p_execution_reference: reference,
  })
  if (error) {
    if (error.message.includes('account_identity_still_exists')) return { ok: false, error: 'هوية Supabase ما زالت موجودة؛ لا يمكن تسجيل اكتمال وهمي.' }
    return { ok: false, error: 'تعذّر تسجيل اكتمال التنفيذ.' }
  }
  if (!data || data.status !== 'completed') return { ok: false, error: 'تعذّر تأكيد اكتمال التنفيذ.' }
  revalidatePath('/admin/users')
  return { ok: true, status: 'completed' }
}
