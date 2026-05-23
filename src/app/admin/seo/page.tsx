import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminSettingsConsole from '@/components/admin/AdminSettingsConsole'
import type { AdminControlSection } from '@/lib/admin/controlData'

const sections = [
  {
    title: "بيانات عامة",
    description: "العنوان والوصف الافتراضيان لكل الموقع.",
    fields: [
      {key: "defaultTitle", label: "العنوان الافتراضي", type: "text", defaultValue: "هبة الشريف — منصة التحول العاطفي", wide: true},
      {key: "defaultDescription", label: "الوصف الافتراضي", type: "textarea", defaultValue: "منصة عربية فاخرة للتعلم العاطفي، الكتب، والجلسات الفردية.", wide: true},
      {key: "canonicalUrl", label: "رابط الموقع الأساسي", type: "url", placeholder: "https://hebaelsherif.com"},
      {key: "defaultOgImage", label: "صورة المشاركة الافتراضية", type: "url", placeholder: "https://...", wide: true}
    ],
  },
  {
    title: "Google و Analytics",
    description: "حقول جاهزة للنشر والقياس.",
    fields: [
      {key: "googleSiteVerification", label: "Google site verification", type: "text"},
      {key: "ga4MeasurementId", label: "GA4 Measurement ID", type: "text", placeholder: "G-XXXXXXXX"},
      {key: "googleTagManagerId", label: "Google Tag Manager ID", type: "text", placeholder: "GTM-XXXXXXX"},
      {key: "enableStructuredData", label: "تفعيل Structured Data", type: "toggle", defaultValue: true},
      {key: "enableArticleSeo", label: "تفعيل SEO للمقالات", type: "toggle", defaultValue: true}
    ],
  },
  {
    title: "Social previews",
    description: "روابط وصور المشاركة.",
    fields: [
      {key: "instagramUrl", label: "Instagram", type: "url"},
      {key: "facebookUrl", label: "Facebook", type: "url"},
      {key: "youtubeUrl", label: "YouTube", type: "url"},
      {key: "whatsappNumber", label: "WhatsApp", type: "text"}
    ],
  }
] satisfies AdminControlSection[]

export default function AdminGeneratedSettingsPage() {
  return (
    <AdminPageShell
      eyebrow="SEO و Google"
      title="إعدادات الظهور والبحث"
      description="تحكم في إعدادات Google، الروابط الاجتماعية، صور المشاركة، والبيانات الوصفية العامة."
    >
      <AdminSettingsConsole
        collectionName="seo_settings"
        documentId="global"
        sections={sections}
      />
    </AdminPageShell>
  )
}
