import type { Metadata } from 'next'
import { CmsControlledProsePage } from '@/components/catalog/CmsControlledProsePage'

export const metadata: Metadata = { title: 'سياسة الخصوصية', robots: { index: false, follow: false } }

export default function PrivacyPage() {
  return (
    <CmsControlledProsePage slug="privacy"
      eyebrow="قانوني"
      title="سياسة الخصوصية"
      lead="هذه مسودة خصوصية غير معتمدة للنشر. يلزم اعتماد المالكة والمراجعة القانونية قبل أن تصبح سياسة تخص أي بيئة إنتاج."
      updatedAt="بانتظار الاعتماد القانوني"
      sections={[
        {
          heading: 'الحالة قبل النشر',
          paragraphs: ['لا تمثل هذه الصفحة إشعار خصوصية لبيئة إنتاج.'],
          bullets: [
            'لم تُعتمد بعد قائمة البيانات النهائية أو أساس معالجتها أو مدد الاحتفاظ بها.',
            'لا تستخدم هذه المسودة كمرجع لحقوق قانونية أو لمزودي خدمات محددين.',
          ],
        },
        {
          heading: 'كيف نستخدم بياناتك',
          paragraphs: [
            'سيحدد النص المعتمد أغراض المعالجة والمزودين وأي اتصالات اختيارية بعد تثبيت البنية والإجراءات الفعلية.',
          ],
        },
        {
          heading: 'حماية البيانات',
          paragraphs: [
            'لن تُنشر ادعاءات عن مزود التخزين أو التشفير أو نطاق الوصول قبل تحقق إعدادات الإنتاج فعليًا.',
          ],
        },
        {
          heading: 'حقوقك',
          paragraphs: ['سيعرض الإصدار المعتمد طريقة ممارسة الحقوق والجهة المسؤولة ومدد الاستجابة المناسبة قانونيًا.'],
        },
        {
          heading: 'التواصل',
          paragraphs: ['لا تعرض المنصة حاليًا قناة خصوصية أو مدة استجابة معتمدة قبل تهيئة التشغيل.'],
        },
      ]}
    />
  )
}
