import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminSettingsConsole from '@/components/admin/AdminSettingsConsole'
import type { AdminControlSection } from '@/lib/admin/controlData'

const sections = [
  {
    title: "وضع الصيانة",
    description: "تحكم في رسائل الصيانة بدون تعطيل المشروع.",
    fields: [
      {key: "maintenanceMode", label: "وضع الصيانة", type: "toggle", defaultValue: false},
      {key: "maintenanceMessage", label: "رسالة الصيانة", type: "textarea", defaultValue: "نقوم بتحسين التجربة الآن. سنعود خلال وقت قصير.", wide: true},
      {key: "supportEmail", label: "بريد الدعم", type: "email"},
      {key: "supportWhatsapp", label: "واتساب الدعم", type: "text"}
    ],
  },
  {
    title: "النسخ الاحتياطي",
    description: "تعليمات وقيم تشغيلية للنسخ والتصدير.",
    fields: [
      {key: "backupFrequency", label: "تكرار النسخ الاحتياطي", type: "select", options: [{label: "يومي",value: "daily"},{label: "أسبوعي",value: "weekly"},{label: "شهري",value: "monthly"}], defaultValue: "weekly"},
      {key: "backupOwner", label: "مسؤول النسخ", type: "email"},
      {key: "exportCollections", label: "Collections للتصدير", type: "lines", defaultValue: "users\norders\nbookings\ncourses\nbooks\nprotected_content", wide: true}
    ],
  }
] satisfies AdminControlSection[]

export default function AdminSettingsPage() {
  return (
    <AdminPageShell
      eyebrow="التشغيل"
      title="إعدادات التشغيل والجودة"
      description="إعدادات تساعد على إدارة المشروع بعد الإطلاق: النسخ الاحتياطي، الصيانة، وملاحظات التشغيل."
    >
      <AdminSettingsConsole collectionName="operations_settings" documentId="global" sections={sections} />
    </AdminPageShell>
  )
}
