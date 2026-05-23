import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminSettingsConsole from '@/components/admin/AdminSettingsConsole'
import type { AdminControlSection } from '@/lib/admin/controlData'

const sections = [
  {
    title: "Google",
    description: "تكاملات Google للنشر والملفات والقياس.",
    fields: [
      {key: "googleDriveEnabled", label: "تفعيل Google Drive في الأدمن", type: "toggle", defaultValue: true},
      {key: "googleDriveRootFolder", label: "رابط مجلد Drive الرئيسي", type: "url", wide: true},
      {key: "googleSearchConsole", label: "Search Console property", type: "text"},
      {key: "googleCalendarEnabled", label: "روابط Google Calendar للحجوزات", type: "toggle", defaultValue: true}
    ],
  },
  {
    title: "Monitoring",
    description: "تجهيزات المراقبة والأخطاء.",
    fields: [
      {key: "sentryDsn", label: "Sentry DSN", type: "password", wide: true},
      {key: "clarityProjectId", label: "Microsoft Clarity ID", type: "text"},
      {key: "vercelAnalytics", label: "Vercel Analytics", type: "toggle", defaultValue: false},
      {key: "enablePerformanceAlerts", label: "تنبيهات الأداء", type: "toggle", defaultValue: false}
    ],
  }
] satisfies AdminControlSection[]

export default function AdminGeneratedSettingsPage() {
  return (
    <AdminPageShell
      eyebrow="التكاملات"
      title="Google و Email و Analytics"
      description="تجهيز مفاتيح وروابط الخدمات الخارجية من لوحة واحدة."
    >
      <AdminSettingsConsole
        collectionName="integration_settings"
        documentId="global"
        sections={sections}
      />
    </AdminPageShell>
  )
}
