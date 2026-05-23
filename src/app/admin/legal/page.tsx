import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminSettingsConsole from '@/components/admin/AdminSettingsConsole'
import type { AdminControlSection } from '@/lib/admin/controlData'

const sections = [
  {
    title: "بنود الثقة",
    description: "نصوص تظهر في الشراء والحجز.",
    fields: [
      {key: "checkoutTrustText", label: "نص الثقة في الدفع", type: "textarea", wide: true},
      {key: "bookingConsentText", label: "موافقة الحجز", type: "textarea", wide: true},
      {key: "dataDeletionText", label: "طلب حذف البيانات", type: "textarea", wide: true},
      {key: "therapyDisclaimer", label: "تنبيه عدم العلاج", type: "textarea", defaultValue: "الخدمات للتوجيه والنمو الشخصي وليست بديلًا عن العلاج النفسي أو الاستشارة الطبية.", wide: true}
    ],
  }
] satisfies AdminControlSection[]

export default function AdminSettingsPage() {
  return (
    <AdminPageShell
      eyebrow="قانوني متقدم"
      title="إدارة بنود قانونية متقدمة"
      description="نصوص مساعدة للسياسات والتنبيهات والتعامل مع البيانات."
    >
      <AdminSettingsConsole collectionName="legal_settings" documentId="advanced" sections={sections} />
    </AdminPageShell>
  )
}
