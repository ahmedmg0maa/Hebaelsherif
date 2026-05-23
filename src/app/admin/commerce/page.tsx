import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminSettingsConsole from '@/components/admin/AdminSettingsConsole'
import type { AdminControlSection } from '@/lib/admin/controlData'

const sections = [{ title: 'الدفع', description: 'طرق وإرشادات.', fields: [{ key: 'preferredPaymentMethod', label: 'الطريقة المفضلة', type: 'select', options: [{label: 'InstaPay', value: 'instapay'},{label: 'Vodafone Cash', value: 'vodafone_cash'},{label: 'Bank Transfer', value: 'bank_transfer'},{label: 'Manual', value: 'manual'}], defaultValue: 'instapay' }, { key: 'requirePaymentReference', label: 'اشتراط رقم العملية', type: 'toggle', defaultValue: true }, { key: 'allowPaymentProofUrl', label: 'السماح برابط إثبات', type: 'toggle', defaultValue: true }, { key: 'autoGrantAfterPaid', label: 'فتح الوصول بعد paid', type: 'toggle', defaultValue: true }, { key: 'showReceiptPlaceholder', label: 'إظهار إيصال مبدئي', type: 'toggle', defaultValue: true }] }, { title: 'الكوبونات والباقات', description: 'قواعد عامة.', fields: [{ key: 'enableCoupons', label: 'تفعيل الكوبونات', type: 'toggle', defaultValue: true }, { key: 'enableBundles', label: 'تفعيل الباقات', type: 'toggle', defaultValue: true }, { key: 'maxCouponPercent', label: 'أقصى خصم نسبة', type: 'number', defaultValue: 30 }, { key: 'allowInstallments', label: 'السماح بالتقسيط اليدوي', type: 'toggle', defaultValue: false, wide: true }, { key: 'checkoutTrustText', label: 'نص ثقة الدفع', type: 'textarea', defaultValue: 'الدفع يراجع يدويًا قبل فتح المحتوى للحفاظ على الخصوصية والدقة.', wide: true }] }] satisfies AdminControlSection[]

export default function AdminGeneratedPage() {
  return (
    <AdminPageShell eyebrow='التجارة' title='تجربة الدفع والباقات والتحويل' description="تحكمات قابلة للحفظ في Firestore حتى يمكن تعديل التجربة بدون الرجوع للكود.">
      <AdminSettingsConsole collectionName="admin_commerce_settings" documentId="global" sections={sections} />
    </AdminPageShell>
  )
}
