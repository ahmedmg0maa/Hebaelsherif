export const dynamic = 'force-dynamic'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import BrandDivider from '@/components/brand/BrandDivider'
import BrandMark from '@/components/brand/BrandMark'
import BrandOrnament from '@/components/brand/BrandOrnament'
import MotionReveal from '@/components/experience/MotionReveal'
import PremiumButton from '@/components/ui/PremiumButton'
import PremiumBadge from '@/components/ui/PremiumBadge'
import PremiumSection from '@/components/ui/PremiumSection'
import PremiumEmptyState from '@/components/ui/PremiumEmptyState'
import ImageSlot from '@/components/ui/ImageSlot'
import FAQSection from '@/components/marketing/FAQSection'
import LeadMagnet from '@/components/marketing/LeadMagnet'
import PremiumAssessment from '@/components/marketing/PremiumAssessment'

const trustStats = [
  { value: '1:1', label: 'جلسات فردية بخصوصية وهدوء' },
  { value: 'وعي', label: 'لغة تساعدك على فهم ذاتك' },
  { value: 'آمن', label: 'محتوى يفتح بعد التأكيد فقط' },
  { value: 'هادئ', label: 'تجربة بلا ضغط أو استعجال' },
]

const pathCards = [
  {
    title: 'ابدئي بجلسة فردية',
    text: 'لو لديك سؤال محدد، علاقة مرهقة، أو قرار يحتاج مساحة تفكير آمنة.',
    href: '/booking',
    cta: 'احجزي الآن',
    icon: '✦',
  },
  {
    title: 'اختاري مسار تعلم',
    text: 'لو تريدين رحلة منظمة تتعلمين فيها على مهل وتعودين لها داخل حسابك.',
    href: '/courses',
    cta: 'تصفحي المسارات',
    icon: '☉',
  },
  {
    title: 'افتحي باب القراءة',
    text: 'لو تحتاجين رفيقًا هادئًا للقراءة والتأمل والكتابة في وقتك الخاص.',
    href: '/books',
    cta: 'شاهدي المكتبة',
    icon: '❋',
  },
]

const transformationCards = [
  { from: 'ضجيج داخلي', to: 'لغة أوضح لما تشعرين به' },
  { from: 'استنزاف في العلاقات', to: 'حدود أكثر رحمة واتزانًا' },
  { from: 'خوف من البداية', to: 'خطوة صغيرة قابلة للتنفيذ' },
  { from: 'تشتت في الاختيار', to: 'مسار يناسب مرحلتك الحالية' },
]

const promiseNotes = [
  'مساحة تحترم خصوصيتك ووتيرتك، ولا تستخدم ضغطًا أو وعودًا علاجية.',
  'كل تجربة تُعرض للزائرة عندما تكون جاهزة للنشر والتشغيل.',
  'الأولوية للوضوح، الأمان، وخطوة عملية صغيرة تشبهك.',
]

