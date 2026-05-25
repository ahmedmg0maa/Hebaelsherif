export const dynamic = 'force-dynamic'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import PremiumSection from '@/components/ui/PremiumSection'

const trustItems = [
  ['خصوصية الرحلة', 'حسابك، طلباتك، محتواك، وجلساتك منظمة داخل مساحة خاصة.'],
  ['حدود مهنية واضحة', 'المحتوى والجلسات للتوجيه والنمو الشخصي وليست بديلًا عن علاج أو تشخيص طبي.'],
  ['محتوى محمي', 'روابط الكتب والكورسات لا تظهر إلا بعد تأكيد الدفع والوصول.'],
  ['متابعة واضحة', 'كل طلب شراء أو حجز يظهر بحالة واضحة داخل حسابك، بدون غموض أو رسائل متفرقة.'],
  ['تجربة لا تضغط', 'لا نستخدم لغة تخويف أو وعودًا غير واقعية.'],
  ['تحسين مستمر', 'المنصة مصممة للتحسين عبر التحليلات، المراجعات، واختبار الاستخدام.'],
]

export default function TrustSafetyPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20">
        <section className="container-premium py-16">
          <PremiumSection
            eyebrow="الثقة والأمان"
            title="مساحة عاطفية آمنة تحتاج وضوحًا قبل الجمال"
            description="هذه الصفحة توضح كيف نحافظ على الهدوء، الخصوصية، والحدود المهنية داخل التجربة."
          >
            <div className="grid gap-5 md:grid-cols-3">
              {trustItems.map(([title, text]) => (
                <article key={title} className="rounded-[2rem] border border-sand bg-ivory/90 p-6 shadow-soft">
                  <h2 className="text-xl font-black text-charcoal">{title}</h2>
                  <p className="mt-3 text-sm leading-8 text-warm-gray">{text}</p>
                </article>
              ))}
            </div>
          </PremiumSection>
        </section>
      </main>
      <Footer />
    </>
  )
}
