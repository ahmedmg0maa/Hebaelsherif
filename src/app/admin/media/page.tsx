import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminSettingsConsole from '@/components/admin/AdminSettingsConsole'
import type { AdminControlSection } from '@/lib/admin/controlData'

const sections = [
  {
    title: "صور البراند",
    description: "صور أساسية لكل صفحات الموقع.",
    fields: [
      {key: "homeHero", label: "صورة Hero الرئيسية", type: "url", wide: true},
      {key: "aboutPortrait", label: "صورة هبة في صفحة About", type: "url", wide: true},
      {key: "sessionVisual", label: "صورة الجلسات", type: "url", wide: true},
      {key: "journalVisual", label: "صورة journal / calm space", type: "url", wide: true}
    ],
  },
  {
    title: "صور المنتجات",
    description: "صور افتراضية عند عدم وجود غلاف للمنتج.",
    fields: [
      {key: "coursePlaceholder", label: "صورة افتراضية للكورس", type: "url", wide: true},
      {key: "bookPlaceholder", label: "صورة افتراضية للكتاب", type: "url", wide: true},
      {key: "testimonialAvatar", label: "Avatar افتراضي للتقييمات", type: "url", wide: true},
      {key: "ogFallback", label: "OpenGraph fallback", type: "url", wide: true}
    ],
  },
  {
    title: "اتجاه الصور",
    description: "ملاحظات داخلية تساعد أي مصمم أو مصور.",
    fields: [
      {key: "imageryGuidelines", label: "إرشادات الصور", type: "textarea", defaultValue: "إضاءة طبيعية ناعمة، تكوين سينمائي هادئ، ألوان دافئة محايدة، بدون طاقة stock photo.", wide: true}
    ],
  }
] satisfies AdminControlSection[]

export default function AdminGeneratedSettingsPage() {
  return (
    <AdminPageShell
      eyebrow="مكتبة الصور"
      title="أماكن الصور والفيديوهات"
      description="جهزي كل أماكن الصور الآن وأضيفي الروابط لاحقًا بدون تغيير الكود."
    >
      <AdminSettingsConsole
        collectionName="media_settings"
        documentId="slots"
        sections={sections}
      />
    </AdminPageShell>
  )
}
