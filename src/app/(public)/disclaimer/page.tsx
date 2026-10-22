import type { Metadata } from 'next'
import { CmsControlledProsePage } from '@/components/catalog/CmsControlledProsePage'

export const metadata: Metadata = { title: 'إخلاء المسؤولية', robots: { index: false, follow: false } }

export default function DisclaimerPage() {
  return (
    <CmsControlledProsePage slug="disclaimer"
      eyebrow="قانوني"
      title="إخلاء المسؤولية"
      lead="حدود واضحة لما تقدمه المنصة — لأن الوضوح جزء من الأمانة."
      updatedAt="مسودة تشغيلية — بانتظار المراجعة القانونية"
      sections={[
        {
          heading: 'طبيعة المحتوى',
          paragraphs: [
            'أي محتوى تعليمي أو تطويري منشور في المنصة لا يقدّم علاجًا نفسيًا أو استشارة طبية ولا يحل محل الرعاية المتخصصة.',
          ],
        },
        {
          heading: 'متى تحتاجين لمختص؟',
          paragraphs: [
            'إذا كنتِ تمرين بأزمة نفسية حادة، أو أفكار مؤذية، أو أعراض تؤثر على حياتك اليومية — فالخطوة الصحيحة هي التوجه لطبيب أو معالج نفسي مرخّص. المحتوى هنا يرافق رحلتك، ولا يحل محل الرعاية المتخصصة.',
          ],
        },
        {
          heading: 'النتائج الفردية',
          paragraphs: [
            'تختلف النتائج من شخص لآخر. لا تعرض المنصة ضمانًا لنتيجة محددة، ولا ينبغي اعتبار أي محتوى بديلًا عن تقييم المختص المناسب.',
          ],
        },
      ]}
    />
  )
}
