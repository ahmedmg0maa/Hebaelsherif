import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminSettingsConsole from '@/components/admin/AdminSettingsConsole'
import type { AdminControlSection } from '@/lib/admin/controlData'

const sections = [
  {
    title: "النشرة البريدية",
    description: "إعدادات جمع البريد والرسائل اللطيفة.",
    fields: [
      {key: "newsletterEnabled", label: "تفعيل النشرة", type: "toggle", defaultValue: true},
      {key: "newsletterTitle", label: "عنوان الاشتراك", type: "text", defaultValue: "رسالة هادئة إلى بريدك"},
      {key: "newsletterDescription", label: "وصف الاشتراك", type: "textarea", defaultValue: "تأملات قصيرة وأسئلة عميقة تساعدك على العودة لنفسك.", wide: true},
      {key: "leadMagnetTitle", label: "عنوان الهدية المجانية", type: "text", defaultValue: "دليل البداية الهادئة"},
      {key: "leadMagnetUrl", label: "رابط الهدية", type: "url", wide: true}
    ],
  },
  {
    title: "تذكيرات الجلسات",
    description: "رسائل قبل وبعد الجلسة.",
    fields: [
      {key: "sessionReminder24h", label: "تذكير قبل 24 ساعة", type: "textarea", wide: true},
      {key: "sessionReminder2h", label: "تذكير قبل ساعتين", type: "textarea", wide: true},
      {key: "postSessionFollowup", label: "متابعة بعد الجلسة", type: "textarea", wide: true}
    ],
  }
] satisfies AdminControlSection[]

export default function AdminSettingsPage() {
  return (
    <AdminPageShell
      eyebrow="البريد"
      title="إعدادات البريد التسويقي والتشغيلي"
      description="تجهيز حملات البريد والنشرات والتذكيرات."
    >
      <AdminSettingsConsole collectionName="email_settings" documentId="global" sections={sections} />
    </AdminPageShell>
  )
}
