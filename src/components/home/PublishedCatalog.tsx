import { listCourses, listServices, type CatalogCourse } from '@/lib/data/catalog'
import { formatDuration, formatPrice, lessonsLabel } from '@/lib/format'
import { Section } from '@/components/ui/Section'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import { SessionOptions, type SessionOption } from '@/components/catalog/SessionOptions'

type CourseSummary = Pick<CatalogCourse, 'slug' | 'title' | 'subtitle' | 'description' | 'price' | 'durationMinutes' | 'lessonsCount'> & { reviewHref?: string }

// Uses the same publication filters as the catalog. Admin edits, publication
// and hiding invalidate this page through revalidateCatalogMutation.
export async function PublishedCatalog() {
  const [services, courses] = await Promise.all([listServices(), listCourses()])
  return <PublishedCatalogSection services={services} courses={courses} />
}

export function PublishedCatalogSection({ services, courses }: { services: SessionOption[]; courses: CourseSummary[] }) {
  if (!services.length && !courses.length) return null

  return <Section id="available-offers" className="scroll-mt-24" title={services.length ? (courses.length ? 'الجلسات والدورات المتاحة' : 'الجلسات المتاحة') : 'الدورات المتاحة'} align="start" tone="white">
    <div className={`grid gap-5 sm:gap-6 ${services.length && courses.length ? 'lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]' : 'max-w-3xl'}`}>
      {services.length > 0 && <article className="min-w-0 rounded-3xl border border-on-dark/15 bg-[#173C48] p-5 text-on-dark shadow-card sm:p-7">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-on-dark/25 pb-4">
          <h3 className="font-heading text-3xl font-bold leading-snug">الجلسات الفردية</h3>
          <Link href="/services#individual-sessions" className="inline-flex min-h-11 items-center text-sm font-medium text-muted-gold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-dark">{services.length > 2 ? 'كل الجلسات المتاحة' : 'تفاصيل الجلسات'}</Link>
        </div>
        <SessionOptions services={services.slice(0, 2)} />
      </article>}
      {courses.length > 0 && <div className="grid gap-4">
        {courses.slice(0, 2).map(course => <article key={course.slug} className="flex min-w-0 flex-col items-start gap-3 rounded-3xl border border-line border-t-4 border-t-antique-gold bg-ivory p-5 shadow-card sm:p-7">
          <p className="text-sm font-semibold text-burgundy">دورة تدريبية</p>
          <h3 className="font-heading text-3xl font-bold leading-snug text-deep-teal">{course.title}</h3>
          <p className="max-w-prose text-base leading-loose text-text-soft">{course.subtitle.trim() || course.description}</p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm leading-relaxed text-text-soft">
            <li className="font-semibold text-burgundy">{course.price === 0 ? 'مجانية' : formatPrice(course.price)}</li>
            {course.lessonsCount > 0 && <li>{lessonsLabel(course.lessonsCount)}</li>}
            {course.durationMinutes > 0 && <li>{formatDuration(course.durationMinutes)}</li>}
          </ul>
          <Button href={course.reviewHref ?? `/courses/${encodeURIComponent(course.slug)}`} variant="primary" className="mt-auto">تفاصيل الدورة<span className="sr-only"> — {course.title}</span></Button>
        </article>)}
      </div>}
    </div>
  </Section>
}
