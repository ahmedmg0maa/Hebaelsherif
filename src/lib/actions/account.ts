'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { getServerClient, getServiceClient, hasSupabaseServerSecret } from '@/lib/supabase/server'
import { hasSupabasePublicConfig } from '@/lib/supabase/public-key'
import { validateNewPassword } from '@/lib/auth/password-policy'

type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string }

const NO_ENV = 'غير متاح في بيئة العرض التجريبية.'

const hasGovernedMutationEnv = () => hasSupabasePublicConfig() && hasSupabaseServerSecret()

const controlCharacters = /[\u0000-\u001f\u007f]/
const phonePattern = /^\+?[0-9][0-9 ()-]{5,28}[0-9]$/

type PasswordFlow = 'password_change_current' | 'password_change_recovery'

async function beginPasswordOperation(userId: string, requestId: string, flow: PasswordFlow) {
  const { error } = await getServiceClient().rpc('begin_customer_password_operation', {
    p_actor_id: userId,
    p_request_id: requestId,
    p_kind: flow,
  })
  return error
}

async function finalizePasswordOperation(userId: string, requestId: string, status: 'succeeded' | 'failed') {
  const { error } = await getServiceClient().rpc('finalize_customer_password_operation', {
    p_actor_id: userId,
    p_request_id: requestId,
    p_status: status,
  })
  return !error
}

async function closePasswordSessions(supabase: Awaited<ReturnType<typeof getServerClient>>) {
  const { error } = await supabase.auth.signOut({ scope: 'global' })
  if (error) await supabase.auth.signOut({ scope: 'local' })
}

export async function updateProfile(formData: FormData): Promise<ActionResult> {
  if (!hasGovernedMutationEnv()) return { ok: false, error: NO_ENV }
  const supabase = await getServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'سجّلي دخولك أولًا.' }

  const rawFullName = String(formData.get('full_name') ?? '')
  const fullName = rawFullName.trim().replace(/\s+/g, ' ')
  const rawPhone = String(formData.get('phone') ?? '').trim()
  const phone = rawPhone || null
  if (fullName.length < 2 || fullName.length > 120 || controlCharacters.test(rawFullName)) {
    return { ok: false, error: 'الاسم يجب أن يكون بين حرفين و١٢٠ حرفًا.' }
  }
  if (phone && (!phonePattern.test(phone) || controlCharacters.test(phone))) {
    return { ok: false, error: 'أدخلي رقم هاتف صحيحًا من ٧ إلى ٣٠ رمزًا.' }
  }

  const { data, error } = await getServiceClient().rpc('update_customer_profile', {
    p_actor_id: user.id,
    p_full_name: fullName,
    p_phone: phone,
  })
  if (error) return { ok: false, error: 'تعذّر الحفظ — حاولي مرة أخرى.' }
  revalidatePath('/dashboard/profile')
  revalidatePath('/dashboard')
  if (!data?.outcome) return { ok: false, error: 'تعذّر تأكيد حفظ البيانات.' }
  return { ok: true, data: null }
}

export async function markNotificationsRead(): Promise<ActionResult<{ count: number }>> {
  if (!hasGovernedMutationEnv()) return { ok: false, error: NO_ENV }
  const supabase = await getServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'سجّلي دخولك أولًا.' }

  const { data, error } = await getServiceClient().rpc('mark_customer_notifications_read', {
    p_actor_id: user.id,
  })
  if (error) return { ok: false, error: 'تعذّر التحديث.' }
  revalidatePath('/dashboard/notifications')
  revalidatePath('/dashboard')
  return { ok: true, data: { count: Number(data?.count ?? 0) } }
}

export async function changePassword(formData: FormData): Promise<ActionResult<{ auditConfirmed: boolean }>> {
  if (!hasGovernedMutationEnv()) return { ok: false, error: NO_ENV }
  const supabase = await getServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'سجّلي دخولك أولًا.' }

  const currentPassword = String(formData.get('current_password') ?? '')
  const password = String(formData.get('password') ?? '')
  const confirmation = String(formData.get('password_confirmation') ?? '')
  if (!currentPassword) return { ok: false, error: 'أدخلي كلمة المرور الحالية.' }
  const validationError = validateNewPassword(password, confirmation, currentPassword)
  if (validationError) return { ok: false, error: validationError }

  const requestId = randomUUID()
  const beginError = await beginPasswordOperation(user.id, requestId, 'password_change_current')
  if (beginError) {
    return { ok: false, error: beginError.message.includes('rate_limited') ? 'تجاوزتِ عدد المحاولات الآمن. حاولي بعد ساعة.' : 'تعذّر بدء العملية بأمان.' }
  }

  const { error } = await supabase.auth.updateUser({ password, current_password: currentPassword })
  if (error) {
    await finalizePasswordOperation(user.id, requestId, 'failed')
    return { ok: false, error: 'تعذّر التغيير. تحققي من كلمة المرور الحالية ومتطلبات الكلمة الجديدة.' }
  }
  const auditConfirmed = await finalizePasswordOperation(user.id, requestId, 'succeeded')
  await closePasswordSessions(supabase)
  return { ok: true, data: { auditConfirmed } }
}

export async function completeRecoveredPassword(formData: FormData): Promise<ActionResult<{ auditConfirmed: boolean }>> {
  if (!hasGovernedMutationEnv()) return { ok: false, error: NO_ENV }
  const supabase = await getServerClient()
  const [{ data: userData }, { data: claimsData, error: claimsError }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getClaims(),
  ])
  const user = userData.user
  const claims = claimsData?.claims as { amr?: Array<{ method?: unknown }> } | undefined
  const recoverySession = claims?.amr?.some((entry) => entry.method === 'recovery') === true
  if (!user || claimsError || !recoverySession) {
    return { ok: false, error: 'رابط الاستعادة غير صالح أو انتهت صلاحيته. اطلبي رابطًا جديدًا.' }
  }

  const password = String(formData.get('password') ?? '')
  const confirmation = String(formData.get('password_confirmation') ?? '')
  const validationError = validateNewPassword(password, confirmation)
  if (validationError) return { ok: false, error: validationError }

  const requestId = randomUUID()
  const beginError = await beginPasswordOperation(user.id, requestId, 'password_change_recovery')
  if (beginError) {
    return { ok: false, error: beginError.message.includes('rate_limited') ? 'تجاوزتِ عدد المحاولات الآمن. اطلبي رابطًا جديدًا لاحقًا.' : 'تعذّر بدء العملية بأمان.' }
  }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    await finalizePasswordOperation(user.id, requestId, 'failed')
    return { ok: false, error: 'تعذّر حفظ كلمة المرور. اطلبي رابط استعادة جديدًا وحاولي مرة أخرى.' }
  }
  const auditConfirmed = await finalizePasswordOperation(user.id, requestId, 'succeeded')
  await closePasswordSessions(supabase)
  return { ok: true, data: { auditConfirmed } }
}
