import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import PremiumButton from '@/components/ui/PremiumButton'

const paths = [
  {
    title: 'الدورات',
    description: 'رحلات تعليمية منظمة لفهم الذات والعلاقات والحدود العاطفية.',
    href: '/courses',
    action: 'استكشفي الدورات',
  },
  {
    title: 'الكتب',
    description: 'كتب رقمية عميقة تساعدك على التأمل، الفهم، واستعادة الهدوء.',
    href: '/books',
    action: 'استكشفي الكتب',
  },
  {
    title: 'الجلسات',
    description: 'جلسات فردية خاصة بمساحة آمنة وواضحة لاحتياجك الحالي.',
    href: '/booking',
    action: 'احجزي جلسة',
  },
]

const values = [
  'محتوى عربي أصيل وموجه للمرأة العربية',
  'تجربة هادئة وواضحة من أول زيارة',
  'محتوى مدفوع محمي داخل الحساب',
  'لوحة مستخدم تحفظ الرحلة والطلبات والجلسات',
]

export default function HomePage() {
  return (
    <>
      <Navbar />

      <main className="min-h-screen pt-20">
        <section className="container-premium relative flex min-h-[calc(100vh-5rem)] items-center overflow-hidden py-20">
          <div className="ambient-orb ambient-orb-gold right-0 top-20 h-52 w-52" />
          <div className="ambient-orb ambient-orb-petrol bottom-24 left-4 h-64 w-64" />
          <div className="ambient-orb ambient-orb-olive bottom-4 right-1/3 h-44 w-44" />

          <div className="relative grid w-full items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="mb-5 text-sm font-semibold tracking-[0.3em] text-gold">
                منصة عربية للتحوّل العاطفي
              </p>

              <h1 className="text-balance text-5xl font-black leading-tight text-petrol md:text-7xl">
                هبة الشريف
                <span className="mt-3 block text-gold">رحلة أهدأ نحو نفسك</span>
              </h1>

              <p className="mt-7 max-w-2xl text-lg font-light leading-9 text-warm-gray">
                منصة فاخرة وهادئة تجمع بين الدورات، الكتب، والجلسات الفردية لمساعدة المرأة
                العربية على فهم ذاتها، علاقاتها، وحدودها العاطفية بوعي وعمق.
              </p>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <PremiumButton href="/courses" size="lg">
                  استكشفي الدورات
                </PremiumButton>

                <PremiumButton href="/booking" variant="outline" size="lg">
                  احجزي جلسة خاصة
                </PremiumButton>
              </div>
            </div>

            <div className="premium-card premium-glow-border premium-soft-motion relative overflow-hidden p-8">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(183,155,108,0.22),transparent_55%)]" />
              <div className="ambient-orb ambient-orb-gold right-8 top-8 h-32 w-32" />
              <div className="ambient-orb ambient-orb-petrol bottom-10 left-8 h-40 w-40" />

              <div className="relative">
                <div className="mb-8 rounded-[2rem] border border-sand bg-cream/70 p-8 backdrop-blur-sm">
                  <p className="mb-3 text-sm font-semibold text-gold">تجربة المنصة</p>

                  <h2 className="text-3xl font-black leading-snug text-charcoal">
                    تعلم، قراءة، حجز، ومتابعة في مساحة واحدة
                  </h2>

                  <p className="mt-4 text-sm leading-8 text-warm-gray">
                    تم تصميم المنصة لتكون مساحة هادئة ومنظمة تربط بين المحتوى المدفوع،
                    لوحة المستخدم، وإدارة الطلبات والجلسات.
                  </p>
                </div>

                <div className="grid gap-3">
                  {values.map((value) => (
                    <div
                      key={value}
                      className="rounded-2xl border border-sand bg-ivory/85 p-4 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-gold/40 hover:bg-ivory"
                    >
                      <p className="text-sm font-bold leading-7 text-charcoal">
                        <span className="ml-2 text-gold">✦</span>
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden border-y border-sand bg-ivory/60">
          <div className="ambient-orb ambient-orb-gold left-10 top-10 h-52 w-52" />
          <div className="ambient-orb ambient-orb-petrol bottom-0 right-16 h-56 w-56" />

          <div className="container-premium relative py-16">
            <div className="mb-10 max-w-2xl">
              <p className="mb-3 text-sm font-bold tracking-[0.25em] text-gold">
                اختاري مسارك
              </p>

              <h2 className="text-4xl font-black leading-tight text-petrol">
                كل مسار مصمم لاحتياج مختلف في رحلتك
              </h2>

              <p className="mt-5 text-sm leading-8 text-warm-gray">
                يمكنكِ البدء بالدورات، قراءة الكتب، أو حجز جلسة خاصة حسب ما تحتاجينه الآن.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {paths.map((path) => (
                <Link
                  key={path.href}
                  href={path.href}
                  className="premium-glow-border group rounded-3xl border border-sand bg-ivory/90 p-7 shadow-soft backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:shadow-premium"
                >
                  <h3 className="text-2xl font-black text-charcoal transition group-hover:text-petrol">
                    {path.title}
                  </h3>

                  <p className="mt-4 text-sm leading-8 text-warm-gray">{path.description}</p>

                  <span className="mt-6 inline-block rounded-full bg-petrol px-5 py-2 text-xs font-bold text-cream transition group-hover:bg-gold">
                    {path.action}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="container-premium relative overflow-hidden py-16">
          <div className="ambient-orb ambient-orb-olive bottom-10 left-1/4 h-48 w-48" />

          <div className="premium-glow-border relative overflow-hidden rounded-[2rem] border border-sand bg-petrol p-8 text-center text-cream shadow-premium md:p-12">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.16),transparent_56%)]" />
            <div className="ambient-orb ambient-orb-gold right-16 top-8 h-32 w-32" />
            <div className="ambient-orb ambient-orb-petrol bottom-8 left-16 h-40 w-40" />

            <div className="relative">
              <p className="mb-3 text-sm font-bold tracking-[0.25em] text-gold">
                ابدئي بهدوء
              </p>

              <h2 className="text-3xl font-black leading-tight md:text-5xl">
                لا تحتاجين أن تعرفي كل الطريق الآن
              </h2>

              <p className="mx-auto mt-5 max-w-2xl text-sm leading-8 text-cream/75">
                فقط اختاري المسار الأقرب لمرحلتك الحالية، والمنصة ستساعدك على متابعة الرحلة خطوة
                بخطوة داخل حسابك.
              </p>

              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <PremiumButton href="/courses" variant="gold">
                  ابدئي بالدورات
                </PremiumButton>

                <PremiumButton
                  href="/books"
                  variant="outline"
                  className="border-cream text-cream hover:bg-cream hover:text-petrol"
                >
                  تصفحي الكتب
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