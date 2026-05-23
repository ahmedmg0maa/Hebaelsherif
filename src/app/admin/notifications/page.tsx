import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminSettingsConsole from '@/components/admin/AdminSettingsConsole'
import type { AdminControlSection } from '@/lib/admin/controlData'

const sections = [
  {
    title: "إشعارات المستخدم",
    description: "نصوص الرسائل التي تصل أو تظهر للمستخدم.",
    fields: [
      {key: "welcomeEmailSubject", label: "عنوان بريد الترحيب", type: "text", defaultValue: "أهلًا بكِ في مساحة هبة الشريف"},
      {key: "welcomeEmailBody", label: "نص الترحيب", type: "textarea", defaultValue: "سعيدة بوجودك هنا. ابدئي بهدوء واختاري المسار الأقرب لكِ.", wide: true},
      {key: "purchaseRequestBody", label: "رسالة طلب الشراء", type: "textarea", defaultValue: "تم تسجيل طلبك. بعد مراجعة الدفع سيتم فتح المحتوى داخل حسابك.", wide: true},
      {key: "bookingRequestBody", label: "رسالة طلب الحجز", type: "textarea", defaultValue: "تم تسجيل طلب الحجز. سنراجع الموعد ونؤكد التفاصيل قريبًا.", wide: true}
    ],
  },
  {
    title: "إشعارات الإدارة",
    description: "تنبيهات الأدمن عند حدوث إجراءات مهمة.",
    fields: [
      {key: "adminEmail", label: "بريد الإدارة", type: "email"},
      {key: "notifyOnNewOrder", label: "تنبيه عند طلب شراء", type: "toggle", defaultValue: true},
      {key: "notifyOnNewBooking", label: "تنبيه عند حجز جلسة", type: "toggle", defaultValue: true},
      {key: "notifyOnPaymentSubmitted", label: "تنبيه عند إرسال بيانات الدفع", type: "toggle", defaultValue: true}
    ],
  },
  {
    title: "قنوات الإرسال",
    description: "تجهيزات التكامل مع خدمات خارجية لاحقًا.",
    fields: [
      {key: "emailProvider", label: "مزود البريد", type: "select", options: [{label: "غير مفعل",value: "none"},{label: "Resend",value: "resend"},{label: "SendGrid",value: "sendgrid"},{label: "Brevo",value: "brevo"}], defaultValue: "none"},
      {key: "enableWhatsappFollowup", label: "تفعيل متابعة واتساب", type: "toggle", defaultValue: false},
      {key: "whatsappTemplate", label: "قالب واتساب", type: "textarea", placeholder: "مرحبًا، تم تسجيل طلبك...", wide: true}
    ],
  }
] satisfies AdminControlSection[]

export default function AdminGeneratedSettingsPage() {
  return (
    <AdminPageShell
      eyebrow="الإشعارات"
      title="قوالب البريد والواتساب"
      description="تحكم في رسائل النظام للشراء والحجز والتأكيد والمتابعة."
    >
      <AdminSettingsConsole
        collectionName="notification_templates"
        documentId="default"
        sections={sections}
      />
    </AdminPageShell>
  )
}
