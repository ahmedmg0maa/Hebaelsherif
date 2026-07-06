import Link from 'next/link'
import PremiumBadge from '@/components/ui/PremiumBadge'
import ImageSlot from '@/components/ui/ImageSlot'
import { formatEGP } from '@/lib/utils/formatters'
import type { Course } from '@/types'

interface CourseCardProps {
  course: Course
  featured?: boolean
  compact?: boolean
}

function getCourseLevel(course: Course) {
  return course.level || 'رحلة وعي'
}

export default function CourseCard({ course, featured = false, compact = false }: CourseCardProps) {
  const hasLessonsCount = Number(course.lessonsCount || 0) > 0
  const hasRating = typeof course.rating === 'number' && course.rating > 0
  const hasStudentsCount = typeof course.studentsCount === 'number' && course.studentsCount > 0

  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group premium-glow-border block overflow-hidden rounded-[2rem] border border-sand bg-ivory/88 shadow-soft backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-gold/45 hover:shadow-premium dark:bg-deep-teal/55"
    >
      <div className="relative">
        <ImageSlot
          src={course.coverImageUrl}
          alt={course.title}
          ratio="video"
          variant="course"
          label="صورة الكورس"
          hint="غلاف بصري للمسار."
          showLabel={!course.coverImageUrl}
          className="rounded-b-none border-0 shadow-none"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-deep-teal/34 via-transparent to-transparent" />

        <div className="absolute right-4 top-4 flex flex-wrap gap-2">
          {featured ? <PremiumBadge variant="gold">منشور</PremiumBadge> : null}
          {course.category ? <PremiumBadge variant="gold">{course.category}</PremiumBadge> : null}
        </div>

        <div className="absolute bottom-4 left-4 rounded-full border border-white/35 bg-ivory/75 px-3 py-1 text-xs font-black text-petrol shadow-soft backdrop-blur-md">
          {getCourseLevel(course)}
        </div>
      </div>

      <div className={compact ? 'p-5' : 'p-6'}>
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-black text-warm-gray">
          {hasLessonsCount ? <span className="rounded-full bg-petrol/10 px-3 py-1 text-petrol">{course.lessonsCount} درس</span> : null}
          {course.duration ? <span className="rounded-full bg-gold/10 px-3 py-1 text-gold">{course.duration}</span> : null}
          {hasRating ? <span className="rounded-full bg-cream px-3 py-1 text-warm-gray">★ {course.rating}</span> : null}
          {!hasLessonsCount && !course.duration && !hasRating ? <span className="rounded-full bg-cream px-3 py-1 text-warm-gray">تفاصيل الرحلة داخل الصفحة</span> : null}
        </div>

        <h3 className="text-xl font-black leading-snug text-charcoal transition group-hover:text-petrol dark:text-ivory">
          {course.title}
        </h3>

        <p className="mt-3 line-clamp-3 text-sm leading-7 text-warm-gray">
          {course.emotionalPromise || course.description}
        </p>

        <div className="mt-6 flex items-center justify-between gap-4 border-t border-sand pt-5">
          <div>
            <span className="block text-[11px] font-black text-warm-gray">الاستثمار</span>
            {Number(course.price) > 0 ? <span className="text-lg font-black text-petrol dark:text-gold">{formatEGP(course.price)}</span> : <span className="text-lg font-black text-petrol dark:text-gold">يُعلن عند الفتح</span>}
          </div>

          {hasStudentsCount ? (
            <div className="text-left">
              <span className="block text-[11px] font-black text-warm-gray">المنضمات</span>
              <span className="text-xs font-black text-charcoal dark:text-ivory">{course.studentsCount}</span>
            </div>
          ) : null}
        </div>

        <span className="mt-5 inline-flex w-full items-center justify-center rounded-full border border-petrol/20 bg-petrol/10 px-4 py-3 text-xs font-black text-petrol transition group-hover:bg-petrol group-hover:text-ivory">
          عرض تفاصيل الرحلة
        </span>
      </div>
    </Link>
  )
}
