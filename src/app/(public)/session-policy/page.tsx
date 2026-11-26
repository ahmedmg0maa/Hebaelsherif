import type { Metadata } from 'next'
import { CmsControlledProsePage } from '@/components/catalog/CmsControlledProsePage'

export const metadata: Metadata = {
  title: 'سياسة الجلسات',
  robots: { index: false, follow: false },
}

export default function SessionPolicyPage() {
  return (
    <CmsControlledProsePage
      slug="session-policy"
      eyebrow="قانوني وتشغيلي"
      title="سياسة الجلسات"
      lead="هذه مسودة غير معتمدة ولا تنشئ التزامًا تعاقديًا. تُنشر السياسة الفعلية فقط بعد اعتماد المالكة للإلغاء وإعادة الجدولة والتأخير والحضور."
      updatedAt="بانتظار اعتماد المالكة والمراجعة القانونية"
      sections={[
        {
          heading: 'حالة هذه الصفحة',
          paragraphs: ['لا تُستخدم هذه المسودة لاتخاذ قرار حجز أو لتحديد حق أو التزام.'],
          bullets: [
            'تظهر المواعيد والأسعار والتوافر الفعلي من إعدادات الخدمة المنشورة فقط.',
            'تظل قواعد الإلغاء والاسترداد وإعادة الجدولة غير ملزمة حتى نشر إصدار معتمد وتاريخ سريان.',
          ],
        },
        {
          heading: 'ما يجب اعتماده قبل النشر',
          paragraphs: ['مدة الجلسة، مهلة الإلغاء، آلية إعادة الجدولة، التأخير، الغياب، وسيلة تقديم الجلسة، وحدود الدعم بين المواعيد.'],
        },
        {
          heading: 'الحدود المهنية والخصوصية',
          paragraphs: ['يجب أن يوضح الإصدار المعتمد طبيعة الخدمة وحدودها، وما إذا كانت البيانات المطلوبة للحجز ضرورية وكيف تُدار تشغيليًا.'],
        },
      ]}
    />
  )
}
