import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminSettingsConsole from '@/components/admin/AdminSettingsConsole'
import type { AdminControlSection } from '@/lib/admin/controlData'

const sections = [{ title: 'الأسئلة', description: 'كل سؤال وخياراته.', fields: [{ key: 'assessmentQuestion1', label: 'السؤال الأول', type: 'text', defaultValue: 'ما الأقرب لما تشعرين به الآن؟' }, { key: 'assessmentOptions1', label: 'خيارات السؤال الأول', type: 'lines', defaultValue: 'تشتت واحتياج لوضوح => session\nأريد مسار تعلم منظم => course\nأحتاج قراءة هادئة => book', wide: true }, { key: 'assessmentQuestion2', label: 'السؤال الثاني', type: 'text', defaultValue: 'أي إيقاع يناسبك؟' }, { key: 'assessmentOptions2', label: 'خيارات السؤال الثاني', type: 'lines', defaultValue: 'جلسة مركزة => session\nخطوات أسبوعية => course\nقراءة خاصة => book', wide: true }] }, { title: 'النتائج', description: 'نصوص الترشيح.', fields: [{ key: 'sessionResultText', label: 'نص ترشيح الجلسة', type: 'textarea', defaultValue: 'الأنسب الآن جلسة وضوح خاصة.', wide: true }, { key: 'courseResultText', label: 'نص ترشيح الكورس', type: 'textarea', defaultValue: 'الأنسب الآن كورس منظمة.', wide: true }, { key: 'bookResultText', label: 'نص ترشيح الكتاب', type: 'textarea', defaultValue: 'الأنسب الآن كتاب هادئ.', wide: true }, { key: 'saveAssessmentLead', label: 'حفظ نتيجة الاختبار كـ Lead', type: 'toggle', defaultValue: true, wide: true }] }] satisfies AdminControlSection[]

export default function AdminGeneratedPage() {
  return (
    <AdminPageShell eyebrow='اختبار البداية' title='أسئلة وتوصيات الاختبار الهادئ' description="تحكمات قابلة للحفظ في Firestore حتى يمكن تعديل التجربة بدون الرجوع للكود.">
      <AdminSettingsConsole collectionName="admin_assessment_settings" documentId="global" sections={sections} />
    </AdminPageShell>
  )
}
