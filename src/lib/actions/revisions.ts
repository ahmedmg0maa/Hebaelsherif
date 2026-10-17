'use server'

import { revalidatePath } from 'next/cache'
import { FRESH_ADMIN_ASSURANCE_ERROR, requireFreshAdminAssurance, requirePermission } from '@/lib/auth/permissions'
import { getServiceClient } from '@/lib/supabase/server'

type Failure = { ok: false; error: string }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export async function prepareContentRevisionRestore(id: string): Promise<Failure | { ok: true; version: number; title: string }> {
  const context = await requirePermission('content.publish')
  if (!context?.userId || !uuid.test(id)) return { ok: false, error: 'تعذّر التحقق من المراجعة أو صلاحيتك.' }
  const { data, error } = await getServiceClient().rpc('admin_content_restore_context', { p_actor_id: context.userId, p_revision_id: id })
  if (error || !Number.isSafeInteger(data?.version) || data.version < 1) return { ok: false, error: 'تعذّرت قراءة النسخة الحالية. حدّثي الصفحة وحاولي مجددًا.' }
  return { ok: true, version: data.version, title: String(data.title ?? 'المحتوى') }
}

export async function restoreContentRevision(revisionId: string, expectedVersion: number): Promise<Failure | { ok: true }> {
  const context = await requireFreshAdminAssurance('content.publish')
  if (!context?.userId) return { ok: false, error: FRESH_ADMIN_ASSURANCE_ERROR }
  if (!uuid.test(revisionId) || !Number.isSafeInteger(expectedVersion) || expectedVersion < 1) return { ok: false, error: 'أعيدي فتح تأكيد الاستعادة لقراءة النسخة الحالية.' }
  const { data, error } = await getServiceClient().rpc('restore_content_revision_atomic', { p_actor_id: context.userId, p_revision_id: revisionId, p_expected_version: expectedVersion })
  if (error || !data?.id) {
    if (error?.code === '40001') return { ok: false, error: 'تغيّر المحتوى منذ فتح التأكيد. لم تُستعد النسخة؛ حدّثي الصفحة وراجعي التعديل الأحدث.' }
    if (error?.message?.includes('published_home_required_section')) return { ok: false, error: 'هذا قسم أساسي في الرئيسية المنشورة. جهّزي مسودة الرئيسية قبل استعادته حتى لا يختفي من الموقع.' }
    if (error?.code === 'P0002') return { ok: false, error: 'المحتوى الأصلي أو المراجعة غير موجودين. لم تُنشأ نسخة بديلة تلقائيًا.' }
    return { ok: false, error: 'لم تكتمل الاستعادة. تحققي من قائمة المراجعات قبل إعادة المحاولة؛ لا يُحفظ تغيير جزئي.' }
  }
  for (const path of ['/admin/revisions', '/admin/pages', '/admin/articles', '/', '/search', '/sitemap.xml']) revalidatePath(path)
  for (const slug of new Set([data.slug, data.previousSlug])) {
    if (typeof slug !== 'string' || !/^[a-z0-9-]+$/.test(slug)) continue
    revalidatePath(data.kind === 'article' ? `/articles/${slug}` : slug === 'home' ? '/' : `/${slug}`)
  }
  return { ok: true }
}
