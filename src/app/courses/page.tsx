import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import BrandDivider from '@/components/brand/BrandDivider'
import BrandOrnament from '@/components/brand/BrandOrnament'
import ImageSlot from '@/components/ui/ImageSlot'
import PremiumButton from '@/components/ui/PremiumButton'
import PremiumBadge from '@/components/ui/PremiumBadge'

export const dynamic = 'force-static'

const preparationChecks = [
  'المحتوى لا يظهر للعميل إلا بعد اكتمال المراجعة والجودة.',
  'كل مسار سيحتوي على وعد واضح، دروس مرتبة، وتمارين قابلة للتطبيق.',
  'الوصول سيكون محميًا داخل الحساب بعد تأكيد الطلب فقط.',
  'الأولوية الآن للجلسات الفردية ودليل البداية حتى يكتمل إطلاق المسارات.',
]

export default function CoursesPage() {
  return (
    <>
      <Navbar />
      <main id="main-content" className="min-h-screen pt-20">
        <section className="container-wide px-3 py-8 sm:px-0">
          <div className="premium-glow-border botanical-frame paper-texture relative overflow-hidden rounded-[2.75rem] border border-sand bg-ivory/92 p-6 shadow-premium lg:p-12">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgb(var(--color-gold)/.18),transparent_24rem),radial-gradient(circle_at_12%_84%,rgb(var(--color-petrol)/.12),transparent_28rem)]" />
            <div className="relative grid gap-10 lg:grid-cols-[1fr_420px] lg:items-center">
              <div>
                <PremiumBadge variant="gold">قيد التجهيز باحترام</PremiumBadge>
                <h1 className="mt-6 max-w-4xl text-5xl font-black leading-tight text-charcoal md:text-6xl">
                  الكورسات لا تظهر هنا إلا عندما تكون جاهزة فعلًا.
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-9 text-warm-gray">
                  بدل عرض محتوى غير مكتمل، اخترنا أن تبقى المسارات التعليمية في مرحلة الإعداد والمراجعة حتى تخرج بتجربة تليق بهوية هبة الشريف وبثقة العميلة.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <PremiumButton href="/booking" size="lg">احجزي جلسة الآن</PremiumButton>
                  <PremiumButton href="/start-here" size="lg" variant="outline">ابدئي من هنا</PremiumButton>
                </div>
              </div>
              <div className="overflow-hidden rounded-[2.35rem] border border-sand bg-cream/70 p-4 shadow-botanical">
                <ImageSlot
                  fallbackSrc="/images/brand/brand-board.png"
                  alt="لوحة هوية هبة الشريف ومسارات الوعي القادمة"
                  ratio="portrait"
                  variant="brand"
                  className="rounded-[2rem]"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="container-premium py-14">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mini-label mb-4">ما الذي يحدث الآن؟</p>
            <h2 className="text-4xl font-black leading-tight text-charcoal md:text-5xl">
              المسارات قيد البناء، لكن رحلتك يمكن أن تبدأ اليوم من الجلسات أو دليل البداية.
            </h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {preparationChecks.map((item) => (
              <article key={item} className="rounded-[2rem] border border-sand bg-ivory/90 p-6 shadow-soft">
                <BrandDivider className="mb-4 justify-start" />
                <p className="text-sm font-black leading-8 text-charcoal">{item}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="container-wide px-3 pb-10 sm:px-0">
          <div className="rounded-[2.5rem] border border-sand bg-petrol p-8 text-center text-ivory shadow-premium md:p-12">
            <BrandOrnament className="mx-auto mb-5 text-gold" />
            <h2 className="text-3xl font-black leading-tight md:text-5xl">لا نبيع وعدًا غير مكتمل.</h2>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-8 text-ivory/78">
              عندما تُفتح الكورسات، ستظهر في الموقع واللوحة بإدارة وصول واضحة ومحتوى محمي وتجربة تعليمية منظمة.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <PremiumButton href="/booking" variant="gold">جلسة فردية</PremiumButton>
              <PremiumButton href="/contact" variant="outline" className="border-ivory text-ivory hover:bg-ivory hover:text-petrol">اسألي عن الإطلاق</PremiumButton>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
