import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import BrandDivider from '@/components/brand/BrandDivider'
import ImageSlot from '@/components/ui/ImageSlot'
import PremiumBadge from '@/components/ui/PremiumBadge'
import PremiumButton from '@/components/ui/PremiumButton'
import { getFeatureFlags } from '@/lib/flags'
import { getSupabasePublicEnv } from '@/lib/supabase/env'
import { formatArabicDate, formatEGP } from '@/lib/utils/formatters'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'الورش والمجموعات | هبة الشريف',
  description: 'ورش عمل ولقاءات جماعية هادئة مع هبة الشريف: تعلم عملي، مساحة آمنة، وعدد مقاعد محدود.',
}

interface WorkshopRow {
  id: string
  slug: string
  title_ar: string
  subtitle_ar: string | null
  kind: string
  price_egp: number
  capacity: number | null
  starts_at: string | null
  cover_url: string | null
  registration_open: boolean
}

const kindLabels: Record<string, string> = {
  live: 'ورشة مباشرة',
  recorded: 'ورشة مسجلة',
  hybrid: 'ورشة مدمجة',
  webinar: 'لقاء تعريفي',
  group: 'مجموعة عمل',
}

async function getPublishedWorkshops(): Promise<WorkshopRow[]> {
  try {
    const { url, anonKey } = getSupabasePublicEnv()
    if (!url || !anonKey) return []
    const supabase = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data } = await supabase
      .from('workshops')
      .select('id,slug,title_ar,subtitle_ar,kind,price_egp,capacity,starts_at,cover_url,registration_open')
      .eq('status', 'published')
      .order('starts_at', { ascending: true, nullsFirst: false })
    return (data as WorkshopRow[] | null) ?? []
  } catch {
    return []
  }
}

function WaitlistState() {
  return (
    <section className="container-wide px-3 py-8 sm:px-0">
      <div className="premium-glow-border botanical-frame paper-texture relative overflow-hidden rounded-[2.75rem] border border-sand bg-ivory/92 p-6 shadow-premium lg:p-12">
        <div className="relative grid gap-10 lg:grid-cols-[1fr_420px] lg:items-center">
          <div>
            <PremiumBadge variant="gold">قيد التجهيز باحترام</PremiumBadge>
            <h1 className="mt-6 max-w-4xl text-5xl font-black leading-tight text-charcoal md:text-6xl">
              الورش القادمة تُبنى الآن بعناية.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-9 text-warm-gray">
              نجهز لقاءات جماعية صغيرة وعميقة، بعدد مقاعد محدود ومحتوى عملي واضح. عندما تفتح أول ورشة ستظهر هنا مع تفاصيلها الكاملة.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <PremiumButton href="/booking" size="lg">احجزي جلسة فردية الآن</PremiumButton>
              <PremiumButton href="/contact" size="lg" variant="outline">أخبريني عند الافتتاح</PremiumButton>
            </div>
          </div>
          <div className="overflow-hidden rounded-[2.35rem] border border-sand bg-cream/70 p-4 shadow-botanical">
            <ImageSlot fallbackSrc="/images/brand/brand-board.png" alt="ورش هبة الشريف القادمة" ratio="portrait" variant="brand" className="rounded-[2rem]" />
          </div>
        </div>
      </div>
    </section>
  )
}

export default async function WorkshopsPage() {
  const flags = await getFeatureFlags()
  const workshops = flags.workshops_enabled ? await getPublishedWorkshops() : []

  return (
    <>
      <Navbar />
      <main id="main-content" className="min-h-screen pt-20">
        {workshops.length === 0 ? (
          <WaitlistState />
        ) : (
          <section className="container-wide px-3 py-8 sm:px-0">
            <div className="mb-10 text-center">
              <PremiumBadge variant="gold">مساحات جماعية</PremiumBadge>
              <h1 className="mt-5 text-5xl font-black leading-tight text-charcoal md:text-6xl">الورش واللقاءات</h1>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-9 text-warm-gray">
                لقاءات عملية هادئة بعدد مقاعد محدود، لتتعلمي وتطبقي داخل مساحة آمنة.
              </p>
              <BrandDivider className="mx-auto mt-6" />
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {workshops.map((workshop) => (
                <Link
                  key={workshop.id}
                  href={`/workshops/${workshop.slug}`}
                  className="group overflow-hidden rounded-[2.25rem] border border-sand bg-ivory/90 shadow-soft backdrop-blur-sm transition hover:-translate-y-1 hover:shadow-premium"
                >
                  <ImageSlot src={workshop.cover_url ?? undefined} alt={workshop.title_ar} ratio="video" variant="course" className="rounded-b-none border-0 shadow-none" />
                  <div className="p-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <PremiumBadge variant="aqua">{kindLabels[workshop.kind] ?? 'ورشة'}</PremiumBadge>
                      {!workshop.registration_open ? <PremiumBadge variant="rose">التسجيل مغلق</PremiumBadge> : null}
                    </div>
                    <h2 className="mt-4 text-2xl font-black leading-snug text-charcoal">{workshop.title_ar}</h2>
                    {workshop.subtitle_ar ? (
                      <p className="mt-2 text-sm leading-7 text-warm-gray">{workshop.subtitle_ar}</p>
                    ) : null}
                    <div className="mt-5 flex items-center justify-between border-t border-sand pt-4 text-sm font-black">
                      <span className="text-warm-gray">
                        {workshop.starts_at ? formatArabicDate(workshop.starts_at.slice(0, 10)) : 'حسب الجدول'}
                      </span>
                      <span className="latin-numerals text-petrol">
                        {workshop.price_egp > 0 ? formatEGP(workshop.price_egp) : 'مجانية'}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  )
}
