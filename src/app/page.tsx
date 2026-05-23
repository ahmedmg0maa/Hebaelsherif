import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import PremiumButton from '@/components/ui/PremiumButton'
import PremiumBadge from '@/components/ui/PremiumBadge'
import PremiumSection from '@/components/ui/PremiumSection'
import ImageSlot from '@/components/ui/ImageSlot'
import FAQSection from '@/components/marketing/FAQSection'
import LeadMagnet from '@/components/marketing/LeadMagnet'
import TrustStrip from '@/components/marketing/TrustStrip'
import PremiumAssessment from '@/components/marketing/PremiumAssessment'
import MotionReveal from '@/components/experience/MotionReveal'
import { brandConfig } from '@/constants/brand.config'

const painPoints = [
  'تشعرين أن داخلك مزدحم، وتحتاجين نقطة بداية هادئة.',
  'تتكرر أنماط في علاقاتك وتريدين فهمها بلا لوم.',
  'تبحثين عن مساحة عربية راقية لا تضغط عليكِ بوعود سريعة.',
  'تحتاجين طريقًا منظمًا يجمع التعلم، القراءة، والجلسات.',
]

const journeys = [
  {
    title: 'أحتاج جلسة كوتشنج',
    label: 'جلسات فردية',
    text: 'لقاء هادئ لفهم وضعك الحالي وبناء خطوة عملية واضحة.',
    href: '/booking',
  },
  {
    title: 'أريد كورسًا أبدأ به',
    label: 'كورسات عملية',
    text: 'مسارات تعلم رقمية تساعدك على التحول خطوة بخطوة بإيقاع مرن.',
    href: '/courses',
  },
  {
    title: 'أريد كتابًا يساعدني',
    label: 'كتب ودلائل',
    text: 'قراءة هادئة تمنحك لغة وتأملًا وبداية عميقة في وقتك الخاص.',
    href: '/books',
  },
]

const transformations = [
  ['من: تشتت داخلي', 'إلى: وضوح واتصال بالذات'],
  ['من: خوف من الاختيار', 'إلى: قرار نابع من وعي'],
  ['من: استنزاف علاقات', 'إلى: حدود صحية وحنان'],
  ['من: ضجيج أفكار', 'إلى: سلام عملي يومي'],
]

const operatingSystem = [
  'محتوى مدفوع محمي داخل الحساب',
  'لوحة رحلة تحفظ الكورسات والكتب والجلسات',
  'حجز جلسات يمنع الأيام السابقة وتكرار الموعد',
  'نظام دفع واضح قابل للتطوير إلى بوابة إلكترونية',
  'لوحة إدارة للتحكم في النصوص، الصور، SEO، الحجز، الدفع، والمقالات',
]

const testimonials = [
  'خرجت من الجلسة وأنا أعرف السؤال الحقيقي الذي كنت أهرب منه.',
  'اللغة كانت قريبة وراقية. شعرت أنني أقرأ شيئًا يفتح لي بابًا ألطف.',
  'تنظيم الرحلة جعلني أعود للمحتوى بسهولة، بدون شعور بالضغط.',
]

