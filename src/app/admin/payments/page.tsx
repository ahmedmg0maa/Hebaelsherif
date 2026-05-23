import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminSettingsConsole from '@/components/admin/AdminSettingsConsole'
import type { AdminControlSection } from '@/lib/admin/controlData'

const sections = [
  {
    title: "طرق الدفع",
    description: "فعلي أو أوقفي أي طريقة دفع واكتبي بياناتها بشكل واضح.",
    fields: [
      {key: "enableInstaPay", label: "تفعيل InstaPay", type: "toggle", defaultValue: true},
      {key: "instaPayHandle", label: "InstaPay handle", type: "text", placeholder: "name@instapay"},
      {key: "enableWallet", label: "تفعيل المحافظ الإلكترونية", type: "toggle", defaultValue: true},
      {key: "walletNumber", label: "رقم المحفظة", type: "text", placeholder: "01xxxxxxxxx"},
      {key: "enableBankTransfer", label: "تفعيل التحويل البنكي", type: "toggle", defaultValue: false},
      {key: "bankDetails", label: "بيانات البنك", type: "textarea", placeholder: "اسم البنك\nرقم الحساب\nIBAN", wide: true}
    ],
  },
  {
    title: "تعليمات وإثبات الدفع",
    description: "تحكم في الرسالة التي تظهر بعد طلب الشراء.",
    fields: [
      {key: "paymentInstructions", label: "تعليمات عامة", type: "textarea", defaultValue: "بعد التحويل، اكتبي رقم العملية أو ارفعي إثبات الدفع، وسيتم فتح المحتوى بعد المراجعة.", wide: true},
      {key: "requirePaymentReference", label: "اشتراط رقم العملية", type: "toggle", defaultValue: true},
      {key: "allowPaymentProofUrl", label: "السماح برابط إثبات الدفع", type: "toggle", defaultValue: true},
      {key: "receiptMessage", label: "رسالة الإيصال", type: "textarea", defaultValue: "تم تسجيل بيانات الدفع. سيتم مراجعتها وفتح الوصول عند التأكيد.", wide: true}
    ],
  },
  {
    title: "الكوبونات والباقات",
    description: "بنية جاهزة لتفعيل الخصومات والباقات.",
    fields: [
      {key: "enableCoupons", label: "تفعيل الكوبونات", type: "toggle", defaultValue: true},
      {key: "defaultCouponExpiryDays", label: "صلاحية الكوبون الافتراضية بالأيام", type: "number", defaultValue: 30},
      {key: "bundleRules", label: "قواعد الباقات", type: "lines", defaultValue: "كورس + كتاب | 15%\nجلسة + كتاب | 10%\nبرنامج كامل | 20%", wide: true}
    ],
  }
] satisfies AdminControlSection[]

export default function AdminGeneratedSettingsPage() {
  return (
    <AdminPageShell
      eyebrow="المدفوعات"
      title="إعدادات الدفع والتحويلات"
      description="تحكم في طرق الدفع اليدوي، تعليمات الدفع، الكوبونات، والإيصالات بدون لمس الكود."
    >
      <AdminSettingsConsole
        collectionName="payment_settings"
        documentId="default"
        sections={sections}
      />
    </AdminPageShell>
  )
}
