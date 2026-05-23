import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminSettingsConsole from '@/components/admin/AdminSettingsConsole'
import type { AdminControlSection } from '@/lib/admin/controlData'

const sections = [{ title: 'Hero المتقدم', description: 'تحكم في كل طبقة من Hero.', fields: [{ key: 'heroLayout', label: 'شكل Hero', type: 'select', options: [{label: 'سينمائي', value: 'cinematic'},{label: 'مجلة فاخرة', value: 'editorial'},{label: 'جلسات أولًا', value: 'sessions'}], defaultValue: 'cinematic' }, { key: 'heroVisualMood', label: 'مزاج الصورة', type: 'select', options: [{label: 'ضوء طبيعي', value: 'natural'},{label: 'جورنال فاخر', value: 'journal'},{label: 'هدوء عميق', value: 'deep'}], defaultValue: 'natural' }, { key: 'heroTrustBadges', label: 'شارات الثقة', type: 'lines', defaultValue: 'محتوى محمي\nحجز واضح\nجلسات خاصة\nتجربة عربية', wide: true }, { key: 'heroShowAssessment', label: 'إظهار اختبار البداية', type: 'toggle', defaultValue: true }, { key: 'heroStickyCta', label: 'CTA ثابت على الموبايل', type: 'toggle', defaultValue: true, wide: true }] }, { title: 'أقسام الواجهة', description: 'تشغيل وإيقاف الأقسام.', fields: [{ key: 'showPainSection', label: 'قسم هل تشعرين', type: 'toggle', defaultValue: true }, { key: 'showTransformation', label: 'قسم التحول', type: 'toggle', defaultValue: true }, { key: 'showPrograms', label: 'قسم المسارات', type: 'toggle', defaultValue: true }, { key: 'showTrustSafety', label: 'قسم الثقة', type: 'toggle', defaultValue: true }, { key: 'showFinalCTA', label: 'CTA النهائي', type: 'toggle', defaultValue: true }] }] satisfies AdminControlSection[]

export default function AdminGeneratedPage() {
  return (
    <AdminPageShell eyebrow='الرئيسية' title='تحكم تفصيلي في الصفحة الرئيسية' description="تحكمات قابلة للحفظ في Firestore حتى يمكن تعديل التجربة بدون الرجوع للكود.">
      <AdminSettingsConsole collectionName="admin_homepage_settings" documentId="global" sections={sections} />
    </AdminPageShell>
  )
}
