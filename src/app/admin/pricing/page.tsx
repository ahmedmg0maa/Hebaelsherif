import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminSettingsConsole from '@/components/admin/AdminSettingsConsole'
import type { AdminControlSection } from '@/lib/admin/controlData'

const sections = [
  {
    title: "العملة والضرائب",
    description: "إعدادات عرض السعر.",
    fields: [
      {key: "currency", label: "العملة", type: "select", options: [{label: "EGP",value: "EGP"},{label: "USD",value: "USD"},{label: "SAR",value: "SAR"},{label: "AED",value: "AED"}], defaultValue: "EGP"},
      {key: "showCurrencyLabel", label: "عرض اسم العملة", type: "toggle", defaultValue: true},
      {key: "taxEnabled", label: "تفعيل ضرائب مستقبلًا", type: "toggle", defaultValue: false},
      {key: "taxPercentage", label: "نسبة الضريبة", type: "number", defaultValue: 0}
    ],
  },
  {
    title: "العروض",
    description: "قواعد عامة لاستخدام الخصومات.",
    fields: [
      {key: "allowStackingCoupons", label: "السماح بتجميع الكوبونات", type: "toggle", defaultValue: false},
      {key: "firstPurchaseDiscount", label: "خصم أول طلب", type: "number", defaultValue: 0},
      {key: "vipPackageDescription", label: "وصف باقة VIP", type: "textarea", wide: true}
    ],
  }
] satisfies AdminControlSection[]

export default function AdminSettingsPage() {
  return (
    <AdminPageShell
      eyebrow="التسعير"
      title="إعدادات الأسعار والعروض"
      description="سياسات عامة للأسعار، العروض، والضرائب المستقبلية."
    >
      <AdminSettingsConsole collectionName="pricing_settings" documentId="global" sections={sections} />
    </AdminPageShell>
  )
}
