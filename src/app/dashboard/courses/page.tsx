'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import { useAuth } from '@/hooks/useAuth'
import PremiumEmptyState from '@/components/ui/PremiumEmptyState'
import PremiumProgressBar from '@/components/ui/PremiumProgressBar'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'
import type { Course, CourseProgress, Order } from '@/types'

interface OwnedCourse {
  course: Course
  progress: CourseProgress | null
}

export default function DashboardCoursesPage() {
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<OwnedCourse[]>([])

  useEffect(() => {
    const userId = user?.uid

    if (!userId) return

    async function loadCourses() {
      setLoading(true)

      const ordersSnap = await getDocs(
        query(collection(db, 'orders'), where('userId', '==', userId)),
      )

      const paidCourseOrders = ordersSnap.docs
        .map((docItem) => ({ id: docItem.id, ...docItem.data() }) as Order)
        .filter((order) => order.productType === 'course' && order.status === 'paid')

      const courses = await Promise.all(
        paidCourseOrders.map(async (order) => {
          const courseSnap = await getDoc(doc(db, 'courses', order.productId))

          if (!courseSnap.exists()) return null

          const progressSnap = await getDoc(
            doc(db, 'course_progress', `${userId}_${order.productId}`),
          )

          return {
            course: {
              id: courseSnap.id,
              ...courseSnap.data(),
            } as Course,
            progress: progressSnap.exists() ? (progressSnap.data() as CourseProgress) : null,
          }
        }),
      )

      setItems(courses.filter(Boolean) as OwnedCourse[])
      setLoading(false)
    }

    loadCourses().catch((error) => {
      console.error('Dashboard courses error:', error)
      setLoading(false)
    })
  }, [user?.uid])

  if (loading) {
    return (
      <div className="grid gap-5 md:grid-cols-2">
        <PremiumSkeleton className="h-56" />
        <PremiumSkeleton className="h-56" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <PremiumEmptyState
        icon="📚"
        title="لا توجد دورات بعد"
        description="بعد تأكيد شراء أي دورة، ستظهر هنا ويمكنك متابعة رحلتك منها."
        actionLabel="استكشفي الدورات"
        actionHref="/courses"
      />
    )
  }

  return (
    <div>
      <div className="mb-8">
        <p className="mb-2 text-sm font-bold text-gold">دوراتي</p>
        <h2 className="text-3xl font-black text-charcoal">الدورات المتاحة لكِ</h2>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {items.map(({ course, progress }) => (
          <Link
            key={course.id}
            href={`/courses/${course.slug}/learn`}
            className="group overflow-hidden rounded-3xl border border-sand bg-ivory shadow-soft transition hover:-translate-y-1 hover:shadow-premium"
          >
            <div className="relative aspect-video bg-sand">
              {course.coverImageUrl ? (
                <Image
                  src={course.coverImageUrl}
                  alt={course.title}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm font-bold text-warm-gray">
                  صورة الدورة
                </div>
              )}
            </div>

            <div className="p-6">
              <p className="mb-2 text-xs font-bold text-gold">
                {course.lessonsCount} درس · {course.duration}
              </p>

              <h3 className="text-xl font-black text-charcoal">{course.title}</h3>

              <p className="mt-3 line-clamp-2 text-sm leading-7 text-warm-gray">
                {course.emotionalPromise}
              </p>

              <div className="mt-5">
                <PremiumProgressBar value={progress?.progressPercent || 0} showLabel />
              </div>

              <span className="mt-5 inline-block text-sm font-bold text-petrol">
                أكملي الرحلة ←
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}