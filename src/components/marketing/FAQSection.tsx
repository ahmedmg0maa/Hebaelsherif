import { FAQS } from '@/constants/content'
import PremiumAccordion from '@/components/ui/PremiumAccordion'
import PremiumSection from '@/components/ui/PremiumSection'

export default function FAQSection() {
  return (
    <PremiumSection
      eyebrow="أسئلة مهمة"
      title="وضوح قبل أن تبدئي"
      description="جمعنا الأسئلة التي تساعدك على اختيار المسار المناسب بثقة وهدوء."
    >
      <PremiumAccordion items={FAQS.map((item) => ({ title: item.question, content: item.answer }))} />
    </PremiumSection>
  )
}
