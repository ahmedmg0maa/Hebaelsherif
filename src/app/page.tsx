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
  'تشعرين أن داخلك مزدحم لكنك لا تعرفين من أين تبدئين.',
  'تتكرر أنماط في علاقاتك وتحتاجين فهمًا لا حكمًا.',
  'تريدين مساحة عربية راقية لا تبيع لك وعودًا سريعة.',
  'تحتاجين طريقة منظمة تجمع بين التعلم، القراءة، والجلسات.',
]

const journeys = [
  {
    title: 'رحلة إلى الذات',
    label: 'دورات تعليمية',
    text: 'مسارات منظمة لفهم الأنماط، بناء الحدود، واستعادة الوضوح الداخلي.',
    href: '/courses',
  },
  {
    title: 'قراءة هادئة',
    label: 'كتب رقمية',
    text: 'كتب قصيرة وعميقة تمنحك لغة، تأملًا، ومرافقة هادئة في وقتك الخاص.',
    href: '/books',
  },
  {
    title: 'جلسة خاصة',
    label: '1:1 Coaching',
    text: 'مساحة شخصية لتفكيك سؤال أو علاقة أو مرحلة عالقة بوضوح ورفق.',
    href: '/booking',
  },
]

const transformations = [
  ['من التشتت', 'إلى وضوح داخلي'],
  ['من جلد الذات', 'إلى تعاطف واعي'],
  ['من العلاقات المرهقة', 'إلى حدود صحية'],
  ['من الانتظار', 'إلى اختيار نفسك'],
]

const operatingSystem = [
  'محتوى مدفوع محمي داخل الحساب',
  'لوحة رحلة تحفظ الدورات والكتب والجلسات',
  'حجز جلسات بدون تكرار المواعيد أو اختيار أيام سابقة',
  'نظام دفع يدوي منظم وقابل للتطوير إلى بوابة إلكترونية',
  'لوحة إدارة واسعة للتحكم في النصوص، الصور، SEO، الحجز، الدفع، المقالات، والكوبونات',
]

const testimonials = [
  'لأول مرة أحس إن المحتوى فاهمني من غير ما يحكم عليّ.',
  'الجلسة خلتني أشوف نمط كنت بكرره من سنين بشكل أوضح.',
  'التصميم هادي والمحتوى مرتب، حسيت إني في مساحة آمنة فعلًا.',
]

