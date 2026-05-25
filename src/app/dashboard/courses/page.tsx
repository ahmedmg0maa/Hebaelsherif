'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import BrandOrnament from '@/components/brand/BrandOrnament'
import ImageSlot from '@/components/ui/ImageSlot'
import PremiumButton from '@/components/ui/PremiumButton'
import PremiumEmptyState from '@/components/ui/PremiumEmptyState'
import PremiumProgressBar from '@/components/ui/PremiumProgressBar'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'
import { db } from '@/lib/firebase/client'
import { useAuth } from '@/hooks/useAuth'
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

      const ordersSnap = await getDocs(query(collection(db, 'orders'), where('userId', '==', userId)))
      const paidCourseOrders = ordersSnap.docs
        .map((docItem) => ({ id: docItem.id, ...docItem.data() }) as Order)
        .filter((order) => order.productType === 'course' && order.status === 'paid')

      const courses = await Promise.all(
        paidCourseOrders.map(async (order) => {
          const courseSnap = await getDoc(doc(db, 'courses', order.productId))
          if (!courseSnap.exists()) return null

          const progressSnap = await getDoc(doc(db, 'course_progress', `${userId}_${order.productId}`))

          return {
            course: { id: courseSnap.id, ...courseSnap.data() } as Course,
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
      <div className="space-y-6">
        <PremiumSkeleton className="h-56" />
        <div className="grid gap-5 lg:grid-cols-2">
          <PremiumSkeleton className="h-80" />
          <PremiumSkeleton className="h-80" />
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <PremiumEmptyState
        icon="◈"
        title="كورسات جديدة قيد الإعداد"
        description="بعد تأكيد شراء أي كورس، سيظهر هنا مع تقدّمك وآخر درس وصلتِ إليه."
        actionLabel="استكشفي الكورسات"
        actionHref="/courses"
      />
    )
  }

  const averageProgress = Math.round(
    items.reduce((sum, item) => sum + Number(item.progress?.progressPercent || 0), 0) / items.length,
  )

  return (
    <div className="space-y-8">
      <section className="premium-glow-border rounded-[2.5rem] border border-sand bg-ivory/90 p-6 shadow-premium backdrop-blur-sm lg:p-8">
        <BrandOrnament className="mb-5" />
        <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-end">
          <div>
            <p className="mini-label mb-3">كورساتي</p>
            <h2 className="text-4xl font-black leading-tight text-petrol md:text-5xl">مساراتك التعليمية المفتوحة</h2>
            <p className="mt-4 max-w-2xl text-sm leading-8 text-warm-gray">
              تابعي كل كورس مؤكد، أكملي من حيث توقفتِ، وراجعي الموارد المرتبطة بكل مسار.
            </p>
          </div>
          <div className="rounded-[2rem] border border-sand bg-cream/70 p-5">
            <p className="text-xs font-black text-warm-gray">متوسط تقدمك</p>
            <strong className="mt-2 block text-4xl font-black text-petrol latin-numerals">{averageProgress}%</strong>
            <PremiumProgressBar value={averageProgress} className="mt-4" />
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {items.map(({ course, progress }) => (
          <Link
            key={course.id}
            href={`/courses/${course.slug}/learn`}
            className="group overflow-hidden rounded-[2.25rem] border border-sand bg-ivory/90 shadow-soft backdrop-blur-sm transition hover:-translate-y-1 hover:shadow-premium"
          >
            <ImageSlot
              src={course.coverImageUrl}
              alt={course.title}
              ratio="video"
              variant="course"
              label="صورة الكورس"
              hint="غلاف الكورس يظهر هنا عند إضافته."
              className="rounded-none border-0 shadow-none"
            />

            <div className="p-6">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-gold/20 bg-gold/10 px-3 py-1 text-xs font-black text-gold">
                  {course.category || 'مسار وعي'}
                </span>
                <span className="rounded-full border border-petrol/15 bg-petrol/10 px-3 py-1 text-xs font-black text-petrol">
                  {course.lessonsCount} درس · {course.duration}
                </span>
              </div>

              <h3 className="text-2xl font-black text-charcoal transition group-hover:text-petrol">{course.title}</h3>
              <p className="mt-3 line-clamp-2 text-sm leading-7 text-warm-gray">{course.emotionalPromise}</p>

              <div className="mt-6">
                <PremiumProgressBar value={progress?.progressPercent || 0} showLabel />
              </div>

              <div className="mt-6 flex items-center justify-between gap-4">
                <span className="text-sm font-black text-petrol">أكملي الرحلة ←</span>
                <span className="text-xs font-bold text-warm-gray">
                  آخر درس: {progress?.lastLessonId ? 'محفوظ' : 'ابدئي الآن'}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
