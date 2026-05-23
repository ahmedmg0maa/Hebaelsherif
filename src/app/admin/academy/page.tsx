import AdminPageShell from '@/components/admin/AdminPageShell'
import AdminSettingsConsole from '@/components/admin/AdminSettingsConsole'
import type { AdminControlSection } from '@/lib/admin/controlData'

const sections = [
  {
    title: 'استوديو بناء الكورس',
    description: 'قواعد وملاحظات تشغيلية تساعد الأدمن على إنشاء كورسات بفصول ودروس منظمة.',
    fields: [
      { key: 'chapterNamingRule', label: 'قاعدة تسمية الفصول', type: 'text', defaultValue: 'الفصل الأول: الوعي بالنمط' },
      { key: 'lessonNamingRule', label: 'قاعدة تسمية الدروس', type: 'text', defaultValue: 'الدرس الأول: سؤال البداية' },
      { key: 'defaultLessonDuration', label: 'مدة الدرس الافتراضية', type: 'number', defaultValue: 20 },
      { key: 'requireLessonResources', label: 'اشتراط موارد لكل درس', type: 'toggle', defaultValue: false },
      { key: 'allowPreviewLessons', label: 'السماح بدروس مجانية للمعاينة', type: 'toggle', defaultValue: true },
      { key: 'driveFolderPattern', label: 'نمط تنظيم Google Drive', type: 'textarea', defaultValue: 'Course Folder\n  Chapter 01\n    Lesson 01 Video\n    Worksheet PDF', wide: true },
    ],
  },
  {
    title: 'جودة المحتوى',
    description: 'Checklist داخلية قبل نشر أي كورس.',
    fields: [
      { key: 'coursePublishChecklist', label: 'Checklist النشر', type: 'lines', defaultValue: 'عنوان واضح\nوعد عاطفي صادق\nفصول مرتبة\nدروس لها مدة ووصف\nرابط محتوى محمي\nأسئلة شائعة\nصورة غلاف\nSEO title و description', wide: true },
      { key: 'minimumLessonsBeforePublish', label: 'أقل عدد دروس قبل النشر', type: 'number', defaultValue: 3 },
      { key: 'minimumOutcomesBeforePublish', label: 'أقل عدد نتائج متوقعة', type: 'number', defaultValue: 4 },
    ],
  },
] satisfies AdminControlSection[]

export default function AdminAcademyPage() {
  return (
    <AdminPageShell
      eyebrow="استوديو التعلم"
      title="قواعد بناء الكورسات والفصول"
      description="لوحة تشغيلية تساعد على توحيد جودة الكورسات والدروس والموارد قبل النشر."
    >
      <AdminSettingsConsole collectionName="academy_settings" documentId="default" sections={sections} />
    </AdminPageShell>
  )
}