export default function HomePage() {
  return (
    <>
      <Navbar />

      <main id="main-content" className="min-h-screen pt-20">
        <section className="container-premium relative grid min-h-[calc(100vh-5rem)] items-center gap-12 overflow-hidden py-16 lg:grid-cols-[1.04fr_0.96fr]">
          <div className="ambient-orb ambient-orb-rose right-0 top-16 h-64 w-64" />
          <div className="ambient-orb ambient-orb-gold bottom-10 left-12 h-72 w-72" />

          <MotionReveal className="relative z-10">
            <PremiumBadge variant="burgundy">{brandConfig.type}</PremiumBadge>
            <h1 className="mt-7 text-balance text-5xl font-black leading-tight text-charcoal md:text-7xl">
              مساحة هادئة لتفهمي نفسك
              <span className="mt-2 block aurora-text">وتختاري طريقك بوعي</span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-10 text-warm-gray">
              {brandConfig.promise} هنا لا توجد ضوضاء ولا استعجال. فقط رحلة واضحة، ناعمة، وعميقة.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <PremiumButton href="/start-here" size="lg">ابدئي من هنا</PremiumButton>
              <PremiumButton href="/booking" size="lg" variant="outline">احجزي جلسة هادئة</PremiumButton>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              <MiniMetric value="Sage" label="إرشاد ووضوح" />
              <MiniMetric value="Care" label="أمان ودفء" />
              <MiniMetric value="Private" label="محتوى محمي" />
            </div>

            <div className="mt-8">
              <TrustStrip />
            </div>
          </MotionReveal>

          <MotionReveal delay={0.1} className="relative z-10">
            <div className="premium-glow-border premium-soft-motion luxury-shell rounded-[2.5rem] p-5">
              <div className="relative min-h-[540px] overflow-hidden rounded-[2rem] border border-sand">
                <ImageSlot
                  label="مكان صورة Hero الرئيسية"
                  hint="أضيفي لاحقًا صورة هبة أو مشهد سينمائي هادئ بإضاءة طبيعية."
                  className="absolute inset-0 h-full w-full rounded-none border-0"
                />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_55%_28%,rgba(255,255,255,.72),transparent_12rem)]" />
                <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-burgundy/25 to-transparent" />
                <div className="absolute right-8 top-8 rounded-full border border-white/60 bg-white/45 px-4 py-2 text-xs font-black text-burgundy backdrop-blur-md">
                  Luxury emotional learning
                </div>
                <div className="absolute bottom-8 right-8 left-8 rounded-[2rem] border border-white/50 bg-ivory/82 p-5 shadow-premium backdrop-blur-lg">
                  <p className="text-xs font-black text-burgundy">رحلة إلى الذات</p>
                  <h2 className="mt-2 text-2xl font-black text-charcoal">ابدئي بخطوة واحدة واضحة</h2>
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
            <div className="grid gap-4 md:grid-cols-4">
              {painPoints.map((item, index) => (
                <MotionReveal key={item} delay={index * 0.06}>
                  <div className="interactive-lift rounded-[1.75rem] border border-sand bg-ivory/80 p-5 shadow-soft backdrop-blur-sm">
                    <p className="text-xs font-black text-gold">{index + 1}</p>
                    <p className="mt-3 text-sm font-bold leading-8 text-charcoal">{item}</p>
                  </div>
                </MotionReveal>
              ))}
            </div>
          </div>
        </section>

        <section className="container-premium py-16">
          <PremiumAssessment />
        </section>

        <section className="container-premium py-16">
          <PremiumSection
            eyebrow="اختاري مسارك"
            title="كل مسار مصمم لمرحلة مختلفة من رحلتك"
            description="يمكنك البدء بدورة، كتاب، أو جلسة خاصة حسب السؤال الأقرب لقلبك الآن."
          >
            <div className="grid gap-5 md:grid-cols-3">
              {journeys.map((journey, index) => (
                <MotionReveal key={journey.title} delay={index * 0.08}>
                  <Link
                    href={journey.href}
                    className="premium-glow-border interactive-lift group block rounded-[2rem] border border-sand bg-ivory/90 p-6 shadow-soft backdrop-blur-sm"
                  >
                    <div className="course-art mb-6 h-52 rounded-[1.5rem] border border-sand">
                      <div className="flex h-full items-end p-5">
                        <span className="rounded-full bg-white/60 px-4 py-2 text-xs font-black text-burgundy backdrop-blur-md">
                          {index + 1} / {journey.label}
                        </span>
                      </div>
                    </div>
                    <h3 className="text-2xl font-black text-charcoal transition group-hover:text-burgundy">{journey.title}</h3>
                    <p className="mt-3 text-sm leading-8 text-warm-gray">{journey.text}</p>
                    <span className="mt-6 inline-flex rounded-full bg-burgundy px-5 py-2 text-xs font-black text-ivory transition group-hover:bg-gold">
                      ابدئي من هنا
                    </span>
                  </Link>
                </MotionReveal>
              ))}
            </div>
          </PremiumSection>
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
                  <p className="mini-label">عن هبة الشريف</p>
                  <h2 className="mt-4 text-4xl font-black leading-tight text-charcoal">
                    ليست رحلة لتغييرك، بل لتعودي إلى نفسك بوعي ألطف.
                  </h2>
                  <p className="mt-5 text-sm leading-9 text-warm-gray">
                    المنصة مبنية لتجمع بين العمق العاطفي والتنظيم العملي: محتوى تتعلمين منه، كتب ترافقك، وجلسات تمنحك وضوحًا شخصيًا عند الحاجة.
                  </p>
                  <PremiumButton href="/about" variant="outline" className="mt-7">اعرفي أكثر</PremiumButton>
                </div>
              </div>
            </MotionReveal>

            <div className="grid gap-4 sm:grid-cols-2">
              {transformations.map(([from, to], index) => (
                <MotionReveal key={from} delay={index * 0.05}>
                  <div className="rounded-[2rem] border border-sand bg-ivory/85 p-6 shadow-soft backdrop-blur-sm">
                    <p className="text-sm font-black text-warm-gray">{from}</p>
                    <p className="mt-3 text-2xl font-black text-burgundy">{to}</p>
                  </div>
                </MotionReveal>
              ))}
            </div>
          </div>
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
                    <p className="text-xs font-black text-gold">0{index + 1}</p>
                    <p className="mt-3 text-sm font-bold leading-8 text-charcoal">{item}</p>
                  </div>
                </MotionReveal>
              ))}
            </div>
          </PremiumSection>
        </section>

        <section className="container-premium py-16">
          <PremiumSection
            eyebrow="ماذا ستشعرين؟"
            title="تجربة هادئة تشبهك"
            description="مشاهد الثقة في المنصة لا تأتي من الألوان فقط، بل من رحلة واضحة من أول زيارة حتى فتح المحتوى المدفوع."
            align="center"
          >
            <div className="grid gap-5 md:grid-cols-3">
              {testimonials.map((item, index) => (
                <MotionReveal key={item} delay={index * 0.08}>
                  <div className="rounded-[2rem] border border-sand bg-ivory/90 p-6 text-center shadow-soft backdrop-blur-sm">
                    <ImageSlot label="Avatar" hint="صورة تقييم لاحقًا" className="mx-auto mb-5 h-20 w-20 rounded-full" />
                    <p className="text-3xl text-gold">“</p>
                    <p className="mt-2 text-sm leading-8 text-charcoal">{item}</p>
                  </div>
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
          <div className="premium-glow-border relative overflow-hidden rounded-[2.5rem] border border-sand bg-burgundy p-8 text-center text-ivory shadow-premium md:p-12">
            <div className="ambient-orb ambient-orb-gold right-20 top-10 h-40 w-40" />
            <div className="relative">
              <p className="mb-3 text-xs font-black tracking-[0.25em] text-gold">ابدئي بهدوء</p>
              <h2 className="text-balance text-3xl font-black leading-tight md:text-5xl">
                لا تحتاجين أن تعرفي كل الطريق الآن
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-sm leading-8 text-ivory/75">
                فقط اختاري المسار الأقرب لمرحلتك، ودعي المنصة تنظم لكِ التعلم، القراءة، والحجز.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <PremiumButton href="/start-here" variant="gold">اختاري مسارك</PremiumButton>
                <PremiumButton href="/booking" variant="outline" className="border-ivory text-ivory hover:bg-ivory hover:text-burgundy">
                  احجزي جلسة
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
    <div className="rounded-3xl border border-sand bg-ivory/70 p-4 shadow-soft backdrop-blur-sm">
      <strong className="block text-2xl font-black text-burgundy">{value}</strong>
      <span className="mt-1 block text-xs font-bold text-warm-gray">{label}</span>
    </div>
  )
}
