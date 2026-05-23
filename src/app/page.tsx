import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import PremiumButton from '@/components/ui/PremiumButton'
import PremiumBadge from '@/components/ui/PremiumBadge'
import PremiumSection from '@/components/ui/PremiumSection'
import ImageSlot from '@/components/ui/ImageSlot'
import FAQSection from '@/components/marketing/FAQSection'
import LeadMagnet from '@/components/marketing/LeadMagnet'
import PremiumAssessment from '@/components/marketing/PremiumAssessment'
import MotionReveal from '@/components/experience/MotionReveal'

const paths = [
  {
    title: 'جلسة فردية',
    label: 'وضوح شخصي',
    text: 'مساحة مركزة لفهم سؤال محدد، علاقة مرهقة، أو قرار يحتاج هدوءًا ووضوحًا.',
    href: '/booking',
    tone: 'bg-petrol text-ivory',
  },
  {
    title: 'كورس منظم',
    label: 'تعلم عميق',
    text: 'خطوات تعليمية متدرجة تساعدك على بناء وعي أعمق بنفسك وبعلاقاتك.',
    href: '/courses',
    tone: 'bg-gold text-charcoal',
  },
  {
    title: 'كتاب رقمي',
    label: 'قراءة هادئة',
    text: 'رفيق عملي للتأمل والكتابة وفهم ما يحدث داخلك في وقتك الخاص.',
    href: '/books',
    tone: 'bg-olive text-ivory',
  },
]

const feelingCards = [
  'تحتاجين أن تفهمي ما يحدث داخلك بلا ضغط أو أحكام.',
  'تتكرر أسئلة العلاقات والحدود وتريدين لغة أهدأ للتعامل معها.',
  'تبحثين عن مسار عربي عميق لا يبيعك وعودًا سريعة.',
  'تريدين مساحة تجمع التعلم، القراءة، والجلسات في تجربة واحدة.',
]

const transformations = [
  { from: 'تشتت داخلي', to: 'وضوح يسهّل الاختيار', accent: 'petrol' },
  { from: 'استنزاف عاطفي', to: 'حدود أكثر حنانًا', accent: 'olive' },
  { from: 'ضجيج في التفكير', to: 'خطوة عملية هادئة', accent: 'gold' },
  { from: 'خوف من البداية', to: 'رحلة منظمة تناسبك', accent: 'burgundy' },
]

const experiencePreview = [
  { title: 'لوحة رحلتك', text: 'كورساتك، كتبك، جلساتك، وطلباتك في مكان واحد واضح.' },
  { title: 'محتوى محمي', text: 'الوصول للمحتوى يتم داخل الحساب بعد تأكيد الطلب.' },
  { title: 'حجز ذكي', text: 'اختيار التاريخ والوقت بدون مواعيد سابقة أو تكرار.' },
  { title: 'تنظيم واضح', text: 'كل خطوة تظهر في وقتها: المحتوى، الجلسات، الطلبات، والمتابعة.' },
]

const testimonials = [
  'لا نضغط عليكِ لتتغيري بسرعة. نساعدك على رؤية ما يحدث داخلك بهدوء.',
  'كل خطوة في التجربة مكتوبة بلغة واضحة، إنسانية، وتحترم خصوصيتك.',
  'الهدف ليس استهلاك محتوى أكثر، بل اختيار خطوة مناسبة لمرحلتك الحالية.',
]

