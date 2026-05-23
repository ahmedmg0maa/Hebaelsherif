import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import PremiumButton from '@/components/ui/PremiumButton'
import PremiumBadge from '@/components/ui/PremiumBadge'
import PremiumSection from '@/components/ui/PremiumSection'
import FAQSection from '@/components/marketing/FAQSection'
import LeadMagnet from '@/components/marketing/LeadMagnet'
import TrustStrip from '@/components/marketing/TrustStrip'

const pillars = [
  { title: 'تجربة رقمية آمنة', text: 'كل رحلة لها حسابها، تقدمها، طلباتها، ومحتواها المحمي.' },
  { title: 'محتوى عميق وعملي', text: 'دورات وكتب مصممة بوضوح، لا وعود سريعة ولا كلام عام.' },
  { title: 'خصوصية واحترام', text: 'مساحة هادئة تحترم مشاعرك وحدودك وسرعة نموك.' },
  { title: 'دعم ومتابعة', text: 'جلسات فردية ومسار واضح يربط بين التعلم والتطبيق.' },
]

const journeys = [
  {
    title: 'رحلة إلى الذات',
    label: 'دورة رئيسية',
    text: 'فهم أعمق لاحتياجاتك، حدودك، وأنماطك العاطفية.',
    href: '/courses',
  },
  {
    title: 'قراءة هادئة',
    label: 'كتب رقمية',
    text: 'كتب قصيرة وعميقة ترافقك في مساحة تأمل وفهم.',
    href: '/books',
  },
  {
    title: 'جلسة خاصة',
    label: '1:1 Coaching',
    text: 'مساحة شخصية لتفكيك سؤال أو علاقة أو مرحلة عالقة.',
    href: '/booking',
  },
]

