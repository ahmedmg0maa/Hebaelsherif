import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import BrandMark from '@/components/brand/BrandMark'
import BrandDivider from '@/components/brand/BrandDivider'
import PremiumButton from '@/components/ui/PremiumButton'

export default function NotFoundPage() {
  return (
    <>
      <Navbar />
      <main id="main-content" className="min-h-screen pt-24">
        <section className="container-premium py-16">
          <div className="mx-auto max-w-3xl rounded-[2.75rem] border border-sand bg-ivory/92 p-8 text-center shadow-premium">
            <BrandMark size="lg" className="justify-center" />
            <BrandDivider className="mx-auto my-6" />
            <p className="mini-label mb-4">صفحة غير موجودة</p>
            <h1 className="text-5xl font-black leading-tight text-charcoal md:text-6xl">الطريق الذي طلبته غير متاح الآن.</h1>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-8 text-warm-gray">
              قد يكون الرابط قديمًا أو تم نقله أثناء تحديث المنصة. يمكنك العودة للرئيسية، حجز جلسة، أو بدء الرحلة من الدليل الهادئ.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <PremiumButton href="/">العودة للرئيسية</PremiumButton>
              <PremiumButton href="/booking" variant="outline">حجز جلسة</PremiumButton>
              <Link href="/start-here" className="rounded-full px-5 py-3 text-sm font-black text-burgundy transition hover:bg-gold/10 hover:text-petrol">
                ابدئي من هنا
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
