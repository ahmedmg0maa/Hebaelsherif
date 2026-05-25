export const dynamic = 'force-dynamic'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import PremiumAssessment from '@/components/marketing/PremiumAssessment'
import PremiumButton from '@/components/ui/PremiumButton'

const steps = [
  { title: 'اختاري إحساسك الآن', text: 'لا تحتاجين وصفًا مثاليًا. فقط اختاري الأقرب لما يحدث داخلك.' },
  { title: 'خذي ترشيحًا هادئًا', text: 'المساعد يقترح بداية مناسبة: كورس، كتاب، أو جلسة.' },
  { title: 'ابدئي بخطوة واحدة', text: 'الهدف ليس إنجازًا سريعًا، بل وضوح مستمر وخطوة آمنة.' },
]

export default function StartHerePage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20">
        <section className="container-premium py-14">
          <div className="mb-10 max-w-3xl">
            <p className="mini-label">ابدئي من هنا</p>
            <h1 className="mt-4 text-5xl font-black leading-tight text-charcoal md:text-6xl">بداية لطيفة لمن لا تعرف من أين تبدأ</h1>
            <p className="mt-5 text-base leading-9 text-warm-gray">
              هذه الصفحة صممت لتقليل التشتت. أجيبي على اختبار بسيط، ثم اختاري خطوة واحدة تناسب مرحلتك الحالية.
            </p>
          </div>
          <PremiumAssessment />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {steps.map((step, index) => (
              <article key={step.title} className="rounded-[2rem] border border-sand bg-ivory/90 p-6 shadow-soft">
                <p className="text-xs font-black text-gold">0{index + 1}</p>
                <h2 className="mt-3 text-xl font-black text-charcoal">{step.title}</h2>
                <p className="mt-3 text-sm leading-8 text-warm-gray">{step.text}</p>
              </article>
            ))}
          </div>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <PremiumButton href="/courses">الكورسات</PremiumButton>
            <PremiumButton href="/booking" variant="outline">الجلسات</PremiumButton>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
