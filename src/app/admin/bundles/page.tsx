import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminCollectionManager from '@/components/admin/AdminCollectionManager'
import type { AdminControlField } from '@/lib/admin/controlData'

const fields = [
  {key: "title", label: "اسم الباقة", type: "text", wide: true},
  {key: "description", label: "الوصف", type: "textarea", wide: true},
  {key: "items", label: "العناصر", type: "lines", placeholder: "course:ID\nbook:ID\nsession:90", wide: true},
  {key: "regularPrice", label: "السعر قبل الخصم", type: "number"},
  {key: "price", label: "سعر الباقة", type: "number"},
  {key: "active", label: "مفعلة", type: "toggle", defaultValue: true}
] satisfies AdminControlField[]

export default function AdminCollectionPage() {
  return (
    <AdminPageShell
      eyebrow="الباقات"
      title="إدارة الباقات"
      description="باقات تجمع منتجات وخدمات بسعر مميز."
    >
      <AdminCollectionManager
        collectionName="bundles"
        titleField="title"
        emptyTitle="لا توجد باقات"
        emptyDescription="أضيفي باقة جديدة للكورسات أو الجلسات."
        fields={fields}
      />
    </AdminPageShell>
  )
}
