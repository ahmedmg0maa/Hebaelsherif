'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import PremiumBadge from '@/components/ui/PremiumBadge'
import PremiumEmptyState from '@/components/ui/PremiumEmptyState'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'
import PurchaseRequestButton from '@/components/products/PurchaseRequestButton'
import { getCourseBySlug, getCourseLessons } from '@/lib/firestore/courses'
import { formatEGP } from '@/lib/utils/formatters'
import type { Course, Lesson } from '@/types'

export default function CourseDetailsPage() {
  const params = useParams<{ slug: string }>()
  const slug = params.slug

  const [course, setCourse] = useState<Course | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!slug) return

    async function loadCourse() {
      try {
        setLoading(true)
        setError('')

        const courseData = await getCourseBySlug(slug)

        if (!courseData) {
          setCourse(null)
          setLessons([])
          return
        }

        const lessonsData = await getCourseLessons(courseData.id)

        setCourse(courseData)
        setLessons(lessonsData)
      } catch (loadError) {
        console.error('Course details error:', loadError)
        setError('تعذر تحميل بيانات الدورة الآن. حاولي مرة أخرى لاحقًا.')
      } finally {
        setLoading(false)
      }
    }

    loadCourse()
  }, [slug])

  return (
    <>
      <Navbar />

      <main className="min-h-screen pt-20">
        {loading ? (
          <section className="container-premium py-12">
            <PremiumSkeleton className="mb-8 h-96" />
            <PremiumSkeleton className="mb-4 h-10 w-72" />
            <PremiumSkeleton className="h-5 w-full max-w-2xl" />
          </section>
        ) : null}

        {!loading && error ? (
          <section className="container-premium py-12">
            <PremiumEmptyState
              icon="!"
              title="حدث خطأ"
              description={error}
              actionLabel="العودة للدورات"
              actionHref="/courses"
            />
          </section>
        ) : null}

        {!loading && !error && !course ? (
          <section className="container-premium py-12">
            <PremiumEmptyState
              icon="📚"
              title="الدورة غير موجودة"
              description="قد تكون الدورة غير منشورة أو تم تغيير الرابط."
              actionLabel="عرض كل الدورات"
              actionHref="/courses"
            />
          </section>
        ) : null}

        {!loading && !error && course ? (
          <>
            <section className="border-b border-sand bg-ivory/60">
              <div className="container-premium grid gap-10 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                <div>
                  <PremiumBadge>دورة</PremiumBadge>

                  <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight text-petrol md:text-6xl">
                    {course.title}
                  </h1>

                  <p className="mt-6 max-w-2xl text-base leading-9 text-warm-gray">
                    {course.emotionalPromise || course.description}
                  </p>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <span className="rounded-full border border-sand bg-cream px-5 py-2 text-sm font-bold text-charcoal">
                      {course.lessonsCount} درس
                    </span>

                    <span className="rounded-full border border-sand bg-cream px-5 py-2 text-sm font-bold text-charcoal">
                      {course.duration}
                    </span>

                    <span className="rounded-full border border-gold/20 bg-gold/10 px-5 py-2 text-sm font-bold text-gold">
                      {formatEGP(course.price)}
                    </span>
                  </div>
                </div>

                <div className="overflow-hidden rounded-[2rem] border border-sand bg-sand shadow-premium">
                  <div className="relative aspect-video">
                    {course.coverImageUrl ? (
                      <Image
                        src={course.coverImageUrl}
                        alt={course.title}
                        fill
                        priority
                        className="object-cover"
                        sizes="(max-width: 1024px) 100vw, 50vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-cream text-warm-gray">
                        صورة الدورة
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="container-premium grid gap-8 py-12 lg:grid-cols-[1fr_380px]">
              <div className="space-y-8">
                <article className="rounded-3xl border border-sand bg-ivory p-7 shadow-soft">
                  <h2 className="text-2xl font-black text-charcoal">عن هذه الدورة</h2>

                  <p className="mt-5 whitespace-pre-line text-sm leading-8 text-warm-gray">
                    {course.description}
                  </p>
                </article>

                {course.outcomes?.length ? (
                  <article className="rounded-3xl border border-sand bg-ivory p-7 shadow-soft">
                    <h2 className="text-2xl font-black text-charcoal">ماذا ستحصلين عليه؟</h2>

                    <ul className="mt-5 grid gap-3">
                      {course.outcomes.map((outcome) => (
                        <li
                          key={outcome}
                          className="rounded-2xl border border-sand bg-cream px-5 py-4 text-sm leading-7 text-charcoal"
                        >
                          <span className="ml-2 text-gold">✦</span>
                          {outcome}
                        </li>
                      ))}
                    </ul>
                  </article>
                ) : null}

                {course.targetAudience ? (
                  <article className="rounded-3xl border border-sand bg-ivory p-7 shadow-soft">
                    <h2 className="text-2xl font-black text-charcoal">لمن هذه الدورة؟</h2>

                    <p className="mt-5 text-sm leading-8 text-warm-gray">
                      {course.targetAudience}
                    </p>
                  </article>
                ) : null}

                <article className="rounded-3xl border border-sand bg-ivory p-7 shadow-soft">
                  <h2 className="text-2xl font-black text-charcoal">محتوى الدورة</h2>

                  {lessons.length > 0 ? (
                    <div className="mt-5 space-y-3">
                      {lessons.map((lesson, index) => (
                        <div
                          key={lesson.id}
                          className="rounded-2xl border border-sand bg-cream px-5 py-4"
                        >
                          <div className="flex gap-4">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-petrol text-xs font-black text-cream">
                              {index + 1}
                            </span>

                            <div>
                              <p className="text-xs font-bold text-gold">
                                {lesson.stageTitle}
                              </p>

                              <h3 className="mt-1 text-base font-black text-charcoal">
                                {lesson.title}
                              </h3>

                              <p className="mt-2 text-sm leading-7 text-warm-gray">
                                {lesson.description}
                              </p>

                              <p className="mt-2 text-xs font-bold text-warm-gray">
                                {lesson.duration} دقيقة
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-5 text-sm leading-8 text-warm-gray">
                      سيتم عرض تفاصيل الدروس هنا بعد إضافتها من لوحة الإدارة.
                    </p>
                  )}
                </article>
              </div>

              <aside className="h-fit rounded-3xl border border-sand bg-ivory p-6 shadow-premium lg:sticky lg:top-28">
                <p className="text-sm font-bold text-gold">الاستثمار في الرحلة</p>

                <strong className="mt-3 block text-4xl font-black text-petrol">
                  {formatEGP(course.price)}
                </strong>

                <p className="mt-4 text-sm leading-7 text-warm-gray">
                  بعد إرسال طلب الشراء، ستظهر حالته داخل لوحة المستخدم. عند تأكيد الدفع من الإدارة
                  يتم فتح محتوى الدورة تلقائيًا.
                </p>

                <PurchaseRequestButton
                  productId={course.id}
                  productType="course"
                  currentPath={`/courses/${course.slug}`}
                  paidRedirectHref={`/courses/${course.slug}/learn`}
                  className="mt-6"
                />
              </aside>
            </section>
          </>
        ) : null}
      </main>

      <Footer />
    </>
  )
}