import type { Metadata } from 'next'
import { requirePermission } from '@/lib/auth/permissions'
import {adminPagedList,type AdminPageQuery} from '@/lib/data/admin-pagination'
import {AdminListTools} from '@/components/admin/AdminListTools'
import { AssessmentManager, type AdminAssessmentVersionRow } from '@/components/admin/AssessmentManager'

export const metadata: Metadata = { title: 'الاختبار الإرشادي — الإدارة' }

export default async function AdminAssessmentsPage({searchParams}:{searchParams:Promise<AdminPageQuery>}) {
  await requirePermission('assessments.manage', { redirectOnFailure: true })
  const query=await searchParams
  const result = await adminPagedList<AdminAssessmentVersionRow>('guided_assessment_versions', 'id, assessment_id, version, status, publish_at, published_at, content, updated_at, guided_assessments!assessment_id!inner(name, published_version_id)', query,{searchColumn:'guided_assessments.name',statuses:['draft','scheduled','published','archived'],orderBy:'updated_at'})
  return <div className="mx-auto max-w-5xl space-y-7"><header><p className="text-sm font-bold text-antique-gold">رحلة قرار غير تشخيصية</p><h1 className="mt-1 text-3xl font-bold text-deep-teal">الاختبار الإرشادي</h1><p className="mt-2 max-w-3xl leading-loose text-text-soft">إدارة الأسئلة والخيارات والنتائج والربط والإصدارات من مصدر واحد. لا تُخزن إجابات العميلة، ولا تقبل وجهات فردية أو غير منشورة؛ الوجهات محصورة في كتالوجات عامة تعرض المنشور فقط.</p></header><AdminListTools result={result} query={query} label="إصدارات الاختبار" searchLabel="بحث باسم الاختبار" statuses={[{value:"draft",label:"مسودة"},{value:"scheduled",label:"مجدول"},{value:"published",label:"منشور"},{value:"archived",label:"مؤرشف"}]}/><AssessmentManager rows={result.rows} /></div>
}
