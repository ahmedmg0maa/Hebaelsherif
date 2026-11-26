import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHero } from '@/components/catalog/PageHero'
import { Stars } from '@/components/catalog/Stars'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { listPublicTestimonials, TESTIMONIAL_TYPES, TESTIMONIAL_TYPE_LABELS } from '@/lib/data/testimonials'
import { cn } from '@/lib/cn'

export const metadata: Metadata = {
  title: 'تجارب موثقة',
  description: 'تجارب وافقت صاحباتها على النشر وجرى التحقق من ارتباطها بشراء فعلي على المنصة.',
}

export const revalidate = 300

export default async function TestimonialsPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams
  const selected = TESTIMONIAL_TYPES.includes(type as (typeof TESTIMONIAL_TYPES)[number]) ? type : undefined
  const testimonials = await listPublicTestimonials(selected)

  return (
    <main>
      <PageHero
        eyebrow="تجارب حقيقية"
        title="ما اختارت العميلات مشاركته"
        lead="لا تظهر هنا إلا تجربة مرتبطة بشراء فعلي، وافقت صاحبتها صراحةً على نشر نصها، ثم راجعتها الإدارة. عدم إظهار الاسم يعني أن صاحبته اختارت الخصوصية."
      />

      <section className="mx-auto max-w-6xl px-6 py-12 md:py-16" aria-labelledby="testimonial-list-title">
        <div className="mb-8 flex flex-col gap-5 border-b border-line pb-7 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold text-antique-gold">مراجعة وموافقة وتحقق</p>
            <h2 id="testimonial-list-title" className="mt-2 text-3xl font-bold text-deep-teal">التجارب المنشورة</h2>
          </div>
          <nav className="flex flex-wrap gap-2" aria-label="تصفية التجارب حسب النوع">
            <Link href="/testimonials" aria-current={!selected ? 'page' : undefined} className={cn('rounded-full border px-4 py-2 text-sm font-semibold', !selected ? 'border-deep-teal bg-deep-teal text-on-dark' : 'border-line text-deep-teal hover:border-antique-gold')}>الكل</Link>
            {TESTIMONIAL_TYPES.map((item) => (
              <Link key={item} href={`/testimonials?type=${item}`} aria-current={selected === item ? 'page' : undefined} className={cn('rounded-full border px-4 py-2 text-sm font-semibold', selected === item ? 'border-deep-teal bg-deep-teal text-on-dark' : 'border-line text-deep-teal hover:border-antique-gold')}>
                {TESTIMONIAL_TYPE_LABELS[item]}
              </Link>
            ))}
          </nav>
        </div>

        {testimonials.length === 0 ? (
          <EmptyState
            title="لا توجد تجارب موثقة منشورة في هذا القسم"
            description="لا توجد تجارب متاحة في هذا القسم حاليًا. يمكنكِ التعرف على المحتوى والخدمات قبل الاختيار."
            actionLabel="استكشفي المسارات"
            actionHref="/services"
          />
        ) : (
          <div className="divide-y divide-line border-y border-line">
            {testimonials.map((testimonial, index) => (
              <article key={testimonial.id} className="grid gap-5 py-8 md:grid-cols-[10rem_1fr] md:gap-10 md:py-10">
                <div className="space-y-3">
                  <span className="tnum text-sm text-taupe">{String(index + 1).padStart(2, '0')}</span>
                  <Stars rating={testimonial.rating} />
                  <p className="font-bold text-deep-teal">{testimonial.displayName}</p>
                  <Badge tone="teal">شراء موثّق</Badge>
                </div>
                <div>
                  <blockquote className="text-xl leading-loose text-ink">“{testimonial.comment}”</blockquote>
                  <p className="mt-4 text-sm text-text-soft">ضمن {TESTIMONIAL_TYPE_LABELS[testimonial.productType]}: <span className="font-semibold text-deep-teal">{testimonial.productTitle}</span></p>
                  {testimonial.ownerResponse && (
                    <div className="mt-6 border-s-2 border-antique-gold ps-5">
                      <p className="text-xs font-bold text-antique-gold">رد هبة</p>
                      <p className="mt-2 leading-relaxed text-text-soft">{testimonial.ownerResponse}</p>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