export default function HomePage() {
  return (
    <>
      <Navbar />

      <main id="main-content" className="min-h-screen pt-20">
        <section className="container-premium relative grid min-h-[calc(100vh-5rem)] items-center gap-12 overflow-hidden py-16 lg:grid-cols-[1.04fr_0.96fr]">
          <div className="ambient-orb ambient-orb-gold right-0 top-16 h-64 w-64" />
          <div className="ambient-orb ambient-orb-petrol bottom-10 left-12 h-72 w-72" />

          <MotionReveal className="relative z-10">
            <PremiumBadge variant="petrol">منصة عربية راقية للنمو الشخصي</PremiumBadge>
            <h1 className="mt-7 text-balance text-5xl font-black leading-tight text-charcoal md:text-7xl">
              هذه ليست فكرة عابرة…
              <span className="mt-3 block text-charcoal">هذه رحلة تعيدكِ إلى ذاتك بهدوء واتزان</span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-10 text-warm-gray">
              من خلال جلسات الكوتشنج، الكورسات، والكتب العملية، ستجدين مساحة آمنة وعميقة لاتخاذ قرارات أوضح، وبناء حياة أكثر انسجامًا معك.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <PremiumButton href="/booking" size="lg">احجزي جلستك</PremiumButton>
              <PremiumButton href="/courses" size="lg" variant="outline">ابدئي رحلتك</PremiumButton>
              <PremiumButton href="/start-here" size="lg" variant="soft">اختاري المسار الأنسب</PremiumButton>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-4">
              <MiniMetric value="1:1" label="جلسات فردية عميقة" />
              <MiniMetric value="عربي" label="تجربة عربية هادئة" />
              <MiniMetric value="عن بُعد" label="خدمات من أي مكان" />
              <MiniMetric value="راقي" label="تجربة شخصية راقية" />
            </div>
          </MotionReveal>

          <MotionReveal delay={0.1} className="relative z-10">
            <div className="premium-glow-border premium-soft-motion luxury-shell rounded-[2.5rem] p-5">
              <div className="relative min-h-[540px] overflow-hidden rounded-[2rem] border border-sand">
                <ImageSlot
                  label="مكان صورة هبة الشريف"
                  hint="أضيفي لاحقًا صورة شخصية أو مشهد سينمائي هادئ بإضاءة طبيعية."
                  className="absolute inset-0 h-full w-full rounded-none border-0"
                />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_55%_28%,rgba(255,255,255,.68),transparent_12rem)]" />
                <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-petrol/22 to-transparent" />
                <div className="absolute bottom-8 right-8 left-8 rounded-[2rem] border border-white/50 bg-ivory/84 p-5 shadow-premium backdrop-blur-lg">
                  <p className="text-xs font-black text-petrol">ابدئي رحلتك</p>
                  <h2 className="mt-2 text-2xl font-black text-charcoal">كل إجابة تبحثين عنها تبدأ من لحظة صدق مع ذاتك.</h2>
                  <p className="mt-3 text-sm leading-7 text-warm-gray">
                    محتوى منظم، متابعة داخل حسابك، وحجز جلسات بسهولة وخصوصية.
                  </p>
                </div>
              </div>
            </div>
          </MotionReveal>
        </section>

        <section className="border-y border-sand bg-ivory/55">
          <div className="container-premium py-10">
            <TrustStrip />
          </div>
        </section>

        <section className="container-premium py-14">
          <PremiumSection
            eyebrow="ابدئي رحلتك"
            title="اختاري المسار الذي يناسب احتياجك الآن"
            description="يمكنك البدء من أي نقطة، وسنحافظ على نفس الهدوء والوضوح في كل خطوة."
          >
            <div className="grid gap-5 md:grid-cols-3">
              {journeys.map((journey, index) => (
                <MotionReveal key={journey.title} delay={index * 0.08}>
                  <Link
                    href={journey.href}
                    className="premium-glow-border interactive-lift group block rounded-[2rem] border border-sand bg-ivory/90 p-6 shadow-soft backdrop-blur-sm"
                  >
                    <div className="course-art mb-6 h-44 rounded-[1.5rem] border border-sand">
                      <div className="flex h-full items-end p-5">
                        <span className="latin-numerals rounded-full bg-white/60 px-4 py-2 text-xs font-black text-petrol backdrop-blur-md">
                          {index + 1} / {journey.label}
                        </span>
                      </div>
                    </div>
                    <h3 className="text-2xl font-black text-charcoal transition group-hover:text-petrol">{journey.title}</h3>
                    <p className="mt-3 text-sm leading-8 text-warm-gray">{journey.text}</p>
                    <span className="mt-6 inline-flex rounded-full bg-petrol px-5 py-2 text-xs font-black text-ivory transition group-hover:bg-gold group-hover:text-charcoal">
                      ابدئي من هنا
                    </span>
                  </Link>
                </MotionReveal>
              ))}
            </div>
          </PremiumSection>
        </section>

        <section className="container-premium pb-14">
          <PremiumAssessment />
        </section>

        <section className="relative overflow-hidden border-y border-sand bg-ivory/60">
          <div className="ambient-orb ambient-orb-gold left-12 top-8 h-56 w-56" />
          <div className="container-premium relative grid gap-10 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <MotionReveal>
              <div className="luxury-shell rounded-[2.5rem] p-7">
                <ImageSlot
                  label="مكان صورة هبة"
                  hint="صورة Portrait بإضاءة طبيعية، هادئة، ناضجة، وغير تجارية."
                  className="mb-5 min-h-[260px]"
                />
                <div className="rounded-[2rem] border border-sand bg-cream/70 p-7">
                  <p className="mini-label">من هي هبة</p>
                  <h2 className="mt-4 text-4xl font-black leading-tight text-charcoal">
                    مساحة آمنة لفهم النفس واستعادة الاتزان.
                  </h2>
                  <p className="mt-5 text-sm leading-9 text-warm-gray">
                    هبة الشريف لا تقدم وصفات جاهزة، بل تفتح مساحة واعية تساعدك على رؤية ما يحدث داخلك، فهم رسائل مشاعرك، واختيار خطوات صغيرة لكنها حقيقية نحو حياة أهدأ وأعمق.
                  </p>
                  <PremiumButton href="/about" variant="outline" className="mt-7">اعرفي أكثر عن هبة</PremiumButton>
                </div>
              </div>
            </MotionReveal>

            <div className="grid gap-4 sm:grid-cols-2">
              {transformations.map(([from, to], index) => (
                <MotionReveal key={from} delay={index * 0.05}>
                  <div className="rounded-[2rem] border border-sand bg-ivory/85 p-6 shadow-soft backdrop-blur-sm">
                    <p className="text-sm font-black text-warm-gray">{from}</p>
                    <p className="mt-3 text-2xl font-black text-petrol">{to}</p>
                  </div>
                </MotionReveal>
              ))}
            </div>
          </div>
        </section>

        <section className="container-premium py-16">
          <PremiumSection
            eyebrow="جلسات الكوتشنج"
            title="موعد هادئ ومهني يضعك على المسار الصحيح"
            description="الجلسات تتم بحجز مسبق، مع تحقق كامل من المواعيد وتأكيد واضح داخل حسابك."
          >
            <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
              <div className="rounded-[2rem] border border-sand bg-ivory/88 p-7 shadow-soft">
                <ul className="space-y-4 text-sm leading-8 text-warm-gray">
                  <li>لا يتم قبول مواعيد سابقة أو خارج أوقات العمل.</li>
                  <li>المواعيد المتاحة تظهر تلقائيًا حسب اليوم والمدة.</li>
                  <li>حالة الحجز تبدأ قيد المراجعة حتى التأكيد.</li>
                </ul>
                <PremiumButton href="/booking" className="mt-7">احجزي جلستك</PremiumButton>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <SessionPrice title="جلسة كوتشنج 60 دقيقة" price="1,200 ج.م" text="مناسبة لتشخيص واضح وخطوة عملية مباشرة." />
                <SessionPrice title="جلسة كوتشنج 90 دقيقة" price="1,500 ج.م" text="مناسبة للمناقشات الأعمق وخطة أكثر تفصيلًا." />
              </div>
            </div>
          </PremiumSection>
        </section>

        <section className="container-premium py-16">
          <PremiumSection
            eyebrow="نظام تشغيل هادئ"
            title="ليس موقعًا فقط. منصة كاملة لإدارة التجربة."
            description="كل جزء في المنصة مبني ليخدم الثقة، الوضوح، وسهولة الإدارة بدون تعقيد."
          >
            <div className="grid gap-4 md:grid-cols-5">
              {operatingSystem.map((item, index) => (
                <MotionReveal key={item} delay={index * 0.04}>
                  <div className="h-full rounded-[1.75rem] border border-sand bg-cream/65 p-5 shadow-soft">
                    <span className="latin-numerals text-xs font-black text-gold">{String(index + 1).padStart(2, '0')}</span>
                    <p className="mt-3 text-sm font-black leading-7 text-charcoal">{item}</p>
                  </div>
                </MotionReveal>
              ))}
            </div>
          </PremiumSection>
        </section>

        <section className="border-y border-sand bg-ivory/55">
          <div className="container-premium py-16">
            <PremiumSection
              eyebrow="الثقة"
              title="كل خطوة في المنصة مصممة لتمنحك راحة ووضوحًا"
              description="هذا القسم مخصص لرسائل الثقة الرسمية حتى إضافة تجارب موثقة من عميلات حقيقيات لاحقًا."
            >
              <div className="grid gap-4 md:grid-cols-3">
                {testimonials.map((text, index) => (
                  <MotionReveal key={text} delay={index * 0.06}>
                    <article className="rounded-[2rem] border border-sand bg-ivory/85 p-6 shadow-soft">
                      <p className="text-sm leading-8 text-warm-gray">“{text}”</p>
                      <p className="mt-5 text-xs font-black text-petrol">تجربة موثقة قريبًا</p>
                    </article>
                  </MotionReveal>
                ))}
              </div>
            </PremiumSection>
          </div>
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
              <h2 className="text-3xl font-black leading-tight md:text-5xl">
                رحلتكِ لا تحتاج ضجيجًا... تحتاج بداية واضحة الآن.
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-sm leading-8 text-ivory/78">
                اختاري ما يناسبك اليوم: جلسة فردية، كورس عملي، أو كتاب يساعدك على فهم أعمق لنفسك. المهم أن تبدأي بخطوة حقيقية.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <PremiumButton href="/booking" variant="gold">احجزي جلستك</PremiumButton>
                <PremiumButton href="/start-here" variant="outline" className="border-ivory text-ivory hover:bg-ivory hover:text-petrol">
                  اختاري المسار الأنسب
                </PremiumButton>
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
    <div className="rounded-[1.4rem] border border-sand bg-ivory/78 px-4 py-3 shadow-soft backdrop-blur-sm">
      <strong className="latin-numerals block text-xl font-black text-petrol">{value}</strong>
      <span className="mt-1 block text-xs font-bold leading-5 text-warm-gray">{label}</span>
    </div>
  )
}

function SessionPrice({ title, price, text }: { title: string; price: string; text: string }) {
  return (
    <div className="rounded-[2rem] border border-sand bg-cream/65 p-6 shadow-soft">
      <h3 className="text-xl font-black text-charcoal">{title}</h3>
      <strong className="latin-numerals mt-4 block text-3xl font-black text-petrol">{price}</strong>
      <p className="mt-3 text-sm leading-7 text-warm-gray">{text}</p>
    </div>
  )
}
