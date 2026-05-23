import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminCollectionManager from '@/components/admin/AdminCollectionManager'
import type { AdminControlField } from '@/lib/admin/controlData'

const fields = [
  {key: "title", label: "اسم الملف أو المجلد", type: "text", wide: true},
  {key: "assetType", label: "النوع", type: "select", options: [{label: "فيديو",value: "video"},{label: "PDF",value: "pdf"},{label: "مجلد",value: "folder"},{label: "صورة",value: "image"},{label: "ملف آخر",value: "other"}], defaultValue: "folder"},
  {key: "driveUrl", label: "رابط Drive", type: "url", wide: true},
  {key: "relatedProductId", label: "Product ID مرتبط", type: "text"},
  {key: "notes", label: "ملاحظات", type: "textarea", wide: true}
] satisfies AdminControlField[]

export default function AdminCollectionPage() {
  return (
    <AdminPageShell
      eyebrow="روابط Drive"
      title="مركز روابط Google Drive"
      description="حفظ روابط الملفات والمجلدات للاستخدام داخل الكورسات والكتب."
    >
      <AdminCollectionManager
        collectionName="drive_assets"
        titleField="title"
        emptyTitle="لا توجد روابط"
        emptyDescription="أضيفي رابط Google Drive ليستخدم لاحقًا في محتوى محمي."
        fields={fields}
      />
    </AdminPageShell>
  )
}
