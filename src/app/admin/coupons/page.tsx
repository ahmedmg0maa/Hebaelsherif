import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminCollectionManager from '@/components/admin/AdminCollectionManager'
import type { AdminControlField } from '@/lib/admin/controlData'

const fields = [
  {key: "code", label: "كود الخصم", type: "text", placeholder: "HEBA20"},
  {key: "type", label: "نوع الخصم", type: "select", options: [{label: "نسبة مئوية",value: "percentage"},{label: "مبلغ ثابت",value: "fixed"}], defaultValue: "percentage"},
  {key: "value", label: "قيمة الخصم", type: "number", defaultValue: 10},
  {key: "active", label: "مفعل", type: "toggle", defaultValue: true},
  {key: "expiresAtText", label: "تاريخ الانتهاء", type: "text", placeholder: "2026-12-31"},
  {key: "usageLimit", label: "حد الاستخدام", type: "number", defaultValue: 100},
  {key: "notes", label: "ملاحظات داخلية", type: "textarea", wide: true}
] satisfies AdminControlField[]

export default function AdminCollectionPage() {
  return (
    <AdminPageShell
      eyebrow="الكوبونات"
      title="إدارة الكوبونات والخصومات"
      description="إنشاء أكواد خصم وباقات تجريبية بدون تعديل الكود."
    >
      <AdminCollectionManager
        collectionName="coupons"
        titleField="code"
        emptyTitle="لا توجد كوبونات"
        emptyDescription="أضيفي أول كوبون عند الحاجة إلى حملة أو عرض خاص."
        fields={fields}
      />
    </AdminPageShell>
  )
}
