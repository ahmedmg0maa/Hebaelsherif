import type { Metadata } from 'next'
import { requirePermission } from '@/lib/auth/permissions'
import { adminList } from '@/lib/data/cms'
import { AssessmentManager, type AdminAssessmentVersionRow } from '@/components/admin/AssessmentManager'

export const metadata: Metadata = { title: 'الاختبار الإرشادي — الإدارة' }

export default async function AdminAssessmentsPage() {
  await requirePermission('assessments.manage', { redirectOnFailure: true })
  const rows = await adminList<AdminAssessmentVersionRow>('guided_assessment_versions', 'id, assessment_id, version, status, publish_at, published_at, content, updated_at, guided_assessments!inner(name, published_version_id)', { orderBy: 'version' })
  return <div className="mx-auto max-w-5xl space-y-7"><header><p className="text-sm font-bold text-antique-gold">رحلة قرار غير تشخيصية</p><h1 className="mt-1 text-3xl font-bold text-deep-teal">الاختبار الإرشادي</h1><p className="mt-2 max-w-3xl leading-loose text-text-soft">إدارة الأسئلة والخيارات والنتائج والربط والإصدارات من مصدر واحد. لا تُخزن إجابات العميلة، ولا تقبل وجهات فردية أو غير منشورة؛ الوجهات محصورة في كتالوجات عامة تعرض المنشور فقط.</p></header><AssessmentManager rows={rows} /></div>
}
