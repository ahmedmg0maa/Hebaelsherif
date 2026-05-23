import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminSettingsConsole from '@/components/admin/AdminSettingsConsole'
import type { AdminControlSection } from '@/lib/admin/controlData'

const sections = [
  {
    title: "عرض التقويم",
    description: "اختيارات تخص صفحة الحجوزات والتقويم.",
    fields: [
      {key: "defaultCalendarView", label: "العرض الافتراضي", type: "select", options: [{label: "قائمة",value: "list"},{label: "أسبوع",value: "week"},{label: "شهر",value: "month"}], defaultValue: "week"},
      {key: "showCancelledBookings", label: "عرض الحجوزات الملغية", type: "toggle", defaultValue: false},
      {key: "showCompletedBookings", label: "عرض الجلسات المكتملة", type: "toggle", defaultValue: true},
      {key: "calendarNotes", label: "ملاحظات داخلية", type: "textarea", wide: true}
    ],
  },
  {
    title: "روابط الاجتماعات",
    description: "قوالب لروابط Zoom/Google Meet.",
    fields: [
      {key: "defaultMeetingProvider", label: "مزود الاجتماع", type: "select", options: [{label: "Google Meet",value: "google_meet"},{label: "Zoom",value: "zoom"},{label: "يدوي",value: "manual"}], defaultValue: "manual"},
      {key: "defaultMeetingUrl", label: "رابط افتراضي", type: "url", wide: true},
      {key: "meetingInstructions", label: "تعليمات قبل الجلسة", type: "textarea", wide: true}
    ],
  }
] satisfies AdminControlSection[]

export default function AdminSettingsPage() {
  return (
    <AdminPageShell
      eyebrow="تقويم الإدارة"
      title="إعدادات التقويم"
      description="تحكم في رؤية التقويم، الروابط، وألوان الحالات."
    >
      <AdminSettingsConsole collectionName="calendar_settings" documentId="global" sections={sections} />
    </AdminPageShell>
  )
}
