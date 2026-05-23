import Image from 'next/image'
import Link from 'next/link'
import PremiumBadge from '@/components/ui/PremiumBadge'
import { formatEGP } from '@/lib/utils/formatters'
import type { Course } from '@/types'

interface CourseCardProps {
  course: Course
  featured?: boolean
}

export default function CourseCard({ course, featured = false }: CourseCardProps) {
  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group block overflow-hidden rounded-3xl border border-sand bg-ivory shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-premium"
    >
      <div className="relative aspect-video overflow-hidden bg-sand">
        {course.coverImageUrl ? (
          <Image
            src={course.coverImageUrl}
            alt={course.title}
            fill
            className="object-cover transition duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-cream text-sm font-bold text-warm-gray">
            صورة الدورة
          </div>
        )}

        {featured ? (
          <PremiumBadge className="absolute right-4 top-4">
            مميزة
          </PremiumBadge>
        ) : null}
      </div>

      <div className="p-6">
        <p className="mb-3 text-xs font-bold text-gold">
          {course.lessonsCount} درس · {course.duration}
        </p>

        <h3 className="text-xl font-black leading-snug text-charcoal">
          {course.title}
        </h3>

        <p className="mt-3 line-clamp-3 text-sm leading-7 text-warm-gray">
          {course.emotionalPromise || course.description}
        </p>

        <div className="mt-6 flex items-center justify-between gap-4">
          <span className="text-lg font-black text-petrol">
            {formatEGP(course.price)}
          </span>

          <span className="rounded-full border border-petrol/20 bg-petrol/10 px-4 py-2 text-xs font-bold text-petrol">
            التفاصيل
          </span>
        </div>
      </div>
    </Link>
  )
}