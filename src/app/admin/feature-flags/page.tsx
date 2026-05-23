import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminSettingsConsole from '@/components/admin/AdminSettingsConsole'
import type { AdminControlSection } from '@/lib/admin/controlData'

const sections = [
  {
    title: "مميزات عامة",
    description: "فعلي أو أخفي المميزات حسب جاهزية البراند.",
    fields: [
      {key: "enableDarkMode", label: "Dark Mode", type: "toggle", defaultValue: true},
      {key: "enableAiGuide", label: "AI Guide", type: "toggle", defaultValue: true},
      {key: "enableArticles", label: "المقالات", type: "toggle", defaultValue: true},
      {key: "enableReviews", label: "التقييمات", type: "toggle", defaultValue: true},
      {key: "enableLeadMagnet", label: "Lead Magnet", type: "toggle", defaultValue: true},
      {key: "enableCoupons", label: "الكوبونات", type: "toggle", defaultValue: true}
    ],
  },
  {
    title: "مميزات مستقبلية",
    description: "جاهزة للتفعيل عند ربط الخدمات الخارجية.",
    fields: [
      {key: "enableOnlinePayments", label: "دفع إلكتروني كامل", type: "toggle", defaultValue: false},
      {key: "enableCertificates", label: "الشهادات", type: "toggle", defaultValue: false},
      {key: "enableCommunity", label: "مجتمع خاص", type: "toggle", defaultValue: false},
      {key: "enableLivePrograms", label: "برامج مباشرة", type: "toggle", defaultValue: false}
    ],
  }
] satisfies AdminControlSection[]

export default function AdminGeneratedSettingsPage() {
  return (
    <AdminPageShell
      eyebrow="المميزات"
      title="تشغيل وإيقاف المميزات"
      description="تحكم سريع في ظهور الأقسام والمميزات التجريبية دون نشر كود جديد."
    >
      <AdminSettingsConsole
        collectionName="feature_flags"
        documentId="global"
        sections={sections}
      />
    </AdminPageShell>
  )
}
