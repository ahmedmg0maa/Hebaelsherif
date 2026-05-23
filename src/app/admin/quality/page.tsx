import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminSettingsConsole from '@/components/admin/AdminSettingsConsole'
import type { AdminControlSection } from '@/lib/admin/controlData'

const sections = [{ title: 'أهداف القياس', description: 'أهداف قابلة للمراجعة.', fields: [{ key: 'targetLighthousePerformance', label: 'Performance target', type: 'number', defaultValue: 90 }, { key: 'targetAccessibility', label: 'Accessibility target', type: 'number', defaultValue: 95 }, { key: 'targetSeo', label: 'SEO target', type: 'number', defaultValue: 95 }, { key: 'targetBestPractices', label: 'Best practices target', type: 'number', defaultValue: 95, wide: true }, { key: 'targetLcp', label: 'LCP هدف بالثواني', type: 'number', defaultValue: 2.5 }, { key: 'targetInp', label: 'INP هدف بالمللي ثانية', type: 'number', defaultValue: 200, wide: true }, { key: 'targetCls', label: 'CLS هدف', type: 'number', defaultValue: 0.1 }] }, { title: 'اختبار الاستخدام', description: 'سيناريوهات اختبار.', fields: [{ key: 'mobileTestChecklist', label: 'Mobile checklist', type: 'lines', defaultValue: 'تسجيل حساب\nطلب شراء\nحجز جلسة\nفتح درس\nقراءة كتاب\nتغيير الوضع الداكن', wide: true }, { key: 'launchChecklist', label: 'Launch checklist', type: 'lines', defaultValue: 'type-check\nbuild\nFirebase rules\nAdmin user\nDomain\nAnalytics\nSearch Console', wide: true }] }] satisfies AdminControlSection[]

export default function AdminGeneratedPage() {
  return (
    <AdminPageShell eyebrow='الجودة' title='مؤشرات جودة قبل الإطلاق وبعده' description="تحكمات قابلة للحفظ في Firestore حتى يمكن تعديل التجربة بدون الرجوع للكود.">
      <AdminSettingsConsole collectionName="admin_quality_settings" documentId="global" sections={sections} />
    </AdminPageShell>
  )
}
