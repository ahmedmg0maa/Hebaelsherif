import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminSettingsConsole from '@/components/admin/AdminSettingsConsole'
import type { AdminControlSection } from '@/lib/admin/controlData'

const sections = [
  {
    title: "خطة النسخ",
    description: "إعدادات داخلية للتوثيق والتنفيذ.",
    fields: [
      {key: "backupEnabled", label: "النسخ مفعل", type: "toggle", defaultValue: true},
      {key: "backupFrequency", label: "التكرار", type: "select", options: [{label: "يومي",value: "daily"},{label: "أسبوعي",value: "weekly"},{label: "شهري",value: "monthly"}], defaultValue: "weekly"},
      {key: "backupLocation", label: "مكان النسخ", type: "text", placeholder: "Google Drive / Cloud Storage"},
      {key: "restoreOwner", label: "مسؤول الاسترجاع", type: "email"}
    ],
  },
  {
    title: "اختبار الاسترجاع",
    description: "تسجيل آخر اختبار استرجاع.",
    fields: [
      {key: "lastRestoreTest", label: "آخر اختبار استرجاع", type: "text", placeholder: "2026-05-23"},
      {key: "restoreNotes", label: "ملاحظات", type: "textarea", wide: true}
    ],
  }
] satisfies AdminControlSection[]

export default function AdminSettingsPage() {
  return (
    <AdminPageShell
      eyebrow="النسخ الاحتياطي"
      title="خطة النسخ والاسترجاع"
      description="وثيقة تشغيلية داخل لوحة الإدارة لحماية البيانات."
    >
      <AdminSettingsConsole collectionName="backup_settings" documentId="global" sections={sections} />
    </AdminPageShell>
  )
}