const transformations = [
  ['من التشتت', 'إلى وضوح داخلي'],
  ['من جلد الذات', 'إلى تعاطف واعي'],
  ['من العلاقات المرهقة', 'إلى حدود صحية'],
  ['من الانتظار', 'إلى اختيار نفسك'],
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

      <main className="min-h-screen pt-20">
        <section className="container-premium relative grid min-h-[calc(100vh-5rem)] items-center gap-12 overflow-hidden py-16 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="ambient-orb ambient-orb-rose right-0 top-16 h-64 w-64" />
          <div className="ambient-orb ambient-orb-gold bottom-10 left-12 h-72 w-72" />

          <div className="relative z-10">
            <PremiumBadge variant="burgundy">منصة عربية للتحول العاطفي</PremiumBadge>
            <h1 className="mt-7 text-balance text-5xl font-black leading-tight text-charcoal md:text-7xl">
              رحلتك نحو حياة أكثر
              <span className="mt-2 block text-burgundy">سلامًا ووعيًا وامتلاءً</span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-10 text-warm-gray">
              دورات، كتب رقمية، وجلسات خاصة تساعدك على فهم نفسك، بناء حدود صحية،
              واستعادة علاقتك بذاتك في تجربة فاخرة وهادئة ومحمية.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <PremiumButton href="/courses" size="lg">استكشفي الدورات</PremiumButton>
              <PremiumButton href="/booking" size="lg" variant="outline">احجزي جلستك الآن</PremiumButton>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              <MiniMetric value="1:1" label="جلسات فردية" />
              <MiniMetric value="Arabic" label="تجربة عربية أصيلة" />
              <MiniMetric value="Private" label="محتوى محمي" />
            </div>

            <div className="mt-8">
              <TrustStrip />
            </div>
          </div>

          <div className="relative z-10">
            <div className="premium-glow-border premium-soft-motion luxury-shell rounded-[2.5rem] p-5">
              <div className="hero-art relative min-h-[520px] overflow-hidden rounded-[2rem] border border-sand">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_55%_28%,rgba(255,255,255,.72),transparent_12rem)]" />
                <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-burgundy/25 to-transparent" />
                <div className="absolute right-8 top-8 rounded-full border border-white/60 bg-white/45 px-4 py-2 text-xs font-black text-burgundy backdrop-blur-md">
                  مساحة هادئة للنمو
                </div>
                <div className="absolute bottom-8 right-8 left-8 rounded-[2rem] border border-white/50 bg-ivory/75 p-5 shadow-premium backdrop-blur-lg">
                  <p className="text-xs font-black text-burgundy">رحلة إلى الذات</p>
                  <h2 className="mt-2 text-2xl font-black text-charcoal">ابدئي بخطوة واحدة واضحة</h2>
                  <p className="mt-3 text-sm leading-7 text-warm-gray">
                    محتوى منظم، متابعة داخل حسابك، وحجز جلسات بسهولة.
                  </p>
                </div>
                <div className="absolute left-10 top-20 h-56 w-40 rounded-t-full bg-[linear-gradient(180deg,rgba(141,61,93,.26),rgba(255,255,255,.12))] shadow-[0_34px_80px_rgba(141,61,93,.16)]" />
                <div className="absolute left-16 top-52 h-44 w-28 rounded-full bg-[linear-gradient(180deg,rgba(255,250,246,.55),rgba(198,154,105,.22))] blur-sm" />
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-sand bg-ivory/55">
          <div className="container-premium py-10">
            <div className="grid gap-4 md:grid-cols-4">
              {pillars.map((pillar) => (
                <div key={pillar.title} className="rounded-[1.75rem] border border-sand bg-ivory/80 p-5 shadow-soft backdrop-blur-sm">
                  <h3 className="text-base font-black text-charcoal">{pillar.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-warm-gray">{pillar.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="container-premium py-16">
          <PremiumSection
            eyebrow="اختاري مسارك"
            title="كل مسار مصمم لمرحلة مختلفة من رحلتك"
            description="يمكنك البدء بدورة، كتاب، أو جلسة خاصة حسب السؤال الأقرب لقلبك الآن."
          >
            <div className="grid gap-5 md:grid-cols-3">
              {journeys.map((journey, index) => (
                <Link
                  href={journey.href}
                  key={journey.title}
                  className="premium-glow-border group rounded-[2rem] border border-sand bg-ivory/90 p-6 shadow-soft backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:shadow-premium"
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
              ))}
            </div>
          </PremiumSection>
        </section>

        <section className="relative overflow-hidden border-y border-sand bg-ivory/60">
          <div className="ambient-orb ambient-orb-gold left-12 top-8 h-56 w-56" />
          <div className="container-premium relative grid gap-10 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div className="luxury-shell rounded-[2.5rem] p-7">
              <div className="rounded-[2rem] border border-sand bg-cream/70 p-7">
                <p className="mini-label">عن هبة الشريف</p>
                <h2 className="mt-4 text-4xl font-black leading-tight text-charcoal">
                  ليست رحلة لتغييرك، بل لتعودي إلى نفسك بوعي ألطف.
                </h2>
                <p className="mt-5 text-sm leading-9 text-warm-gray">
                  المنصة مبنية لتجمع بين العمق العاطفي والتنظيم العملي: محتوى تتعلمين منه،
                  كتب ترافقك، وجلسات تمنحك وضوحًا شخصيًا عند الحاجة.
                </p>
                <PremiumButton href="/about" variant="outline" className="mt-7">اعرفي أكثر</PremiumButton>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {transformations.map(([from, to]) => (
                <div key={from} className="rounded-[2rem] border border-sand bg-ivory/85 p-6 shadow-soft backdrop-blur-sm">
                  <p className="text-sm font-black text-warm-gray">{from}</p>
                  <p className="mt-3 text-2xl font-black text-burgundy">{to}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="container-premium py-16">
          <PremiumSection
            eyebrow="ماذا ستشعرين؟"
            title="تجربة هادئة تشبهك"
            description="مشاهد الثقة في المنصة لا تأتي من الألوان فقط، بل من رحلة واضحة من أول زيارة حتى فتح المحتوى المدفوع."
            align="center"
          >
            <div className="grid gap-5 md:grid-cols-3">
              {testimonials.map((item) => (
                <div key={item} className="rounded-[2rem] border border-sand bg-ivory/90 p-6 text-center shadow-soft backdrop-blur-sm">
                  <p className="text-3xl text-gold">“</p>
                  <p className="mt-2 text-sm leading-8 text-charcoal">{item}</p>
                </div>
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
                <PremiumButton href="/courses" variant="gold">ابدئي بالدورات</PremiumButton>
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
