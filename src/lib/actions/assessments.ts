'use server'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/auth/permissions'
import { getServiceClient, hasSupabaseServerSecret } from '@/lib/supabase/server'
import { hasSupabasePublicConfig } from '@/lib/supabase/public-key'
import { normalizeGuidedAssessmentForm } from '@/lib/assessments/governance'

type Result = { ok: true; id?: string } | { ok: false; error: string }
const configured = () => hasSupabasePublicConfig() && hasSupabaseServerSecret()

export async function saveGuidedAssessmentVersion(formData: FormData): Promise<Result> {
  if (!configured()) return { ok: false, error: 'إدارة الاختبار الإرشادي غير مهيّأة في هذه البيئة.' }
  const admin = await requirePermission('assessments.manage')
  if (!admin?.userId) return { ok: false, error: 'لا تملكين صلاحية إدارة الاختبار الإرشادي.' }
  const parsed = normalizeGuidedAssessmentForm(formData)
  if (!parsed.ok) return parsed
  const value = parsed.value
  const { data, error } = await getServiceClient().rpc('save_guided_assessment_version', {
    p_assessment_id: value.assessmentId, p_version_id: value.versionId, p_actor_id: admin.userId,
    p_name: value.name, p_content: value.content, p_status: value.status, p_publish_at: value.publishAt,
  })
  if (error) {
    if (error.message.includes('assessment_version_immutable')) return { ok: false, error: 'الإصدار المنشور ثابت؛ أنشئي إصدارًا جديدًا للتعديل.' }
    if (error.message.includes('start_here_assessment_exists')) return { ok: false, error: 'يوجد اختبار «ابدئي من هنا» بالفعل؛ أعيدي تحميل الصفحة.' }
    return { ok: false, error: 'تعذّر حفظ إصدار الاختبار.' }
  }
  revalidatePath('/admin/assessments'); revalidatePath('/start-here'); revalidatePath('/')
  return { ok: true, id: String(data) }
}

export async function deleteGuidedAssessmentDraft(versionId: string): Promise<Result> {
  if (!configured()) return { ok: false, error: 'إدارة الاختبار الإرشادي غير مهيّأة في هذه البيئة.' }
  const admin = await requirePermission('assessments.manage')
  if (!admin?.userId) return { ok: false, error: 'لا تملكين صلاحية إدارة الاختبار الإرشادي.' }
  const { error } = await getServiceClient().rpc('delete_guided_assessment_draft', { p_version_id: versionId, p_actor_id: admin.userId })
  if (error) return { ok: false, error: error.message.includes('only_draft_assessment_deletable') ? 'لا يمكن حذف إصدار منشور أو مؤرشف.' : 'تعذّر حذف المسودة.' }
  revalidatePath('/admin/assessments'); revalidatePath('/start-here'); revalidatePath('/')
  return { ok: true }
}
