'use client'

import { useEffect, useState } from 'react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import CourseCard from '@/components/courses/CourseCard'
import PremiumEmptyState from '@/components/ui/PremiumEmptyState'
import { CourseCardSkeleton } from '@/components/ui/PremiumSkeleton'
import { getPublishedCourses } from '@/lib/firestore/courses'
import type { Course } from '@/types'

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadCourses() {
      try {
        setLoading(true)
        setError('')

        const publishedCourses = await getPublishedCourses()
        setCourses(publishedCourses)
      } catch (loadError) {
        console.error('Courses page error:', loadError)
        setError('تعذر تحميل الدورات الآن. حاولي مرة أخرى لاحقًا.')
      } finally {
        setLoading(false)
      }
    }

    loadCourses()
  }, [])

  return (
    <>
      <Navbar />

      <main className="min-h-screen pt-20">
        <section className="border-b border-sand bg-ivory/60">
          <div className="container-premium py-16">
            <p className="mb-3 text-sm font-bold tracking-[0.25em] text-gold">
              الدورات
            </p>

            <h1 className="max-w-3xl text-4xl font-black leading-tight text-petrol md:text-6xl">
              رحلات تعليمية هادئة لفهم الذات والعلاقات
            </h1>

            <p className="mt-6 max-w-2xl text-sm leading-8 text-warm-gray">
              اختاري الدورة المناسبة لمرحلتك الحالية، وابدئي رحلة منظمة نحو الوعي،
              الحدود، والتوازن العاطفي.
            </p>
          </div>
        </section>

        <section className="container-premium py-12">
          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <CourseCardSkeleton />
              <CourseCardSkeleton />
              <CourseCardSkeleton />
            </div>
          ) : null}

          {!loading && error ? (
            <PremiumEmptyState
              icon="!"
              title="حدث خطأ"
              description={error}
              actionLabel="العودة للرئيسية"
              actionHref="/"
            />
          ) : null}

          {!loading && !error && courses.length === 0 ? (
            <PremiumEmptyState
              icon="📚"
              title="لا توجد دورات منشورة حاليًا"
              description="عند نشر أول دورة من لوحة الإدارة ستظهر هنا تلقائيًا."
              actionLabel="احجزي جلسة خاصة"
              actionHref="/booking"
            />
          ) : null}

          {!loading && !error && courses.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {courses.map((course, index) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  featured={index === 0}
                />
              ))}
            </div>
          ) : null}
        </section>
      </main>

      <Footer />
    </>
  )
}