import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminSettingsConsole from '@/components/admin/AdminSettingsConsole'
import type { AdminControlSection } from '@/lib/admin/controlData'

const sections = [{ title: 'رسائل تلقائية', description: 'تجهيز الرسائل بدون ربط مزود خارجي الآن.', fields: [{ key: 'sendWelcomeEmail', label: 'Welcome email', type: 'toggle', defaultValue: true }, { key: 'sendOrderEmail', label: 'Order email', type: 'toggle', defaultValue: true }, { key: 'sendBookingEmail', label: 'Booking email', type: 'toggle', defaultValue: true }, { key: 'sendReminderEmail', label: 'Session reminder', type: 'toggle', defaultValue: true }, { key: 'adminNotifyNewOrder', label: 'تنبيه الأدمن بطلب جديد', type: 'toggle', defaultValue: true, wide: true }, { key: 'adminNotifyNewBooking', label: 'تنبيه الأدمن بحجز جديد', type: 'toggle', defaultValue: true, wide: true }] }, { title: 'قوالب', description: 'نصوص قابلة للتعديل.', fields: [{ key: 'welcomeTemplate', label: 'قالب الترحيب', type: 'textarea', defaultValue: 'مرحبًا بكِ في مساحة هادئة. ابدئي من لوحة رحلتك.', wide: true }, { key: 'orderTemplate', label: 'قالب الطلب', type: 'textarea', defaultValue: 'تم استلام طلبك. سنراجع الدفع ونفتح الوصول بعد التأكيد.', wide: true }, { key: 'bookingTemplate', label: 'قالب الحجز', type: 'textarea', defaultValue: 'تم استلام طلب الحجز. ستظهر الحالة في لوحة جلساتك.', wide: true }, { key: 'whatsappFollowup', label: 'رسالة واتساب', type: 'textarea', defaultValue: 'مرحبًا، تم استلام طلبك وسنراجعه بهدوء.', wide: true }] }] satisfies AdminControlSection[]

export default function AdminGeneratedPage() {
  return (
    <AdminPageShell eyebrow='الأتمتة' title='رسائل البريد وواتساب والإشعارات' description="تحكمات قابلة للحفظ في Firestore حتى يمكن تعديل التجربة بدون الرجوع للكود.">
      <AdminSettingsConsole collectionName="admin_automation_settings" documentId="global" sections={sections} />
    </AdminPageShell>
  )
}
