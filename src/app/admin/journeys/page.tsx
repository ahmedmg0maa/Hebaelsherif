import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminCollectionManager from '@/components/admin/AdminCollectionManager'
import type { AdminControlField } from '@/lib/admin/controlData'

const fields = [
  {key: "title", label: "اسم المسار", type: "text", wide: true},
  {key: "slug", label: "Slug", type: "text"},
  {key: "description", label: "وصف المسار", type: "textarea", wide: true},
  {key: "includedItems", label: "العناصر المضمنة", type: "lines", placeholder: "course:abc\nbook:def\nsession:60", wide: true},
  {key: "price", label: "السعر", type: "number", defaultValue: 0},
  {key: "status", label: "الحالة", type: "select", options: [{label: "منشور",value: "published"},{label: "مسودة",value: "draft"}], defaultValue: "draft"}
] satisfies AdminControlField[]

export default function AdminCollectionPage() {
  return (
    <AdminPageShell
      eyebrow="المسارات"
      title="إدارة المسارات والبرامج"
      description="إنشاء مسارات تعلم تجمع كورسات وكتب وجلسات في تجربة واحدة."
    >
      <AdminCollectionManager
        collectionName="journeys"
        titleField="title"
        emptyTitle="لا توجد مسارات"
        emptyDescription="أنشئي مسارًا مثل: رحلة الحدود أو رحلة التعافي."
        fields={fields}
      />
    </AdminPageShell>
  )
}
