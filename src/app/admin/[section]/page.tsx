export const dynamic = 'force-dynamic'
import { notFound } from 'next/navigation'
import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminSettingsConsole from '@/components/admin/AdminSettingsConsole'
import { ADMIN_NAV_LINKS } from '@/constants/design'
import type { AdminControlSection } from '@/lib/admin/controlData'

const customDescriptions: Record<string, string> = {
  homepage: 'تحكم في أقسام الصفحة الرئيسية والرسائل البصرية والـ CTA.',
  theme: 'إدارة ألوان البراند والـ Dark Mode واللغة البصرية.',
  'content-ops': 'تشغيل المحتوى وجدولة المقالات والكورسات والكتب.',
  'customer-journey': 'تنظيم رحلة العميلة من الاكتشاف إلى الشراء والحجز.',
  quality: 'قواعد الجودة قبل نشر المحتوى أو إطلاق الحملات.',
  automation: 'تحكمات الأتمتة والرسائل والتذكيرات المستقبلية.',
  commerce: 'إعدادات التجارة والدفع والباقات والكوبونات.',
  assessment: 'إعدادات اختبار البداية والمساعد التوجيهي.',
  'analytics-events': 'تحديد أحداث القياس والتحويلات المهمة.',
  media: 'إدارة أماكن الصور والملفات وروابط Drive.',
  navigation: 'تنظيم القوائم والروابط الأساسية.',
  seo: 'إعدادات Google وSEO وبيانات المشاركة.',
  'feature-flags': 'تفعيل أو تعطيل مميزات الإطلاق.',
  'ai-guide': 'إعدادات دليل البداية والأسئلة الجاهزة.',
  academy: 'قواعد بناء الكورسات والفصول والدروس.',
  uploads: 'إعدادات Google Drive وروابط المحتوى.',
  articles: 'إدارة المقالات والخطة التحريرية.',
  faqs: 'إدارة الأسئلة الشائعة في الصفحات العامة.',
  availability: 'إعدادات توفر الجلسات والأيام المحجوبة.',
  calendar: 'إعدادات التقويم ومزامنة المواعيد.',
  payments: 'إعدادات الدفع وإثبات الدفع والتعليمات.',
  coupons: 'إعدادات الكوبونات والخصومات.',
  pricing: 'إعدادات التسعير والباقات.',
  bundles: 'إعدادات الباقات المركبة.',
  leads: 'إدارة العملاء المحتملين ونماذج الاشتراك.',
  notifications: 'إعدادات الإشعارات والتنبيهات.',
  emails: 'قوالب البريد الإلكتروني المستقبلية.',
  integrations: 'إعدادات التكاملات الخارجية.',
  security: 'إعدادات الأمان والحماية.',
  diagnostics: 'تشخيص المنصة وفحص الجاهزية.',
  operations: 'إجراءات التشغيل اليومية.',
  backups: 'إعدادات النسخ الاحتياطي والتصدير.',
  policies: 'إعدادات السياسات التشغيلية.',
  legal: 'إعدادات الصفحات القانونية.',
  journeys: 'إدارة مسارات التعلم والتحول.',
  experiments: 'إدارة التجارب والتحسينات.',
}

function normalizeSlug(value: string) {
  return value.replace(/[^a-z0-9-]/gi, '').toLowerCase()
}

function buildSections(label: string, slug: string): AdminControlSection[] {
  return [
    {
      title: `إعدادات ${label}`,
      description: customDescriptions[slug] || 'تحكمات تشغيلية قابلة للحفظ في Firestore بدون تعديل الكود.',
      fields: [
        { key: 'enabled', label: 'تفعيل القسم', type: 'toggle', defaultValue: true },
        { key: 'title', label: 'العنوان الداخلي', type: 'text', defaultValue: label, wide: true },
        { key: 'description', label: 'الوصف', type: 'textarea', defaultValue: customDescriptions[slug] || '', wide: true },
        { key: 'priority', label: 'الأولوية', type: 'select', options: [
          { label: 'عالية', value: 'high' },
          { label: 'متوسطة', value: 'medium' },
          { label: 'منخفضة', value: 'low' },
        ], defaultValue: 'medium' },
      ],
    },
    {
      title: 'ملاحظات التشغيل',
      description: 'احتفظ بملاحظات داخلية لهذا القسم لمراجعتها قبل الإطلاق.',
      fields: [
        { key: 'checklist', label: 'Checklist', type: 'lines', defaultValue: 'مراجعة النصوص\nمراجعة التصميم على الموبايل\nمراجعة الروابط\nمراجعة الصلاحيات', wide: true },
        { key: 'internalNotes', label: 'ملاحظات داخلية', type: 'textarea', placeholder: 'اكتب أي ملاحظة تشغيلية هنا...', wide: true },
      ],
    },
  ]
}

export default function AdminDynamicSectionPage({ params }: { params: { section: string } }) {
  const section = normalizeSlug(params.section)
  const href = `/admin/${section}`
  const navItem = ADMIN_NAV_LINKS.find((item) => item.href === href)

  if (!navItem) {
    notFound()
  }

  const label = navItem.label

  return (
    <AdminPageShell
      eyebrow="مركز تشغيل V2"
      title={label}
      description={customDescriptions[section] || 'قسم إداري جاهز للتطوير والتخصيص ضمن نظام التحكم الموحد.'}
    >
      <AdminSettingsConsole
        collectionName={`admin_${section.replace(/-/g, '_')}_settings`}
        documentId="global"
        sections={buildSections(label, section)}
      />
    </AdminPageShell>
  )
}
