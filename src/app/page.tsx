import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import BrandDivider from '@/components/brand/BrandDivider'
import BrandMark from '@/components/brand/BrandMark'
import BrandOrnament from '@/components/brand/BrandOrnament'
import PremiumButton from '@/components/ui/PremiumButton'
import PremiumBadge from '@/components/ui/PremiumBadge'
import ImageSlot from '@/components/ui/ImageSlot'
import FAQSection from '@/components/marketing/FAQSection'
import LeadMagnet from '@/components/marketing/LeadMagnet'
import OfferBanner from '@/components/offers/OfferBanner'

export const dynamic = 'force-static'

const heroStats = [
  { value: '1:1', label: 'جلسات فردية بخصوصية كاملة' },
  { value: '60/90', label: 'مدد واضحة حسب احتياجك' },
  { value: 'آمن', label: 'لا وعود علاجية أو ضغط بيع' },
  { value: 'هادئ', label: 'تجربة عربية راقية وواضحة' },
]

const primaryPaths = [
  {
    title: 'احجزي جلسة فردية',
    text: 'لما يكون عندك سؤال محدد، علاقة مرهقة، أو قرار يحتاج مساحة تفكير آمنة مع هبة.',
    href: '/booking',
    action: 'احجزي جلسة',
    icon: '✦',
  },
  {
    title: 'ابدئي من هنا',
    text: 'لو لسه مش عارفة أنسب خطوة، دليل البداية يساعدك تختاري بدون تشتت أو ضغط.',
    href: '/start-here',
    action: 'اختاري البداية',
    icon: '☾',
  },
  {
    title: 'اقرئي بوعي',
    text: 'المكتبة الرقمية تُجهز بهدوء، وستظهر فقط عندما يكون المحتوى جاهزًا للنشر والتجربة.',
    href: '/books',
    action: 'زيارة المكتبة',
    icon: '❋',
  },
]

const values = [
  'لغة هادئة تحترم ما تمرين به دون أحكام.',
  'خطوات صغيرة قابلة للتنفيذ بدل وعود كبيرة غير واقعية.',
  'خصوصية واضحة في الحجز والدفع ومتابعة الحالة.',
  'فصل واضح بين الوعي والكوتشنج وبين التشخيص أو العلاج النفسي.',
]

const serviceCards = [
  {
    title: 'جلسة وضوح 60 دقيقة',
    text: 'مناسبة لسؤال محدد أو موقف يحتاج ترتيبًا وقرارًا أهدأ.',
    price: '1,200 EGP',
  },
  {
    title: 'جلسة عميقة 90 دقيقة',
    text: 'مناسبة للأنماط المتكررة، العلاقات المرهقة، أو مرحلة تحتاج مساحة أوسع.',
    price: '1,500 EGP',
  },
  {
    title: 'مسار خاص VIP',
    text: 'خطة متابعة خاصة حسب المرحلة، يتم تحديدها بعد فهم الاحتياج.',
    price: 'حسب الخطة',
  },
]

