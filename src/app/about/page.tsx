export const dynamic = 'force-dynamic'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import PremiumButton from '@/components/ui/PremiumButton'

const values = [
  'العمق قبل السرعة',
  'الوعي قبل الحكم',
  'الحدود قبل الإرضاء',
  'الرحمة قبل جلد الذات',
]

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20">
        <section className="container-premium grid gap-10 py-16 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="luxury-shell rounded-[2.5rem] p-5">
            <div className="hero-art min-h-[520px] rounded-[2rem] border border-sand" />
          </div>
          <div>
            <p className="mini-label mb-3">عن هبة الشريف</p>
            <h1 className="text-balance text-4xl font-black leading-tight text-charcoal md:text-6xl">
              مساحة عربية لفهم الذات بعين أرحم وأوضح
            </h1>
            <p className="mt-6 text-base leading-9 text-warm-gray">
              هبة الشريف منصة وممارسة محتوى تساعدك على تفكيك العلاقات، الحدود، والأنماط العاطفية
              بطريقة منظمة، هادئة، وعملية. التجربة هنا ليست لإعطائك إجابات جاهزة، بل لمساعدتك
              على سماع صوتك الداخلي بشكل أوضح.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {values.map((value) => (
                <div key={value} className="rounded-2xl border border-sand bg-ivory/80 p-4 font-black text-petrol shadow-soft">
                  ✦ {value}
                </div>
              ))}
            </div>
            <div className="mt-8 flex gap-3">
              <PremiumButton href="/booking">احجزي جلسة</PremiumButton>
              <PremiumButton href="/courses" variant="outline">استكشفي الكورسات</PremiumButton>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
