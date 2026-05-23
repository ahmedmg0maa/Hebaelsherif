import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminSettingsConsole from '@/components/admin/AdminSettingsConsole'
import type { AdminControlSection } from '@/lib/admin/controlData'

const sections = [
  {
    title: "Firebase و App Check",
    description: "تجهيز الحماية من إساءة استخدام موارد Firebase والـ APIs.",
    fields: [
      {key: "enableAppCheck", label: "تفعيل App Check", type: "toggle", defaultValue: false},
      {key: "appCheckProvider", label: "مزود App Check", type: "select", options: [{label: "غير مفعل",value: "none"},{label: "reCAPTCHA Enterprise",value: "recaptcha_enterprise"},{label: "reCAPTCHA v3",value: "recaptcha_v3"}], defaultValue: "none"},
      {key: "appCheckSiteKey", label: "App Check Site Key", type: "password", wide: true},
      {key: "securityContactEmail", label: "بريد الأمان", type: "email"}
    ],
  },
  {
    title: "حدود الطلبات",
    description: "قيم جاهزة لاستخدامها في rate limiting لاحقًا.",
    fields: [
      {key: "bookingRequestsPerHour", label: "حجوزات لكل ساعة", type: "number", defaultValue: 5},
      {key: "ordersPerHour", label: "طلبات شراء لكل ساعة", type: "number", defaultValue: 10},
      {key: "aiGuideRequestsPerHour", label: "طلبات AI Guide لكل ساعة", type: "number", defaultValue: 30},
      {key: "blockSuspiciousClients", label: "حظر السلوك المشبوه", type: "toggle", defaultValue: true}
    ],
  },
  {
    title: "سجل الإدارة",
    description: "إعدادات audit logs.",
    fields: [
      {key: "enableAuditLogs", label: "تفعيل سجل الإدارة", type: "toggle", defaultValue: true},
      {key: "logSensitiveActions", label: "تسجيل الإجراءات الحساسة", type: "toggle", defaultValue: true},
      {key: "logRetentionDays", label: "مدة الاحتفاظ بالسجل", type: "number", defaultValue: 365}
    ],
  }
] satisfies AdminControlSection[]

export default function AdminSettingsPage() {
  return (
    <AdminPageShell
      eyebrow="الأمان"
      title="إعدادات الأمان والحماية"
      description="مركز تحكم لتجهيز App Check، حدود الطلبات، رسائل الأمان، وسجل الإجراءات."
    >
      <AdminSettingsConsole collectionName="security_settings" documentId="global" sections={sections} />
    </AdminPageShell>
  )
}
