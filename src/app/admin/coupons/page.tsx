import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminCollectionManager from '@/components/admin/AdminCollectionManager'
import type { AdminControlField } from '@/lib/admin/controlData'

const fields = [
  { key: 'code', label: 'كود الخصم', type: 'text', placeholder: 'HEBA20' },
  {
    key: 'scope',
    label: 'ينطبق على',
    type: 'select',
    options: [
      { label: 'الكل', value: 'all' },
      { label: 'الجلسات فقط', value: 'sessions' },
      { label: 'الكورسات فقط', value: 'courses' },
      { label: 'الكتب فقط', value: 'books' },
    ],
    defaultValue: 'all',
  },
  {
    key: 'type',
    label: 'نوع الخصم',
    type: 'select',
    options: [
      { label: 'نسبة مئوية', value: 'percentage' },
      { label: 'مبلغ ثابت', value: 'fixed' },
    ],
    defaultValue: 'percentage',
  },
  { key: 'value', label: 'قيمة الخصم', type: 'number', defaultValue: 10 },
  { key: 'minAmount', label: 'الحد الأدنى للمبلغ', type: 'number', defaultValue: 0 },
  { key: 'active', label: 'مفعل', type: 'toggle', defaultValue: true },
  { key: 'expiresAtText', label: 'تاريخ الانتهاء', type: 'text', placeholder: '2026-12-31' },
  { key: 'usageLimit', label: 'حد الاستخدام', type: 'number', defaultValue: 100 },
  { key: 'usageCount', label: 'عدد الاستخدام الحالي', type: 'number', defaultValue: 0 },
  { key: 'notes', label: 'ملاحظات داخلية', type: 'textarea', wide: true },
] satisfies AdminControlField[]

export default function AdminCollectionPage() {
  return (
    <AdminPageShell
      eyebrow="الكوبونات"
      title="إدارة الكوبونات والخصومات"
      description="إنشاء أكواد خصم للجلسات، الكورسات، الكتب، أو كل المنصة بدون تعديل الكود."
    >
      <AdminCollectionManager
        collectionName="coupons"
        titleField="code"
        emptyTitle="لا توجد كوبونات"
        emptyDescription="أضيفي أول كوبون عند الحاجة إلى حملة أو عرض خاص. الكود لا يظهر للمستخدمة إلا إذا أدخلته بنفسها."
        fields={fields}
      />
    </AdminPageShell>
  )
}
