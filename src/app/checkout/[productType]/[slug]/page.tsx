import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import BrandDivider from '@/components/brand/BrandDivider'
import BrandOrnament from '@/components/brand/BrandOrnament'
import PremiumButton from '@/components/ui/PremiumButton'
import PremiumBadge from '@/components/ui/PremiumBadge'
import CommercePipeline from '@/components/commerce/CommercePipeline'

export const dynamic = 'force-dynamic'

const typeLabels: Record<string, string> = {
  book: 'كتاب رقمي',
  course: 'كورس تعليمي',
  workshop: 'ورشة',
  session: 'جلسة 1:1',
  bundle: 'باقة',
  vip_program: 'برنامج VIP',
}

export default async function CheckoutIntentPage({ params }: { params: Promise<{ productType: string; slug: string }> }) {
  const resolvedParams = await params
  const productType = resolvedParams.productType
  const label = typeLabels[productType] || 'منتج رقمي'

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24">
        <section className="container-premium py-12">
          <div className="premium-glow-border botanical-frame rounded-[2.75rem] border border-sand bg-ivory/92 p-6 shadow-premium lg:p-10">
            <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-center">
              <div>
                <PremiumBadge variant="gold">Unified Checkout</PremiumBadge>
                <h1 className="mt-5 text-4xl font-black leading-tight text-petrol md:text-6xl">طلب آمن قبل فتح الوصول</h1>
                <p className="mt-5 max-w-2xl text-sm font-bold leading-8 text-warm-gray">
                  هذه الصفحة تثبت مسار الشراء الموحد في V8: كل كتاب، كورس، ورشة، جلسة أو باقة تمر عبر طلب واضح، دفع يدوي مؤمن، مراجعة أدمن، ثم فتح الوصول فقط بعد التأكيد.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <PremiumButton href="/dashboard/orders">متابعة طلباتي</PremiumButton>
                  <PremiumButton href={`/${productType === 'book' ? 'books' : productType === 'course' ? 'courses' : productType === 'workshop' ? 'workshops' : 'services'}/${resolvedParams.slug}`} variant="outline">
                    العودة للتفاصيل
                  </PremiumButton>
                </div>
              </div>
              <aside className="rounded-[2.25rem] border border-sand bg-cream/72 p-6 shadow-soft">
                <BrandOrnament className="mb-4" />
                <p className="mini-label mb-2">ملخص الطلب</p>
                <h2 className="text-2xl font-black text-charcoal">{label}</h2>
                <p className="latin-numerals mt-2 break-all text-sm font-bold text-warm-gray">{resolvedParams.slug}</p>
                <BrandDivider className="my-5" />
                <ul className="space-y-3 text-sm font-bold leading-7 text-warm-gray">
                  <li>• إنشاء order موحد من السيرفر.</li>
                  <li>• تطبيق كوبون من API محمي.</li>
                  <li>• رفع إثبات دفع خاص وغير عام.</li>
                  <li>• فتح access بعد موافقة الأدمن فقط.</li>
                </ul>
              </aside>
            </div>
          </div>
        </section>
        <section className="container-premium pb-14">
          <CommercePipeline />
        </section>
      </main>
      <Footer />
    </>
  )
}
