import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminSettingsConsole from '@/components/admin/AdminSettingsConsole'
import type { AdminControlSection } from '@/lib/admin/controlData'

const sections = [
  {
    title: "نسخ الصفحة الرئيسية",
    description: "اختبري عناوين مختلفة بدون تغيير الكود.",
    fields: [
      {key: "heroVariant", label: "نسخة الـ Hero", type: "select", options: [{label: "هادئة",value: "calm"},{label: "عميقة",value: "deep"},{label: "جلسات أولًا",value: "sessions_first"},{label: "كورسات أولًا",value: "courses_first"}], defaultValue: "calm"},
      {key: "ctaVariant", label: "نسخة CTA", type: "select", options: [{label: "ابدئي رحلتك",value: "start_journey"},{label: "اختاري المسار",value: "choose_path"},{label: "احجزي جلسة",value: "book_session"}], defaultValue: "choose_path"},
      {key: "homeExperimentNotes", label: "ملاحظات التجارب", type: "textarea", wide: true}
    ],
  },
  {
    title: "تحويلات",
    description: "أهداف يمكن قياسها لاحقًا بالتحليلات.",
    fields: [
      {key: "primaryConversion", label: "التحويل الأساسي", type: "select", options: [{label: "طلب شراء",value: "purchase"},{label: "حجز جلسة",value: "booking"},{label: "اشتراك بريد",value: "lead"}], defaultValue: "booking"},
      {key: "trackCtaClicks", label: "تتبع ضغطات CTA", type: "toggle", defaultValue: true},
      {key: "trackScrollDepth", label: "تتبع عمق التصفح", type: "toggle", defaultValue: false}
    ],
  }
] satisfies AdminControlSection[]

export default function AdminSettingsPage() {
  return (
    <AdminPageShell
      eyebrow="التجارب"
      title="A/B ونسخ تسويقية"
      description="تجهيز نسخ مختلفة للـ CTA والHero لاختبارها لاحقًا."
    >
      <AdminSettingsConsole collectionName="experiment_settings" documentId="global" sections={sections} />
    </AdminPageShell>
  )
}
