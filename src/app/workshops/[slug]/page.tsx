import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import BrandDivider from '@/components/brand/BrandDivider'
import ImageSlot from '@/components/ui/ImageSlot'
import PremiumBadge from '@/components/ui/PremiumBadge'
import PremiumButton from '@/components/ui/PremiumButton'
import WorkshopRegisterButton from '@/components/workshops/WorkshopRegisterButton'
import { getFeatureFlags } from '@/lib/flags'
import { getSupabasePublicEnv } from '@/lib/supabase/env'
import { formatArabicDateTime, formatEGP } from '@/lib/utils/formatters'

export const dynamic = 'force-dynamic'

interface WorkshopRow {
  id: string
  slug: string
  title_ar: string
  subtitle_ar: string | null
  description_ar: string
  kind: string
  price_egp: number
  capacity: number | null
  starts_at: string | null
  ends_at: string | null
  cover_url: string | null
  registration_open: boolean
  seo_title: string | null
  seo_description: string | null
}

const kindLabels: Record<string, string> = {
  live: 'ورشة مباشرة',
  recorded: 'ورشة مسجلة',
  hybrid: 'ورشة مدمجة',
  webinar: 'لقاء تعريفي',
  group: 'مجموعة عمل',
}

async function getWorkshop(slug: string): Promise<WorkshopRow | null> {
  try {
    const { url, anonKey } = getSupabasePublicEnv()
    if (!url || !anonKey) return null
    const supabase = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data } = await supabase
      .from('workshops')
      .select('id,slug,title_ar,subtitle_ar,description_ar,kind,price_egp,capacity,starts_at,ends_at,cover_url,registration_open,seo_title,seo_description')
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle()
    return (data as WorkshopRow | null) ?? null
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const workshop = await getWorkshop(slug)
  if (!workshop) return { title: 'الورش | هبة الشريف' }
  return {
    title: workshop.seo_title || `${workshop.title_ar} | هبة الشريف`,
    description: workshop.seo_description || workshop.subtitle_ar || workshop.description_ar.slice(0, 150),
  }
}

function UnavailableState() {
  return (
    <section className="container-wide px-3 py-8 sm:px-0">
      <div className="mx-auto max-w-3xl rounded-[2.5rem] border border-sand bg-ivory/92 p-10 text-center shadow-premium">
        <PremiumBadge variant="gold">غير متاحة حاليًا</PremiumBadge>
        <h1 className="mt-6 text-4xl font-black leading-tight text-charcoal md:text-5xl">هذه الورشة غير متاحة الآن.</h1>
        <p className="mx-auto mt-5 max-w-xl text-sm leading-8 text-warm-gray">
          ربما اكتملت مقاعدها أو لم تُفتح بعد. يمكنك متابعة الورش المتاحة أو حجز جلسة فردية في هذه الأثناء.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <PremiumButton href="/workshops" size="lg">تصفح الورش</PremiumButton>
          <PremiumButton href="/booking" size="lg" variant="outline">حجز جلسة فردية</PremiumButton>
        </div>
      </div>
    </section>
  )
}

export default async function WorkshopDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const flags = await getFeatureFlags()
  const workshop = flags.workshops_enabled ? await getWorkshop(slug) : null

  return (
    <>
      <Navbar />
      <main id="main-content" className="min-h-screen pt-20">
        {!workshop ? (
          <UnavailableState />
        ) : (
          <section className="container-wide px-3 py-8 sm:px-0">
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
              <div className="rounded-[2.5rem] border border-sand bg-ivory/92 p-7 shadow-premium lg:p-10">
                <div className="flex flex-wrap items-center gap-2">
                  <PremiumBadge variant="aqua">{kindLabels[workshop.kind] ?? 'ورشة'}</PremiumBadge>
                  {workshop.capacity ? <PremiumBadge variant="rose">مقاعد محدودة</PremiumBadge> : null}
                </div>
                <h1 className="mt-5 text-4xl font-black leading-tight text-charcoal md:text-5xl">{workshop.title_ar}</h1>
                {workshop.subtitle_ar ? (
                  <p className="mt-4 text-lg font-bold leading-9 text-petrol">{workshop.subtitle_ar}</p>
                ) : null}
                <BrandDivider className="my-6" />
                <div className="whitespace-pre-line text-base leading-9 text-warm-gray">{workshop.description_ar}</div>

                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[1.7rem] border border-sand bg-cream/70 p-5">
                    <p className="text-xs font-black text-warm-gray">الموعد</p>
                    <p className="mt-2 text-lg font-black text-charcoal">
                      {workshop.starts_at ? formatArabicDateTime(workshop.starts_at) : 'يُعلن قريبًا'}
                    </p>
                  </div>
                  <div className="rounded-[1.7rem] border border-sand bg-cream/70 p-5">
                    <p className="text-xs font-black text-warm-gray">الاستثمار</p>
                    <p className="latin-numerals mt-2 text-lg font-black text-petrol">
                      {workshop.price_egp > 0 ? formatEGP(workshop.price_egp) : 'مجانية'}
                    </p>
                  </div>
                </div>
              </div>

              <aside className="space-y-5 xl:sticky xl:top-28">
                <ImageSlot src={workshop.cover_url ?? undefined} alt={workshop.title_ar} ratio="portrait" variant="course" />
                <div className="rounded-[2rem] border border-sand bg-ivory/85 p-6 shadow-soft backdrop-blur-sm">
                  <p className="mini-label mb-3">التسجيل</p>
                  {workshop.registration_open ? (
                    <WorkshopRegisterButton workshopId={workshop.id} isFree={workshop.price_egp === 0} />
                  ) : (
                    <div>
                      <p className="text-sm font-black leading-7 text-warm-gray">
                        التسجيل مغلق حاليًا لهذه الورشة. يمكنك التواصل معنا لتُضافي إلى قائمة الاهتمام.
                      </p>
                      <PremiumButton href="/contact" size="lg" variant="outline" className="mt-4 w-full">تواصلي معنا</PremiumButton>
                    </div>
                  )}
                </div>
              </aside>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  )
}
