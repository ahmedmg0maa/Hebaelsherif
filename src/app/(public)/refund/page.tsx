import type { Metadata } from 'next'
import { CmsControlledProsePage } from '@/components/catalog/CmsControlledProsePage'

export const metadata: Metadata = { title: 'سياسة الاسترداد', robots: { index: false, follow: false } }

export default function RefundPage() {
  return (
    <CmsControlledProsePage slug="refund"
      eyebrow="قانوني"
      title="سياسة الاسترداد"
      lead="لا توجد سياسة استرداد معتمدة للنشر بعد. لا تنشئ هذه المسودة حقًا أو التزامًا قبل اعتماد المالكة للنص القانوني ونشره."
      updatedAt="بانتظار الاعتماد القانوني"
      sections={[
        {
          heading: 'الحالة قبل النشر',
          paragraphs: [
            'لن يظهر خيار استرداد أو وعد بمدة معالجة قبل نشر سياسة محددة ومعتمدة وربطها بوسائل الدفع الفعلية.',
            'لا تتضمن هذه الصفحة الآن مددًا أو نسبًا أو أهلية للاسترداد؛ أي نص سابق من هذا النوع أزيل لأنه لم يكن مصدرًا قانونيًا معتمدًا.',
          ],
        },
      ]}
    />
  )
}
