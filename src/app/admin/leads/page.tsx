import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminCollectionManager from '@/components/admin/AdminCollectionManager'
import type { AdminControlField } from '@/lib/admin/controlData'

const fields = [
  {key: "email", label: "البريد الإلكتروني", type: "email"},
  {key: "name", label: "الاسم", type: "text"},
  {key: "source", label: "المصدر", type: "select", options: [{label: "الرئيسية",value: "home"},{label: "الحجز",value: "booking"},{label: "مقال",value: "article"},{label: "يدوي",value: "manual"}], defaultValue: "manual"},
  {key: "interest", label: "الاهتمام", type: "text", placeholder: "جلسات / كتب / دورات"},
  {key: "status", label: "الحالة", type: "select", options: [{label: "جديد",value: "new"},{label: "تم التواصل",value: "contacted"},{label: "تحول لعميل",value: "converted"}], defaultValue: "new"},
  {key: "notes", label: "ملاحظات", type: "textarea", wide: true}
] satisfies AdminControlField[]

export default function AdminCollectionPage() {
  return (
    <AdminPageShell
      eyebrow="العملاء المحتملون"
      title="إدارة المهتمين والنشرة"
      description="قائمة خفيفة للمهتمات، مصدر الاشتراك، وحالة المتابعة."
    >
      <AdminCollectionManager
        collectionName="leads"
        titleField="email"
        emptyTitle="لا توجد Leads"
        emptyDescription="ستظهر هنا الاشتراكات أو يمكن إضافتها يدويًا."
        fields={fields}
      />
    </AdminPageShell>
  )
}
