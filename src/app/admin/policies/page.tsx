import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminSettingsConsole from '@/components/admin/AdminSettingsConsole'
import type { AdminControlSection } from '@/lib/admin/controlData'

const sections = [
  {
    title: "السياسات الأساسية",
    description: "النصوص المختصرة التي تظهر في الصفحات القانونية أو عند الشراء.",
    fields: [
      {key: "privacySummary", label: "ملخص الخصوصية", type: "textarea", wide: true},
      {key: "termsSummary", label: "ملخص الشروط", type: "textarea", wide: true},
      {key: "refundSummary", label: "ملخص الاسترجاع", type: "textarea", wide: true},
      {key: "sessionPolicySummary", label: "سياسة الجلسات", type: "textarea", wide: true},
      {key: "disclaimer", label: "تنبيه مهني", type: "textarea", defaultValue: "المحتوى والجلسات للتوجيه والنمو الشخصي ولا تُعد علاجًا نفسيًا أو تشخيصًا طبيًا.", wide: true}
    ],
  }
] satisfies AdminControlSection[]

export default function AdminGeneratedSettingsPage() {
  return (
    <AdminPageShell
      eyebrow="السياسات"
      title="النصوص القانونية والتشغيلية"
      description="تحكم في النصوص المهمة للخصوصية، الجلسات، الاسترجاع، والتنبيه المهني."
    >
      <AdminSettingsConsole
        collectionName="policy_settings"
        documentId="global"
        sections={sections}
      />
    </AdminPageShell>
  )
}
