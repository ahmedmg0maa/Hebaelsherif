import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminSettingsConsole from '@/components/admin/AdminSettingsConsole'
import type { AdminControlSection } from '@/lib/admin/controlData'

const sections = [{ title: 'معايير التحرير', description: 'Checklist جودة المحتوى.', fields: [{ key: 'contentVoiceChecklist', label: 'Voice checklist', type: 'lines', defaultValue: 'هادئ لا يضغط\nواضح لا يبالغ\nعميق لكن بسيط\nلا وعود علاجية\nدعوة فعل لطيفة', wide: true }, { key: 'courseContentChecklist', label: 'Course checklist', type: 'lines', defaultValue: 'وعد واضح\nنتائج قابلة للفهم\nفصول مرتبة\nدروس بمدة\nموارد مرتبطة\nFAQ\nSEO', wide: true }, { key: 'bookContentChecklist', label: 'Book checklist', type: 'lines', defaultValue: 'وصف عاطفي\nفهرس\nعينة قراءة\nعدد صفحات\nغلاف\nSEO', wide: true }, { key: 'articleContentChecklist', label: 'Article checklist', type: 'lines', defaultValue: 'عنوان بحثي\nمقدمة إنسانية\nعناوين واضحة\nCTA هادئ\nروابط داخلية', wide: true }] }, { title: 'سير النشر', description: 'حالات وقيود.', fields: [{ key: 'requireSeoBeforePublish', label: 'اشتراط SEO قبل النشر', type: 'toggle', defaultValue: true }, { key: 'requireImageBeforePublish', label: 'اشتراط صورة قبل النشر', type: 'toggle', defaultValue: false, wide: true }, { key: 'allowArchiveInsteadDelete', label: 'الأرشفة بدل الحذف', type: 'toggle', defaultValue: true }, { key: 'contentReviewOwner', label: 'مسؤول المراجعة', type: 'email' }] }] satisfies AdminControlSection[]

export default function AdminGeneratedPage() {
  return (
    <AdminPageShell eyebrow='تشغيل المحتوى' title='قواعد تحرير المحتوى ونشره' description="تحكمات قابلة للحفظ في Firestore حتى يمكن تعديل التجربة بدون الرجوع للكود.">
      <AdminSettingsConsole collectionName="admin_content_ops_settings" documentId="global" sections={sections} />
    </AdminPageShell>
  )
}
