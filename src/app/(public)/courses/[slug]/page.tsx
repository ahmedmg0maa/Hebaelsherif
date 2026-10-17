import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getCourse, formatPrice, formatDuration } from '@/lib/data/catalog'
import { lessonsLabel } from '@/lib/format'
import { Section } from '@/components/ui/Section'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Stars } from '@/components/catalog/Stars'
import { CTARibbon } from '@/components/catalog/CTARibbon'
import { MobileBuyBar } from '@/components/catalog/MobileBuyBar'
import { getPaymentSettings } from '@/lib/data/checkout'
import { CatalogCoverImage } from '@/components/catalog/CatalogCoverImage'
import { PreviewCourseExperience } from '@/components/experience/PreviewCourseExperience'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const course = await getCourse((await params).slug)
  return course
    ? { title: course.title, description: course.description }
    : { title: 'دورة غير موجودة' }
}

export const revalidate = 300

function fmtSeconds(s: number) {
  const m = Math.round(s / 60)
  return `${m.toLocaleString('ar-EG')} د`
}

export default async function CourseDetailPage({ params }: Props) {
  const course = await getCourse((await params).slug)
  if (!course) notFound()
  const paymentSettings = await getPaymentSettings()
  const orderingAvailable = !course.isPreviewExperience && (course.price === 0 || Boolean(paymentSettings.instapay || paymentSettings.wallet || paymentSettings.bank))

  const includes = [
    `${lessonsLabel(course.lessonsCount)} مرتبة داخل المنهج`,
    formatDuration(course.durationMinutes),
    'وصول محفوظ داخل حسابك',
    'تتبّع واضح للتقدم',
  ]

  return (
    <main>
      <section className="border-b border-line bg-surface-raised">
        <div className="mx-auto grid max-w-7xl items-start gap-10 px-5 py-12 sm:px-8 md:py-20 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <CatalogCoverImage url={course.coverUrl} title={course.title} className="mb-7 aspect-[16/7] w-full" />
            {course.isPreviewExperience && <Badge tone="cobalt" className="mb-4">تجربة عرض أصلية · لا شراء ولا استحقاق</Badge>}
            <p className="mb-2 text-sm font-semibold text-burgundy">{course.subtitle}</p>
            <h1 className="font-heading text-4xl font-bold leading-snug text-deep-teal sm:text-5xl">{course.title}</h1>
            {course.ratingCount > 0 && <Stars rating={course.rating} count={course.ratingCount} className="mt-3" />}
            <p className="mt-5 max-w-2xl text-lg leading-loose text-text-soft">{course.description}</p>
          </div>

          <Card className="lg:sticky lg:top-24">
            <p className="flex items-baseline gap-3">
              {course.isPreviewExperience ? <span className="text-2xl font-bold text-deep-teal">متاحة للتجربة الآن</span> : <>
              <span className="tnum text-3xl font-bold text-burgundy">{formatPrice(course.price)}</span>
              {course.compareAtPrice && (
                <span className="tnum text-lg text-taupe line-through">{formatPrice(course.compareAtPrice)}</span>
              )}
              </>}
            </p>
            {course.compareAtPrice && (
              <Badge tone="burgundy" className="mt-2">
                وفّري {formatPrice(course.compareAtPrice - course.price)}
              </Badge>
            )}
            <ul className="mt-5 space-y-2.5 border-t border-line pt-5 text-sm text-ink">
              {includes.map((item) => (
                <li key={item} className="flex items-center gap-2.5">
                  <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-deep-teal" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M4 10.5l4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            {course.isPreviewExperience ? (
              <Button href="#course-preview" size="lg" className="mt-6 w-full">ابدئي الدرس الأول</Button>
            ) : orderingAvailable ? (
              <Button href={`/checkout/course/${course.slug}`} size="lg" className="mt-6 w-full">
                {course.price === 0 ? 'ابدئي الدورة المجانية' : 'اطلبي الالتحاق'}
              </Button>
            ) : (
              <p className="mt-6 rounded-xl bg-ivory px-4 py-3 text-center text-sm font-medium text-text-soft" role="status">
                الالتحاق غير متاح قبل تفعيل وسيلة دفع من الإدارة.
              </p>
            )}
          </Card>
        </div>
      </section>

      {course.isPreviewExperience && course.previewLessons && <PreviewCourseExperience lessons={course.previewLessons} />}

      <Section eyebrow="ماذا ستتعلمين؟" title="منهج الدورة">
        <div className="mx-auto max-w-3xl space-y-4">
          {course.modules.map((m, mi) => (
            <details key={m.title} open={mi === 0} className="group rounded-2xl border border-line bg-surface-raised shadow-card">
              <summary className="flex cursor-pointer items-center justify-between gap-4 p-5 font-bold text-deep-teal [&::-webkit-details-marker]:hidden">
                {m.title}
                <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0 text-taupe transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </summary>
              <ul className="border-t border-line">
                {m.lessons.map((l, li) => (
                  <li key={l.title} className="flex items-center justify-between gap-4 px-5 py-3.5 text-sm not-last:border-b not-last:border-line/60">
                    <span className="flex items-center gap-3 text-ink">
                      <svg viewBox="0 0 20 20" className="h-4 w-4 text-antique-gold" fill="currentColor" aria-hidden>
                        <path d="M7 5.5v9l7-4.5Z" />
                      </svg>
                      {l.title}
                      {l.isPreview && l.previewText ? <a href={`#lesson-${mi}-${li}`} className="font-semibold text-burgundy underline underline-offset-4">اقرئي الدرس</a> : l.isPreview && <Badge tone="cobalt">معاينة مجانية</Badge>}
                    </span>
                    <span className="tnum shrink-0 text-taupe">{fmtSeconds(l.durationSeconds)}</span>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      </Section>

      {course.modules.some(m => m.lessons.some(l => l.isPreview && l.previewText)) && <Section tone="white" eyebrow="قراءة متاحة" title="ابدئي القراءة الآن" lead="اقرئي الدروس المتاحة هنا. بعد الالتحاق بالدورة يمكنكِ حفظ التقدم من حسابك.">
        <div className="mx-auto max-w-3xl space-y-6">{course.modules.flatMap((m, mi) => m.lessons.map((l, li) => l.isPreview && l.previewText ? <article key={`${mi}-${li}`} id={`lesson-${mi}-${li}`} className="scroll-mt-28 rounded-2xl border border-line bg-surface-raised p-5 sm:p-8"><h3 className="text-xl font-bold text-deep-teal">{l.title}</h3><div className="mt-4 space-y-4 text-text-soft">{l.previewText.split(/\n\s*\n/).map((paragraph, i) => <p key={i} className="leading-loose">{paragraph}</p>)}</div></article> : null))}</div>
      </Section>}

      <CTARibbon
        title="استكشفي المحتوى المنشور"
        lead="تظهر تفاصيل الوصول وطريقة التعلّم داخل الحساب بعد اعتماد الاستحقاق."
        ctaLabel="تصفحي الدورات"
        ctaHref="/courses"
      />
      {orderingAvailable && <MobileBuyBar
        price={course.price}
        compareAtPrice={course.compareAtPrice}
        ctaLabel={course.price === 0 ? 'ابدئي الدورة المجانية' : 'اطلبي الالتحاق'}
        ctaHref={`/checkout/course/${course.slug}`}
      />}
    </main>
  )
}
