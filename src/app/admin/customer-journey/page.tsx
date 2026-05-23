import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminSettingsConsole from '@/components/admin/AdminSettingsConsole'
import type { AdminControlSection } from '@/lib/admin/controlData'

const sections = [{ title: 'مراحل الرحلة', description: 'اكتبي خطوات الرحلة كما تريدين ظهورها أو استخدامها داخليًا.', fields: [{ key: 'visitorJourney', label: 'رحلة الزائرة', type: 'lines', defaultValue: 'زيارة الصفحة الرئيسية\nاختبار البداية\nاختيار المسار\nطلب شراء أو حجز\nمتابعة داخل لوحة الحساب', wide: true }, { key: 'purchaseJourney', label: 'رحلة الشراء', type: 'lines', defaultValue: 'اختيار المنتج\nاختيار طريقة الدفع\nإرسال المرجع\nمراجعة الإدارة\nفتح المحتوى', wide: true }, { key: 'bookingJourney', label: 'رحلة الحجز', type: 'lines', defaultValue: 'اختيار نوع الجلسة\nاختيار التاريخ\nاختيار الوقت\nإرسال الطلب\nتأكيد الإدارة', wide: true }, { key: 'postPurchaseNudge', label: 'رسالة بعد الشراء', type: 'textarea', defaultValue: 'تم فتح المحتوى داخل حسابك. ابدئي بهدوء من أول درس أو أول فصل.', wide: true }] }, { title: 'التخصيص', description: 'قواعد التوصية الشخصية.', fields: [{ key: 'enablePersonalization', label: 'تفعيل التخصيص', type: 'toggle', defaultValue: true }, { key: 'recommendByInterest', label: 'التوصية حسب الاهتمام', type: 'toggle', defaultValue: true }, { key: 'recommendByProgress', label: 'التوصية حسب التقدم', type: 'toggle', defaultValue: true }, { key: 'showNextBestStep', label: 'عرض الخطوة التالية', type: 'toggle', defaultValue: true }] }] satisfies AdminControlSection[]

export default function AdminGeneratedPage() {
  return (
    <AdminPageShell eyebrow='رحلة العميلة' title='تحكم في تسلسل الرحلة من أول زيارة حتى الشراء والحجز' description="تحكمات قابلة للحفظ في Firestore حتى يمكن تعديل التجربة بدون الرجوع للكود.">
      <AdminSettingsConsole collectionName="admin_customer_journey_settings" documentId="global" sections={sections} />
    </AdminPageShell>
  )
}
