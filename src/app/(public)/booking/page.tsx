import type { Metadata } from 'next'
import { getBookingExperience } from '@/lib/data/booking'
import { BookingWizard } from '@/components/booking/BookingWizard'
import { PageHero } from '@/components/catalog/PageHero'

export const metadata: Metadata = {
  title: 'حجز جلسة فردية',
  description: 'اختاري الجلسة والتاريخ والوقت، ثم ثبتي الحجز وارفعي إيصال الدفع في مسار واضح وآمن.',
}

export const dynamic = 'force-dynamic'

export default async function BookingPage() {
  const experience = await getBookingExperience()

  return (
    <main className="overflow-hidden">
      <PageHero compact
        eyebrow="احجزي جلستك الخاصة"
        title="اختاري وقتًا هادئًا يناسب رحلتك"
        lead="ابدئي باختيار الجلسة، ثم الموعد المناسب. ستراجعين التفاصيل وشروط الدفع قبل إرسال طلبكِ."
      />

      <section className="experience-booking-bg relative overflow-hidden bg-ivory px-4 py-10 sm:px-6 sm:py-14">
        <span className="experience-orb experience-orb-a" aria-hidden />
        <div className="relative z-10 mx-auto max-w-7xl">
          <BookingWizard experience={experience} />
        </div>
      </section>

      <section className="border-t border-line bg-surface-raised px-4 py-12 sm:px-6">
        <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-3">
          {[
            ['التفاصيل قبل القرار', 'تعرّفي على مدة الجلسة وسعرها ومواعيدها قبل إكمال الطلب.'],
            ['توافر فعلي', 'لا يمكن اختيار وقت غير متاح؛ يتحقق النظام من التوافر عند إنشاء الطلب.'],
            ['حالة واضحة', 'تظهر حالة الحجز داخل الحساب بعد إنشاء الطلب أو مراجعته.'],
          ].map(([title, text]) => (
            <article key={title} className="rounded-2xl border border-line bg-ivory/60 p-5 text-center">
              <span className="text-antique-gold">✦</span>
              <h2 className="mt-2 text-xl font-bold text-deep-teal">{title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-text-soft">{text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
