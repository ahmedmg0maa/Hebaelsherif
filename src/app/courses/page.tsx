'use client'

import { useEffect, useState } from 'react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import CourseCard from '@/components/courses/CourseCard'
import PremiumEmptyState from '@/components/ui/PremiumEmptyState'
import PremiumSection from '@/components/ui/PremiumSection'
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
        setError('تعذر تحميل الكورسات الآن. حاولي مرة أخرى لاحقًا.')
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
        <section className="container-premium relative overflow-hidden py-16 text-center">
          <div className="ambient-orb ambient-orb-rose right-0 top-10 h-56 w-56" />
          <div className="relative mx-auto max-w-3xl">
            <p className="mini-label mb-3">الكورسات</p>
            <h1 className="text-balance text-4xl font-black leading-tight text-charcoal md:text-6xl">
              رحلات تعليمية عميقة للوعي والحدود والعلاقات
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-sm leading-8 text-warm-gray md:text-base">
              اختاري الكورس المناسب لمرحلتك الحالية وابدئي تعلمًا منظّمًا داخل حسابك، مع محتوى محمي وتقدم محفوظ.
            </p>
          </div>
        </section>

        <section className="container-premium pb-16">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-[2rem] border border-sand bg-ivory/80 p-4 shadow-soft backdrop-blur-sm">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-petrol px-4 py-2 text-xs font-black text-ivory">كل الكورسات</span>
              <span className="rounded-full border border-sand bg-cream px-4 py-2 text-xs font-black text-warm-gray">جديدة</span>
              <span className="rounded-full border border-sand bg-cream px-4 py-2 text-xs font-black text-warm-gray">الأكثر طلبًا</span>
            </div>
            <p className="text-xs font-bold text-warm-gray">المحتوى يفتح بعد تأكيد الدفع من الإدارة</p>
          </div>

          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <CourseCardSkeleton /><CourseCardSkeleton /><CourseCardSkeleton />
            </div>
          ) : null}

          {!loading && error ? <PremiumEmptyState icon="!" title="حدث خطأ" description={error} actionLabel="العودة للرئيسية" actionHref="/" /> : null}

          {!loading && !error && courses.length === 0 ? (
            <PremiumEmptyState icon="📚" title="الكورسات قيد الإعداد" description="يتم إعداد مسارات تعليمية جديدة بعناية. عودي قريبًا لتجربة أكثر اكتمالًا." actionLabel="احجزي جلسة خاصة" actionHref="/booking" />
          ) : null}

          {!loading && !error && courses.length > 0 ? (
            <PremiumSection title="الكورسات المتاحة" eyebrow="ابدئي الآن">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {courses.map((course, index) => <CourseCard key={course.id} course={course} featured={index === 0} />)}
              </div>
            </PremiumSection>
          ) : null}
        </section>
      </main>
      <Footer />
    </>
  )
}
