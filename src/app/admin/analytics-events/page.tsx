import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminSettingsConsole from '@/components/admin/AdminSettingsConsole'
import type { AdminControlSection } from '@/lib/admin/controlData'

const sections = [{ title: 'الأحداث الأساسية', description: 'تستخدم لاحقًا مع GA4/Clarity/PostHog.', fields: [{ key: 'trackViewCourse', label: 'view_course', type: 'toggle', defaultValue: true }, { key: 'trackStartPurchase', label: 'start_purchase', type: 'toggle', defaultValue: true }, { key: 'trackSubmitPayment', label: 'submit_payment', type: 'toggle', defaultValue: true }, { key: 'trackBookingStep', label: 'booking_step_completed', type: 'toggle', defaultValue: true, wide: true }, { key: 'trackLead', label: 'lead_submit', type: 'toggle', defaultValue: true }, { key: 'trackProtectedContent', label: 'view_protected_content', type: 'toggle', defaultValue: true, wide: true }] }, { title: 'إعدادات التحليلات', description: 'مفاتيح وأهداف.', fields: [{ key: 'gaMeasurementId', label: 'GA4 ID', type: 'text' }, { key: 'clarityProjectId', label: 'Clarity ID', type: 'text' }, { key: 'primaryGoal', label: 'الهدف الأساسي', type: 'select', options: [{label: 'حجز', value: 'booking'},{label: 'شراء', value: 'purchase'},{label: 'Lead', value: 'lead'}], defaultValue: 'booking' }, { key: 'conversionNotes', label: 'ملاحظات القياس', type: 'textarea', defaultValue: 'تتم مراجعة الأحداث بعد أول أسبوع من الإطلاق.', wide: true }] }] satisfies AdminControlSection[]

export default function AdminGeneratedPage() {
  return (
    <AdminPageShell eyebrow='أحداث القياس' title='تجهيز أسماء الأحداث للتحليلات' description="تحكمات قابلة للحفظ في Firestore حتى يمكن تعديل التجربة بدون الرجوع للكود.">
      <AdminSettingsConsole collectionName="admin_analytics_events_settings" documentId="global" sections={sections} />
    </AdminPageShell>
  )
}
