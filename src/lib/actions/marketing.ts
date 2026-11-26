'use server'

import { revalidatePath } from 'next/cache'
import { getServiceClient, hasSupabaseServerSecret } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/auth/permissions'
import { hasSupabasePublicConfig } from '@/lib/supabase/public-key'
import { commerceEditorPayload, commerceMutationError } from '@/lib/admin/commerce-editor'

type ActionResult = { ok: true } | { ok: false; error: string }
async function mutate(kind: 'coupon' | 'offer', id: string | null, action: 'save' | 'active' | 'delete', input?: FormData | boolean): Promise<ActionResult> {
  if (!hasSupabasePublicConfig() || !hasSupabaseServerSecret()) return { ok: false, error: 'غير متاح في بيئة العرض التجريبية.' }
  const admin = await requirePermission('marketing.manage')
  if (!admin?.userId) return { ok: false, error: 'هذه العملية تتطلب صلاحية إدارة التسويق.' }
  const parsed = input instanceof FormData ? commerceEditorPayload(kind, input) : { ok: true as const, value: typeof input === 'boolean' ? { is_active: input } : {} }
  if (!parsed.ok) return parsed
  const { data, error } = await getServiceClient().rpc('manage_commerce_record', { p_actor_id: admin.userId, p_kind: kind, p_id: id, p_action: action, p_content: parsed.value, p_parent_id: null })
  if (error || !data?.id) return { ok: false, error: commerceMutationError(error) }
  for (const path of ['/admin/coupons', '/admin/offers', '/offers', '/']) revalidatePath(path)
  revalidatePath('/checkout', 'layout')
  return { ok: true }
}
export async function createCoupon(form: FormData) { return mutate('coupon', null, 'save', form) }
export async function updateCoupon(id: string, form: FormData) { return mutate('coupon', id, 'save', form) }
export async function setCouponActive(id: string, active: boolean) { return mutate('coupon', id, 'active', active) }
export async function deleteCoupon(id: string) { return mutate('coupon', id, 'delete') }
export async function createOffer(form: FormData) { return mutate('offer', null, 'save', form) }
export async function updateOffer(id: string, form: FormData) { return mutate('offer', id, 'save', form) }
export async function setOfferActive(id: string, active: boolean) { return mutate('offer', id, 'active', active) }
export async function deleteOffer(id: string) { return mutate('offer', id, 'delete') }
