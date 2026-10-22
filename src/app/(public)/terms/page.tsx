import type { Metadata } from 'next'
import { CmsControlledProsePage } from '@/components/catalog/CmsControlledProsePage'

export const metadata: Metadata = { title: 'الشروط والأحكام', robots: { index: false, follow: false } }

export default function TermsPage() {
  return (
    <CmsControlledProsePage slug="terms"
      eyebrow="قانوني"
      title="الشروط والأحكام"
      lead="هذه صفحة مسودة غير معتمدة للنشر. لا تنشئ شروط استخدام أو التزامًا تعاقديًا قبل اعتماد المالكة للنص القانوني ونشر إصداره."
      updatedAt="بانتظار الاعتماد القانوني"
      sections={[
        {
          heading: 'الحساب',
          paragraphs: [
            'سيُنشر هنا النص المعتمد لملكية الحساب واستخدامه عند اكتمال مراجعته القانونية والتشغيلية.',
          ],
        },
        {
          heading: 'المحتوى والملكية الفكرية',
          paragraphs: [
            'سيحدد الإصدار المعتمد حقوق الاستخدام والملكية الفكرية لكل نوع من المحتوى المنشور.',
          ],
        },
        {
          heading: 'الدفع وتفعيل الوصول',
          paragraphs: [
            'تظهر وسائل الدفع المفعّلة وشروط الطلب في مسار الدفع فقط. لا يُنشر هنا موعد مراجعة أو شرط وصول قبل اعتمادهما.',
          ],
        },
        {
          heading: 'الجلسات والورش',
          paragraphs: [
            'سيحدد النص المعتمد قواعد الإلغاء وإعادة الجدولة لكل خدمة أو ورشة منشورة.',
          ],
        },
        {
          heading: 'إخلاء المسؤولية',
          paragraphs: [
            'راجعي صفحة إخلاء المسؤولية للاطلاع على حدود المحتوى قبل استخدام أي خدمة منشورة.',
          ],
        },
      ]}
    />
  )
}