export default function HomePage() {
  return (
    <>
      <Navbar />

      <main id="main-content" className="min-h-screen pt-20">
        <section className="container-premium brand-luxury-veil relative grid min-h-[calc(100vh-5rem)] items-center gap-12 overflow-hidden rounded-b-[2.5rem] py-14 lg:grid-cols-[1.02fr_0.98fr] lg:py-20">
          <div className="ambient-orb ambient-orb-gold right-0 top-16 h-72 w-72" />
          <div className="ambient-orb ambient-orb-petrol bottom-10 left-12 h-80 w-80" />
          <div className="ambient-orb ambient-orb-olive bottom-28 right-1/3 h-56 w-56" />

          <MotionReveal className="relative z-10">
            <div className="brand-accent-line mb-6" />
            <PremiumBadge variant="gold">مساحة عربية هادئة للوضوح العاطفي</PremiumBadge>
            <h1 className="mt-7 text-balance text-5xl font-black leading-tight text-charcoal md:text-7xl">
              رحلة ناضجة لفهم نفسك، وتهدئة داخلك، واختيار طريقك بوعي.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-10 text-warm-gray">
              هبة الشريف تجمع بين الكوتشنج، الكورسات، والكتب في تجربة رقمية فاخرة تساعدك على بناء وضوح عاطفي حقيقي بلا استعجال أو ضجيج.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <PremiumButton href="/booking" size="lg" className="mobile-full-cta">احجزي جلسة</PremiumButton>
              <PremiumButton href="/start-here" size="lg" variant="gold" className="mobile-full-cta">ابدئي من هنا</PremiumButton>
              <PremiumButton href="/courses" size="lg" variant="outline" className="mobile-full-cta">شاهدي الكورسات</PremiumButton>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-4">
              <MiniMetric value="1:1" label="جلسات فردية" />
              <MiniMetric value="3" label="مسارات بداية" />
              <MiniMetric value="24/7" label="وصول للحساب" />
              <MiniMetric value="5+" label="صفحات إرشاد" />
            </div>
          </MotionReveal>

          <MotionReveal delay={0.1} className="relative z-10">
            <div className="premium-glow-border premium-soft-motion luxury-shell rounded-[2.5rem] p-5">
              <div className="relative min-h-[540px] overflow-hidden rounded-[2rem] border border-sand">
                <ImageSlot variant="portrait" ratio="free" className="absolute inset-0 h-full w-full rounded-none border-0" priority />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_55%_28%,rgba(255,255,255,.68),transparent_12rem)]" />
                <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-petrol/22 to-transparent" />
                <div className="absolute bottom-8 right-8 left-8 rounded-[2rem] border border-white/50 bg-ivory/86 p-5 shadow-premium backdrop-blur-lg">
                  <p className="text-xs font-black text-petrol">تجربة تبدأ بهدوء</p>
                  <h2 className="mt-2 text-2xl font-black text-charcoal">كل قرار أوضح يبدأ من مساحة آمنة مع الذات.</h2>
                  <p className="mt-3 text-sm leading-7 text-warm-gray">
                    اختبري المسار الأنسب، احجزي جلستك، أو ابدئي بكورس وكتاب يناسبان مرحلتك الحالية.
                  </p>
                </div>
              </div>
            </div>
          </MotionReveal>
        </section>

        <section className="container-premium py-14">
          <div className="grid gap-4 md:grid-cols-4">
            {feelingCards.map((item, index) => (
              <MotionReveal key={item} delay={index * 0.05}>
                <div className="brand-rich-card h-full rounded-[2rem] p-6">
                  <span className="latin-numerals text-xs font-black text-gold">0{index + 1}</span>
                  <p className="mt-4 text-sm font-black leading-8 text-charcoal">{item}</p>
                </div>
              </MotionReveal>
            ))}
          </div>
        </section>

        <section className="brand-quiet-divider border-y border-sand bg-ivory/55">
          <div className="container-premium py-16">
            <PremiumSection
              eyebrow="اختاري مسارك"
              title="ثلاثة أبواب هادئة. وبداية واحدة مناسبة لكِ."
              description="لا تحتاجين أن تعرفي كل الطريق الآن. اختاري الباب الأقرب لاحتياجك، والباقي سيظهر خطوة بخطوة."
            >
              <div className="grid gap-5 md:grid-cols-3">
                {paths.map((path, index) => (
                  <MotionReveal key={path.title} delay={index * 0.08}>
                    <Link href={path.href} className="group block h-full rounded-[2.2rem] border border-sand bg-ivory/90 p-5 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-premium">
                      <div className="course-art mb-6 h-48 rounded-[1.75rem] border border-sand p-5">
                        <span className={`inline-flex rounded-full px-4 py-2 text-xs font-black ${path.tone}`}>{path.label}</span>
                      </div>
                      <h3 className="text-2xl font-black text-charcoal transition group-hover:text-petrol">{path.title}</h3>
                      <p className="mt-3 text-sm leading-8 text-warm-gray">{path.text}</p>
                      <span className="mt-6 inline-flex rounded-full border border-petrol/20 bg-petrol/10 px-5 py-2 text-xs font-black text-petrol transition group-hover:bg-petrol group-hover:text-ivory">ابدئي من هنا</span>
                    </Link>
                  </MotionReveal>
                ))}
              </div>
            </PremiumSection>
          </div>
        </section>

        <section className="container-premium py-16">
          <PremiumAssessment />
        </section>

        <section className="relative overflow-hidden border-y border-sand bg-ivory/62">
          <div className="ambient-orb ambient-orb-gold left-12 top-8 h-56 w-56" />
          <div className="container-premium relative grid gap-10 py-16 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
            <MotionReveal>
              <div className="luxury-shell rounded-[2.5rem] p-7">
                <ImageSlot variant="portrait" ratio="portrait" className="mb-5 min-h-[300px]" />
                <div className="rounded-[2rem] border border-sand bg-cream/70 p-7">
                  <p className="mini-label">من هي هبة</p>
                  <h2 className="mt-4 text-4xl font-black leading-tight text-charcoal">حضور هادئ، ووعي عميق، ولغة تمنحك مساحة للتفكير.</h2>
                  <p className="mt-5 text-sm leading-9 text-warm-gray">
                    هنا لا توجد وصفات جاهزة أو وعود صاخبة. توجد أسئلة ناضجة، مسارات واضحة، ومرافقة تساعدك على رؤية ما يحدث داخلك بحنان وصدق.
                  </p>
                  <PremiumButton href="/about" variant="outline" className="mt-7">اعرفي أكثر عن هبة</PremiumButton>
                </div>
              </div>
            </MotionReveal>

            <div className="grid gap-4 sm:grid-cols-2">
              {transformations.map((item, index) => (
                <MotionReveal key={item.from} delay={index * 0.05}>
                  <div className="brand-rich-card rounded-[2rem] p-6">
                    <p className="text-sm font-black text-warm-gray">من: {item.from}</p>
                    <p className="mt-3 text-2xl font-black text-petrol">إلى: {item.to}</p>
                  </div>
                </MotionReveal>
              ))}
            </div>
          </div>
        </section>

        <section className="container-premium py-16">
          <PremiumSection
            eyebrow="جلسات الكوتشنج"
            title="لقاء فردي يضع السؤال في مكانه الصحيح"
            description="الحجز يتم بخطوات واضحة، مع منع الأيام السابقة وتكرار الموعد، ثم تظهر حالة الجلسة داخل حسابك."
          >
            <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
              <div className="brand-rich-card rounded-[2rem] p-7">
                <div className="grid gap-4 sm:grid-cols-3">
                  <SessionFeature title="اختيار التاريخ" text="تقويم واضح لا يسمح بالمواعيد السابقة." />
                  <SessionFeature title="اختيار الوقت" text="بطاقات وقت بدل القوائم المزدحمة." />
                  <SessionFeature title="تأكيد هادئ" text="ملخص كامل قبل إرسال الطلب." />
                </div>
                <PremiumButton href="/booking" className="mt-7">احجزي جلستك</PremiumButton>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <SessionPrice title="جلسة كوتشنج 60 دقيقة" price="1,200 ج.م" text="مناسبة لتشخيص واضح وخطوة عملية مباشرة." />
                <SessionPrice title="جلسة كوتشنج 90 دقيقة" price="1,500 ج.م" text="مناسبة للأسئلة الأعمق وخطة أكثر تفصيلًا." />
              </div>
            </div>
          </PremiumSection>
        </section>

        <section className="brand-quiet-divider border-y border-sand bg-ivory/55">
          <div className="container-premium py-16">
            <PremiumSection
              eyebrow="تجربة متكاملة"
              title="القوة التشغيلية تظهر كرحلة سهلة، لا كتعقيد"
              description="كل جزء في المنصة يخدم الوضوح: من لحظة البداية حتى الوصول للمحتوى أو حجز الجلسة."
            >
              <div className="grid gap-4 md:grid-cols-4">
                {experiencePreview.map((item, index) => (
                  <MotionReveal key={item.title} delay={index * 0.04}>
                    <div className="brand-rich-card h-full rounded-[1.75rem] p-5">
                      <span className="latin-numerals text-xs font-black text-gold">0{index + 1}</span>
                      <h3 className="mt-4 text-xl font-black text-charcoal">{item.title}</h3>
                      <p className="mt-3 text-sm leading-7 text-warm-gray">{item.text}</p>
                    </div>
                  </MotionReveal>
                ))}
              </div>
            </PremiumSection>
          </div>
        </section>

        <section className="container-premium py-16">
          <PremiumSection
            eyebrow="وعد التجربة"
            title="مساحة تمنحك وضوحًا بدون ضغط"
            description="إلى أن تُضاف تجارب حقيقية موثقة، يظهر هنا ما نلتزم به في كل جلسة وكورس وكتاب."
          >
            <div className="grid gap-4 md:grid-cols-3">
              {testimonials.map((text, index) => (
                <MotionReveal key={text} delay={index * 0.06}>
                  <article className="brand-rich-card h-full rounded-[2rem] p-6">
                    <div className="mb-5 h-12 w-12 rounded-full border border-gold/30 bg-gold/10" />
                    <p className="text-sm leading-8 text-warm-gray">{text}</p>
                    <p className="mt-5 text-xs font-black text-petrol">التزام هادئ</p>
                  </article>
                </MotionReveal>
              ))}
            </div>
          </PremiumSection>
        </section>

        <section className="container-premium py-16">
          <FAQSection />
        </section>

        <section className="container-premium pb-16">
          <LeadMagnet />
        </section>

        <section className="container-premium pb-16">
          <div className="premium-glow-border relative overflow-hidden rounded-[2.5rem] border border-sand bg-petrol p-8 text-center text-ivory shadow-premium md:p-12">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,.12),transparent_56%)]" />
            <div className="relative">
              <p className="mb-3 text-sm font-black tracking-[0.25em] text-gold">خطوتك التالية</p>
              <h2 className="text-3xl font-black leading-tight md:text-5xl">لا تحتاجين إلى تغيير حياتك دفعة واحدة. ابدئي بخطوة صادقة.</h2>
              <p className="mx-auto mt-5 max-w-2xl text-sm leading-8 text-ivory/78">
                اختاري جلسة، كورسًا، أو كتابًا. المهم أن تكون البداية مناسبة لما تعيشينه الآن.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <PremiumButton href="/booking" variant="gold">احجزي جلستك</PremiumButton>
                <PremiumButton href="/start-here" variant="outline" className="border-ivory text-ivory hover:bg-ivory hover:text-petrol">اختاري المسار الأنسب</PremiumButton>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}

function MiniMetric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[1.4rem] border border-sand bg-ivory/82 px-4 py-3 shadow-soft backdrop-blur-sm">
      <strong className="latin-numerals block text-xl font-black text-petrol">{value}</strong>
      <span className="mt-1 block text-xs font-bold leading-5 text-warm-gray">{label}</span>
    </div>
  )
}

function SessionFeature({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[1.5rem] border border-sand bg-cream/70 p-4">
      <h3 className="text-sm font-black text-charcoal">{title}</h3>
      <p className="mt-2 text-xs leading-6 text-warm-gray">{text}</p>
    </div>
  )
}

function SessionPrice({ title, price, text }: { title: string; price: string; text: string }) {
  return (
    <div className="brand-rich-card rounded-[2rem] p-6">
      <h3 className="text-xl font-black text-charcoal">{title}</h3>
      <strong className="latin-numerals mt-4 block text-3xl font-black text-petrol">{price}</strong>
      <p className="mt-3 text-sm leading-7 text-warm-gray">{text}</p>
    </div>
  )
}