export default function HomePage() {
  return (
    <>
      <Navbar />

      <main id="main-content" className="min-h-screen pt-20">
        <OfferBanner />
        <section className="container-wide px-3 pb-6 pt-5 sm:px-0">
          <div className="premium-glow-border botanical-frame paper-texture relative overflow-hidden rounded-[2.5rem] border border-sand bg-ivory/90 shadow-premium lg:rounded-[3rem]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgb(var(--color-gold)/.18),transparent_24rem),radial-gradient(circle_at_12%_85%,rgb(var(--color-petrol)/.12),transparent_28rem)]" />
            <div className="relative grid min-h-[650px] items-center gap-10 p-5 md:p-8 lg:grid-cols-[0.95fr_1.05fr] lg:p-12 xl:p-16">
              <div className="order-2 lg:order-1">
                <div className="relative mx-auto max-w-[520px] lg:mx-0">
                  <div className="absolute -right-5 top-8 hidden h-[440px] w-[440px] rounded-full border border-gold/30 lg:block" />
                  <div className="relative overflow-hidden rounded-[2.35rem] border border-sand bg-cream/70 p-4 shadow-botanical">
                    <ImageSlot
                      fallbackSrc="/images/heba/heba-hero.jpg"
                      alt="هبة الشريف في مساحة هادئة للوعي والكوتشنج"
                      ratio="portrait"
                      variant="hero"
                      className="rounded-[2rem]"
                      priority
                    />
                    <div className="absolute bottom-8 left-8 right-8 rounded-[1.75rem] border border-gold/25 bg-ivory/90 p-5 shadow-soft backdrop-blur-xl">
                      <div className="flex items-center gap-3">
                        <BrandOrnament className="scale-75" />
                        <span className="mini-label">نقطة وعي</span>
                      </div>
                      <h2 className="mt-3 text-2xl font-black leading-tight text-petrol">
                        مساحة آمنة لترتيب الداخل واختيار خطوة تشبهك.
                      </h2>
                    </div>
                  </div>
                </div>
              </div>

              <div className="order-1 text-center lg:order-2 lg:text-right">
                <div className="mx-auto mb-6 flex justify-center lg:mx-0 lg:justify-start">
                  <BrandMark size="lg" showText={false} />
                </div>
                <PremiumBadge variant="gold">رحلة وعي تعيدك إلى ذاتك</PremiumBadge>
                <h1 className="mt-6 text-balance text-5xl font-black leading-[1.25] text-charcoal md:text-7xl">
                  افهمي نفسك بهدوء
                  <span className="mt-2 block text-petrol">واختاري طريقك بوعي</span>
                </h1>
                <p className="mx-auto mt-6 max-w-2xl text-base leading-9 text-warm-gray md:text-lg lg:mx-0">
                  مع هبة الشريف، تتحول الأسئلة الداخلية إلى خطوات أوضح: جلسات فردية، قراءة واعية، ومسارات تعليمية لا تظهر إلا عندما تكون جاهزة فعلًا.
                </p>
                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
                  <PremiumButton href="/booking" size="lg" className="mobile-full-cta">احجزي جلسة</PremiumButton>
                  <PremiumButton href="/start-here" size="lg" variant="outline" className="mobile-full-cta">ابدئي من هنا</PremiumButton>
                </div>

                <div className="mt-10 grid gap-3 rounded-[1.75rem] border border-sand bg-ivory/82 p-3 shadow-soft backdrop-blur md:grid-cols-4">
                  {heroStats.map((stat) => (
                    <div key={stat.label} className="border-sand px-4 py-3 text-center md:border-l last:md:border-l-0">
                      <strong className="latin-numerals block text-2xl font-black text-petrol">{stat.value}</strong>
                      <span className="mt-1 block text-xs font-bold leading-5 text-warm-gray">{stat.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container-premium py-14">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mini-label mb-4">اختاري الباب الأقرب</p>
            <h2 className="text-4xl font-black leading-tight text-charcoal md:text-5xl">
              المنصة الآن تركّز على ما يعمل فعلًا: جلسات واضحة، بداية سهلة، ومحتوى يظهر عند اكتماله.
            </h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {primaryPaths.map((path) => (
              <Link key={path.title} href={path.href} className="group rounded-[2rem] border border-sand bg-ivory/90 p-7 shadow-soft transition duration-300 hover:-translate-y-1 hover:border-gold/50 hover:shadow-premium">
                <span className="flex h-14 w-14 items-center justify-center rounded-full border border-gold/25 bg-gold/10 text-2xl text-petrol">{path.icon}</span>
                <h3 className="mt-6 text-2xl font-black text-charcoal">{path.title}</h3>
                <p className="mt-4 text-sm leading-8 text-warm-gray">{path.text}</p>
                <span className="mt-6 inline-flex text-sm font-black text-burgundy group-hover:text-petrol">{path.action} ←</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="container-wide px-3 py-8 sm:px-0">
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div className="overflow-hidden rounded-[2.5rem] border border-sand bg-ivory/90 p-4 shadow-premium">
              <ImageSlot
                fallbackSrc="/images/heba/heba-session.jpg"
                alt="جلسة فردية هادئة مع هبة الشريف"
                ratio="portrait"
                variant="session"
                className="rounded-[2rem]"
              />
            </div>
            <div className="rounded-[2.5rem] border border-sand bg-ivory/90 p-7 shadow-soft lg:p-10">
              <p className="mini-label mb-4">الجلسات الفردية</p>
              <h2 className="max-w-3xl text-4xl font-black leading-tight text-charcoal md:text-5xl">
                احجزي مساحة خاصة لفهم سؤال واحد بوضوح وهدوء.
              </h2>
              <p className="mt-5 max-w-2xl text-sm leading-8 text-warm-gray">
                الحجز مصمم ليكون بسيطًا: اختاري نوع الجلسة، الموعد المناسب، طريقة الدفع، ثم تابعي حالة الطلب داخل حسابك بعد التأكيد.
              </p>
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {serviceCards.map((service) => (
                  <article key={service.title} className="rounded-[1.8rem] border border-sand bg-cream/70 p-5">
                    <h3 className="text-lg font-black text-petrol">{service.title}</h3>
                    <p className="mt-3 text-xs leading-6 text-warm-gray">{service.text}</p>
                    <strong className="latin-numerals mt-4 block text-sm font-black text-burgundy">{service.price}</strong>
                  </article>
                ))}
              </div>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <PremiumButton href="/booking" size="lg">احجزي الآن</PremiumButton>
                <PremiumButton href="/services" size="lg" variant="outline">تفاصيل الخدمات</PremiumButton>
              </div>
            </div>
          </div>
        </section>

        <section className="container-premium py-14">
          <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div className="rounded-[2.25rem] border border-sand bg-petrol p-8 text-ivory shadow-premium">
              <BrandOrnament className="mb-5 text-gold" />
              <p className="mini-label text-gold">وعد التجربة</p>
              <h2 className="mt-4 text-4xl font-black leading-tight">هدوء، وضوح، ومساحة لا تضغط عليكِ.</h2>
              <p className="mt-5 text-sm leading-8 text-ivory/78">
                كل كلمة وواجهة داخل المنصة يجب أن تشعر الزائرة بالأمان: لا ادعاءات علاجية، لا استعجال، ولا صفحات غير مكتملة.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {values.map((value) => (
                <div key={value} className="rounded-[2rem] border border-sand bg-ivory/88 p-6 shadow-soft">
                  <BrandDivider className="mb-4 justify-start" />
                  <p className="text-sm font-black leading-8 text-charcoal">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="container-premium py-14">
          <FAQSection />
        </section>

        <section className="container-premium pb-16">
          <LeadMagnet />
        </section>

        <section className="container-wide px-3 pb-8 sm:px-0">
          <div className="premium-glow-border relative overflow-hidden rounded-[2.5rem] border border-sand bg-petrol p-8 text-center text-ivory shadow-premium md:p-12">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgb(245_240_231/.14),transparent_52%),radial-gradient(circle_at_10%_80%,rgb(var(--color-gold)/.18),transparent_20rem)]" />
            <div className="relative mx-auto max-w-4xl">
              <BrandOrnament className="mx-auto mb-5 text-gold" />
              <h2 className="text-3xl font-black leading-tight md:text-5xl">جاهزة لخطوة أوضح؟</h2>
              <p className="mx-auto mt-5 max-w-2xl text-sm leading-8 text-ivory/78">
                ابدئي بجلسة خاصة أو دليل البداية، واتركي المحتوى غير الجاهز خارج رحلتك حتى يتم إطلاقه بشكل يليق بكِ.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <PremiumButton href="/booking" variant="gold">احجزي جلستك الخاصة</PremiumButton>
                <PremiumButton href="/start-here" variant="outline" className="border-ivory text-ivory hover:bg-ivory hover:text-petrol">ابدئي من هنا</PremiumButton>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
