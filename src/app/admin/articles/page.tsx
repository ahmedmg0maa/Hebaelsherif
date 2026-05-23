import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminCollectionManager from '@/components/admin/AdminCollectionManager'
import type { AdminControlField } from '@/lib/admin/controlData'

const fields = [
  {key: "title", label: "عنوان المقال", type: "text", wide: true},
  {key: "slug", label: "Slug", type: "text"},
  {key: "category", label: "التصنيف", type: "text", placeholder: "العلاقات"},
  {key: "excerpt", label: "ملخص قصير", type: "textarea", wide: true},
  {key: "content", label: "المحتوى", type: "textarea", wide: true},
  {key: "coverImageUrl", label: "صورة الغلاف", type: "url", wide: true},
  {key: "seoTitle", label: "SEO Title", type: "text", wide: true},
  {key: "seoDescription", label: "SEO Description", type: "textarea", wide: true},
  {key: "status", label: "الحالة", type: "select", options: [{label: "منشور",value: "published"},{label: "مسودة",value: "draft"}], defaultValue: "draft"}
] satisfies AdminControlField[]

export default function AdminCollectionPage() {
  return (
    <AdminPageShell
      eyebrow="المقالات"
      title="إدارة المقالات"
      description="كتابة مقالات SEO هادئة لبناء الثقة والظهور على Google."
    >
      <AdminCollectionManager
        collectionName="articles"
        titleField="title"
        emptyTitle="لا توجد مقالات"
        emptyDescription="أضيفي أول مقال عن العلاقات أو الحدود أو الوعي العاطفي."
        fields={fields}
      />
    </AdminPageShell>
  )
}
