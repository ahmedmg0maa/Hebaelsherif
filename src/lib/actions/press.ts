'use server'

import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/auth/permissions'
import { getServiceClient, hasSupabaseServerSecret } from '@/lib/supabase/server'
import { hasSupabasePublicConfig } from '@/lib/supabase/public-key'
import { normalizePressInput } from '@/lib/press/governance'

type Result = { ok: true; id?: string } | { ok: false; error: string }

function configured() {
  return hasSupabasePublicConfig() && hasSupabaseServerSecret()
}

export async function savePressMention(formData: FormData): Promise<Result> {
  if (!configured()) return { ok: false, error: 'إدارة الظهور الإعلامي غير مهيّأة في هذه البيئة.' }
  const admin = await requirePermission('press.manage')
  if (!admin?.userId) return { ok: false, error: 'لا تملكين صلاحية إدارة الظهور الإعلامي.' }
  const normalized = normalizePressInput(formData)
  if (!normalized.ok) return { ok: false, error: normalized.error }
  const value = normalized.value
  const { data, error } = await getServiceClient().rpc('save_press_mention', {
    p_id: value.id,
    p_actor_id: admin.userId,
    p_outlet: value.outlet,
    p_title: value.title,
    p_kind: value.kind,
    p_source_classification: value.sourceClassification,
    p_original_url: value.originalUrl,
    p_published_on: value.publishedOn,
    p_excerpt: value.excerpt,
    p_image_media_id: value.imageMediaId,
    p_status: value.status,
    p_publish_at: value.publishAt,
    p_is_featured: value.isFeatured,
    p_sort: value.sort,
  })
  if (error) {
    if (error.message.includes('press_image_rights_required')) return { ok: false, error: 'صورة الظهور ليست عامة أو لا تحمل إثبات حقوق صالحًا.' }
    if (error.message.includes('invalid_press_classification')) return { ok: false, error: 'تصنيف المصدر لا يطابق نوع الظهور.' }
    return { ok: false, error: 'تعذّر حفظ الظهور الإعلامي.' }
  }
  for (const path of ['/admin/press', '/press', '/']) revalidatePath(path)
  return { ok: true, id: String(data) }
}

export async function deletePressMention(id: string): Promise<Result> {
  if (!configured()) return { ok: false, error: 'إدارة الظهور الإعلامي غير مهيّأة في هذه البيئة.' }
  const admin = await requirePermission('press.manage')
  if (!admin?.userId) return { ok: false, error: 'لا تملكين صلاحية إدارة الظهور الإعلامي.' }
  const { error } = await getServiceClient().rpc('delete_press_mention', { p_id: id, p_actor_id: admin.userId })
  if (error) return { ok: false, error: error.message.includes('archive_press_before_delete') ? 'أرشفي السجل المنشور أو المجدول قبل حذفه.' : 'تعذّر حذف السجل.' }
  for (const path of ['/admin/press', '/press', '/']) revalidatePath(path)
  return { ok: true }
}
