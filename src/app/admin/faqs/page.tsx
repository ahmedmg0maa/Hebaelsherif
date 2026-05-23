import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminCollectionManager from '@/components/admin/AdminCollectionManager'
import type { AdminControlField } from '@/lib/admin/controlData'

const fields = [
  {key: "question", label: "السؤال", type: "text", wide: true},
  {key: "answer", label: "الإجابة", type: "textarea", wide: true},
  {key: "area", label: "مكان الظهور", type: "select", options: [{label: "عام",value: "general"},{label: "الحجز",value: "booking"},{label: "الدورات",value: "courses"},{label: "الكتب",value: "books"},{label: "الدفع",value: "payments"}], defaultValue: "general"},
  {key: "order", label: "الترتيب", type: "number", defaultValue: 1},
  {key: "status", label: "الحالة", type: "select", options: [{label: "منشور",value: "published"},{label: "مسودة",value: "draft"}], defaultValue: "published"}
] satisfies AdminControlField[]

export default function AdminCollectionPage() {
  return (
    <AdminPageShell
      eyebrow="الأسئلة الشائعة"
      title="إدارة FAQ"
      description="أضيفي أسئلة وأجوبة تظهر في الصفحة الرئيسية أو صفحات المنتج أو الحجز."
    >
      <AdminCollectionManager
        collectionName="faqs"
        titleField="question"
        emptyTitle="لا توجد أسئلة"
        emptyDescription="ابدئي بإضافة سؤال شائع للزائرات."
        fields={fields}
      />
    </AdminPageShell>
  )
}