export default function HomePage() {
  return (
    <>
      <Navbar />

      <main id="main-content" className="min-h-screen pt-20">
        <section className="container-wide px-2 pb-4 pt-4 sm:px-0">
          <div className="premium-glow-border botanical-frame paper-texture relative overflow-hidden rounded-[2rem] border border-sand bg-ivory/88 shadow-premium lg:rounded-[2.75rem] dark:bg-deep-teal/70">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_12%,rgb(var(--color-gold)/.18),transparent_22rem),radial-gradient(circle_at_15%_12%,rgb(var(--color-petrol)/.12),transparent_22rem)]" />
            <div className="ambient-orb ambient-orb-gold right-4 top-10 h-64 w-64" />
            <div className="ambient-orb ambient-orb-petrol bottom-4 left-10 h-80 w-80" />
            <div className="relative grid min-h-[620px] items-center gap-8 p-5 md:p-8 lg:grid-cols-[0.92fr_1.08fr] lg:p-10 xl:p-14">
              <MotionReveal className="order-2 lg:order-1">
                <div className="relative">
                  <div className="absolute -right-4 top-8 hidden h-[420px] w-[420px] rounded-full border border-gold/35 lg:block" />
                  <div className="relative overflow-hidden rounded-[2.4rem] border border-sand bg-cream/70 p-4 shadow-botanical dark:bg-deep-teal/50">
                    <ImageSlot
                      variant="hero"
                      ratio="free"
                      label="رحلة وعي"
                      hint="تكوين بصري من هوية هبة الشريف"
                      className="min-h-[390px] rounded-[2rem]"
                      showLabel={false}
                    />
                    <div className="absolute inset-4 rounded-[2rem] bg-[linear-gradient(90deg,rgb(var(--color-cream)/.12),transparent_36%,rgb(var(--color-ivory)/.32))]" />
                    <div className="absolute bottom-8 left-8 right-8 rounded-[1.8rem] border border-gold/20 bg-ivory/88 p-5 shadow-soft backdrop-blur-xl dark:bg-deep-teal/90">
                      <div className="flex items-center gap-3">
                        <BrandOrnament className="scale-75" />
                        <span className="mini-label">نقطة وعي</span>
                      </div>
                      <h2 className="mt-3 text-2xl font-black leading-tight text-petrol dark:text-ivory">مساحة هادئة لاكتشاف رسالتك، واختيار طريقك بوعي.</h2>
                    </div>
                  </div>
                </div>
              </MotionReveal>

              <MotionReveal delay={0.08} className="order-1 lg:order-2">
                <div className="mx-auto max-w-3xl text-center lg:mx-0 lg:text-right">
                  <div className="mx-auto mb-6 flex justify-center lg:mx-0 lg:justify-start">
                    <BrandMark size="lg" showText={false} />
                  </div>
                  <PremiumBadge variant="gold">رحلة وعي تعيدك إلى ذاتك</PremiumBadge>
                  <h1 className="mt-6 text-balance text-5xl font-black leading-[1.25] text-charcoal md:text-7xl">
                    افهمي نفسك بهدوء
                    <span className="mt-2 block text-petrol dark:text-gold">واختاري طريقك بوعي</span>
                  </h1>
                  <p className="mx-auto mt-6 max-w-2xl text-base leading-9 text-warm-gray md:text-lg lg:mx-0">
                    مع هبة الشريف، تتحول الأسئلة الداخلية إلى خطوات أهدأ: جلسات فردية، مسارات تعلم، وقراءة واعية تحترم مرحلتك وحدودك.
                  </p>
                  <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
                    <PremiumButton href="/start-here" size="lg" className="mobile-full-cta">ابدئي من هنا</PremiumButton>
                    <PremiumButton href="/booking" size="lg" variant="outline" className="mobile-full-cta">احجزي جلسة</PremiumButton>
                  </div>

                  <div className="mt-10 grid gap-3 rounded-[1.75rem] border border-sand bg-ivory/80 p-3 shadow-soft backdrop-blur md:grid-cols-4 dark:bg-deep-teal/60">
                    {trustStats.map((stat) => (
                      <div key={stat.label} className="border-sand px-4 py-3 text-center md:border-l last:md:border-l-0">
                        <strong className="latin-numerals block text-2xl font-black text-petrol dark:text-gold">{stat.value}</strong>
                        <span className="mt-1 block text-xs font-bold leading-5 text-warm-gray">{stat.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </MotionReveal>
            </div>
          </div>
        </section>

        <section className="container-wide grid gap-4 px-2 pb-5 sm:px-0 lg:grid-cols-[1fr_1fr_1fr]">
          <HomePanel title="المسارات" href="/courses" action="استكشفي المسارات">
            <PremiumEmptyState
              icon="✦"
              title="قريبًا: مسارات وعي جديدة"
              description="نجهّز رحلات تعليمية هادئة تساعدك على الفهم والتطبيق بخطوات واضحة. يمكنكِ ترك اهتمامك ليصلكِ الإطلاق أولًا."
              actionLabel="انضمي لقائمة الاهتمام"
              actionHref="/courses"
            />
          </HomePanel>

          <HomePanel title="المكتبة" href="/books" action="زيارة المكتبة">
            <PremiumEmptyState
              icon="❋"
              title="مكتبة هبة قيد التحضير"
              description="إصدارات رقمية مختارة بعناية للقراءة والتأمل ستتوفر بتجربة هادئة ومنظمة."
              actionLabel="أخبريني عند الإطلاق"
              actionHref="/books"
            />
          </HomePanel>

          <HomePanel title="الجلسات" href="/booking" action="حجز جلسة">
            <div className="grid gap-4 md:grid-cols-[0.95fr_1.05fr] lg:grid-cols-1 xl:grid-cols-[0.9fr_1.1fr]">
              <ImageSlot
                variant="session"
                ratio="free"
                label="جلسة هادئة"
                hint="مساحة بصرية من هوية الجلسات"
                className="min-h-[250px] rounded-[1.75rem]"
                showLabel={false}
              />
              <div className="rounded-[1.75rem] border border-sand bg-cream/70 p-6 dark:bg-deep-teal/45">
                <p className="mini-label">جلسات فردية</p>
                <h3 className="mt-4 text-2xl font-black text-charcoal">جلسة خاصة 1:1 مع هبة الشريف</h3>
                <p className="mt-4 text-sm leading-8 text-warm-gray">مساحة آمنة لفهم سؤال محدد، علاقة مرهقة، أو قرار يحتاج وعيًا وهدوءًا.</p>
                <ul className="mt-5 space-y-2 text-sm font-bold text-warm-gray">
                  <li>✓ اختيار موعد واضح بدون تكرار</li>
                  <li>✓ طلب بانتظار التأكيد من الإدارة</li>
                  <li>✓ متابعة الحالة داخل حسابك</li>
                </ul>
                <PremiumButton href="/booking" variant="burgundy" className="mt-6 w-full">احجزي جلستك الآن</PremiumButton>
              </div>
            </div>
          </HomePanel>
        </section>

        <section className="container-premium py-14">
          <PremiumSection
            eyebrow="اختاري مسارك"
            title="ثلاثة أبواب هادئة تقودك إلى بداية مناسبة"
            description="لا تحتاجين أن تبدئي من كل شيء. اختاري أقرب مسار لاحتياجك الآن، ثم اتركي التجربة تقودك خطوة بخطوة."
            align="center"
            showDivider
          >
            <div className="grid gap-5 md:grid-cols-3">
              {pathCards.map((path, index) => (
                <MotionReveal key={path.title} delay={index * 0.06}>
                  <Link href={path.href} className="group block h-full rounded-[2rem] border border-sand bg-ivory/90 p-6 shadow-soft transition duration-300 hover:-translate-y-1 hover:border-gold/40 hover:shadow-premium dark:bg-deep-teal/55">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full border border-gold/25 bg-gold/10 text-2xl text-petrol dark:text-gold">{path.icon}</span>
                    <h3 className="mt-6 text-2xl font-black text-charcoal transition group-hover:text-petrol">{path.title}</h3>
                    <p className="mt-3 text-sm leading-8 text-warm-gray">{path.text}</p>
                    <span className="mt-6 inline-flex rounded-full bg-petrol px-5 py-2 text-xs font-black text-ivory transition group-hover:bg-gold group-hover:text-deep-teal">{path.cta}</span>
                  </Link>
                </MotionReveal>
              ))}
            </div>
          </PremiumSection>
        </section>

        <section className="brand-quiet-divider border-y border-sand bg-ivory/58 dark:bg-deep-teal/30">
          <div className="container-premium grid gap-10 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <MotionReveal>
              <div className="luxury-shell rounded-[2.5rem] p-6">
                <ImageSlot
                  variant="portrait"
                  ratio="portrait"
                  label="هبة الشريف"
                  hint="هوية بصرية هادئة"
                  className="mx-auto max-w-sm"
                />
              </div>
            </MotionReveal>

            <MotionReveal delay={0.08}>
              <p className="mini-label">مرحبًا، أنا هبة الشريف</p>
              <h2 className="mt-5 text-balance text-4xl font-black leading-tight text-charcoal md:text-6xl">مدربة حياة وكاتبة ترافقك نحو وعي أعمق بذاتك.</h2>
              <p className="mt-6 max-w-2xl text-base leading-10 text-warm-gray">
                أؤمن أن التغيير الحقيقي لا يبدأ بالضغط على النفس، بل بفهمها. هنا تجدين لغة هادئة، أدوات عملية، ومسارات تراعي إنسانيتك وخصوصيتك.
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <IdentityPill title="نقطة وعي" text="رمز الوعي والبصيرة" />
                <IdentityPill title="رحلة آمنة" text="وتيرة تحترم مرحلتك" />
                <IdentityPill title="عمق عملي" text="تطبيق لا شعارات" />
              </div>
              <PremiumButton href="/about" variant="outline" className="mt-8">تعرفي على قصتي</PremiumButton>
            </MotionReveal>
          </div>
        </section>

        <section className="container-premium py-16">
          <PremiumSection
            eyebrow="ما الذي يتغير؟"
            title="ليست وعودًا سريعة، بل انتقالات صغيرة تشعرين بها"
            description="كل جلسة وكتاب وكورس مصمم ليساعدك على رؤية خطوة واحدة أوضح بدل حمل الطريق كله مرة واحدة."
          >
            <div className="grid gap-4 md:grid-cols-4">
              {transformationCards.map((item, index) => (
                <MotionReveal key={item.from} delay={index * 0.05}>
                  <div className="brand-rich-card h-full rounded-[2rem] p-6">
                    <span className="latin-numerals text-xs font-black text-gold">0{index + 1}</span>
                    <p className="mt-5 text-sm font-black text-warm-gray">من: {item.from}</p>
                    <p className="mt-3 text-xl font-black leading-8 text-petrol dark:text-gold">إلى: {item.to}</p>
                  </div>
                </MotionReveal>
              ))}
            </div>
          </PremiumSection>
        </section>

        <section className="container-premium pb-16">
          <PremiumAssessment />
        </section>

        <section className="brand-quiet-divider border-y border-sand bg-ivory/58 dark:bg-deep-teal/30">
          <div className="container-premium grid gap-6 py-16 lg:grid-cols-[1fr_0.85fr]">
            <div className="brand-rich-card rounded-[2.4rem] p-7">
              <p className="mini-label">قصص وتجارب</p>
              <div className="mt-6 rounded-[2rem] border border-sand bg-cream/70 p-7 dark:bg-deep-teal/45">
                <BrandOrnament className="mb-5" />
                <h2 className="text-2xl font-black text-charcoal">تجارب حقيقية عند توفرها.</h2>
                <p className="mt-4 text-sm leading-8 text-warm-gray">
                  عندما تُشارك عميلة تجربتها بإذن واضح، ستظهر هنا كقصة موثوقة تساعد غيرها على فهم الطريق قبل البدء.
                </p>
              </div>
              <PremiumButton href="/booking" variant="outline" className="mt-5">ابدئي بتجربة خاصة</PremiumButton>
            </div>

            <div className="grid gap-4">
              {promiseNotes.map((note) => (
                <div key={note} className="rounded-[2rem] border border-sand bg-ivory/88 p-6 shadow-soft dark:bg-deep-teal/55">
                  <BrandDivider className="mb-4 justify-start" />
                  <p className="text-sm font-black leading-8 text-charcoal">{note}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="container-premium py-16">
          <FAQSection />
        </section>

        <section className="container-premium pb-16">
          <LeadMagnet />
        </section>

        <section className="container-wide px-2 pb-8 sm:px-0">
          <div className="premium-glow-border relative overflow-hidden rounded-[2.5rem] border border-sand bg-petrol p-8 text-center text-ivory shadow-premium md:p-12">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgb(245_240_231/.14),transparent_52%),radial-gradient(circle_at_10%_80%,rgb(var(--color-gold)/.18),transparent_20rem)]" />
            <div className="relative mx-auto max-w-4xl">
              <BrandOrnament className="mx-auto mb-5 text-gold" />
              <h2 className="text-3xl font-black leading-tight md:text-5xl">جاهزة لبدء رحلة أوضح؟</h2>
              <p className="mx-auto mt-5 max-w-2xl text-sm leading-8 text-ivory/78">ابدئي بخطوة صغيرة: دليل البداية، جلسة خاصة، أو متابعة المسارات والكتب عند نشرها.</p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <PremiumButton href="/start-here" variant="gold">ابدئي من هنا</PremiumButton>
                <PremiumButton href="/booking" variant="outline" className="border-ivory text-ivory hover:bg-ivory hover:text-petrol">احجزي جلستك الخاصة</PremiumButton>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}

function HomePanel({ title, href, action, children }: { title: string; href: string; action: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-sand bg-ivory/86 p-4 shadow-soft backdrop-blur-sm dark:bg-deep-teal/55">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-xl font-black text-charcoal">{title}</h2>
        <Link href={href} className="text-xs font-black text-burgundy transition hover:text-petrol">{action} ←</Link>
      </div>
      {children}
    </section>
  )
}

function IdentityPill({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[1.5rem] border border-sand bg-ivory/80 p-4 shadow-soft dark:bg-deep-teal/45">
      <h3 className="text-sm font-black text-petrol dark:text-gold">{title}</h3>
      <p className="mt-2 text-xs font-bold leading-6 text-warm-gray">{text}</p>
    </div>
  )
}
