'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { collection, getDocs, limit, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import { useAuth } from '@/hooks/useAuth'
import type { Course } from '@/types'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import PremiumEmptyState from '@/components/ui/PremiumEmptyState'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'
import PremiumButton from '@/components/ui/PremiumButton'
import PremiumBadge from '@/components/ui/PremiumBadge'
import BrandMark from '@/components/brand/BrandMark'
import { trackConversionEvent } from '@/lib/marketing/events'

interface LessonPayload {
  id: string
  title: string
  description?: string
  duration?: number
  order?: number
  stageTitle?: string
  contentUrl?: string
  resourceUrl?: string
}

interface LearningPayload {
  hasAccess: boolean
  lessons: LessonPayload[]
  contentUrl?: string
  resourceUrl?: string
  error?: string
}

export default function CourseLearningPage() {
  const params = useParams<{ slug: string }>()
  const slug = decodeURIComponent(params.slug || '')
  const { firebaseUser, loading: authLoading } = useAuth()
  const [course, setCourse] = useState<Course | null>(null)
  const [payload, setPayload] = useState<LearningPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeLessonId, setActiveLessonId] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    async function load() {
      if (authLoading) return
      setLoading(true)
      setError('')
      try {
        const courseSnap = await getDocs(query(collection(db, 'courses'), where('slug', '==', slug), limit(1)))
        if (courseSnap.empty) {
          if (mounted) setCourse(null)
          return
        }
        const nextCourse = { id: courseSnap.docs[0].id, ...(courseSnap.docs[0].data() as Record<string, unknown>) } as Course
        if (mounted) setCourse(nextCourse)

        if (!firebaseUser) {
          if (mounted) setError('يجب تسجيل الدخول لفتح مساحة التعلم.')
          return
        }

        const token = await firebaseUser.getIdToken()
        const response = await fetch('/api/learning/course', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ productId: nextCourse.id }),
        })
        const data = (await response.json()) as LearningPayload
        if (!response.ok) {
          if (mounted) setError(data.error || 'لا يوجد وصول لهذا الكورس.')
          return
        }
        if (mounted) {
          setPayload(data)
          setActiveLessonId(data.lessons[0]?.id || '')
          trackConversionEvent({ name: 'access_content', source: 'course_learning', metadata: { productId: nextCourse.id, slug } })
        }
      } catch (loadError) {
        console.error('Course learning load error:', loadError)
        if (mounted) setError('مساحة التعلم غير متاحة الآن. أعيدي المحاولة بعد قليل أو راجعي حالة الطلب من لوحة حسابك.')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [authLoading, firebaseUser, slug])

  const activeLesson = useMemo(() => payload?.lessons.find((lesson) => lesson.id === activeLessonId) || payload?.lessons[0], [activeLessonId, payload])

  async function markComplete() {
    if (!firebaseUser || !course || !activeLesson) return
    try {
      const token = await firebaseUser.getIdToken()
      const completedCount = payload?.lessons.findIndex((lesson) => lesson.id === activeLesson.id) ?? 0
      const percent = payload?.lessons.length ? Math.round(((completedCount + 1) / payload.lessons.length) * 100) : 0
      await fetch('/api/learning/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ courseId: course.id, lessonId: activeLesson.id, progressPercent: percent }),
      })
      trackConversionEvent({ name: 'complete_lesson', source: 'course_learning', metadata: { courseId: course.id, lessonId: activeLesson.id } })
    } catch (progressError) {
      console.warn('Progress update failed:', progressError)
    }
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20">
        {loading ? <section className="container-premium py-12"><PremiumSkeleton className="h-[30rem]" /></section> : null}

        {!loading && (!course || error) ? (
          <section className="container-premium py-12">
            <PremiumEmptyState
              icon="◇"
              title={course ? 'مساحة التعلم غير متاحة الآن' : 'الكورس غير موجود'}
              description={error || 'قد يكون الكورس غير منشور أو تم تغيير الرابط.'}
              actionLabel={firebaseUser ? 'العودة لكورساتي' : 'تسجيل الدخول'}
              actionHref={firebaseUser ? '/dashboard/courses' : `/auth/login?next=${encodeURIComponent(`/courses/${slug}/learn`)}`}
            />
          </section>
        ) : null}

        {!loading && course && !error ? (
          <section className="container-premium py-10">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="mini-label">مساحة تعلم محمية</p>
                <h1 className="brand-title mt-2 text-3xl font-black text-petrol md:text-5xl">{course.title}</h1>
                <p className="mt-3 max-w-2xl text-sm font-bold leading-7 text-warm-gray">تابعي المحتوى من حسابك فقط. لا تشاركي روابط الوصول المدفوع.</p>
              </div>
              <PremiumButton href="/dashboard/courses" variant="outline">كورساتي</PremiumButton>
            </div>

            <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
              <aside className="rounded-[2rem] border border-sand bg-ivory p-5 shadow-soft dark:border-gold/25 dark:bg-white/10">
                <div className="mb-5 flex items-center gap-3">
                  <BrandMark size="sm" />
                  <div>
                    <p className="text-sm font-black text-charcoal dark:text-ivory">خريطة الدروس</p>
                    <p className="text-xs font-bold text-warm-gray dark:text-cream">اختاري الدرس ثم حددي التقدم.</p>
                  </div>
                </div>
                {payload?.lessons.length ? (
                  <div className="space-y-2">
                    {payload.lessons.map((lesson, index) => (
                      <button
                        key={lesson.id}
                        type="button"
                        onClick={() => setActiveLessonId(lesson.id)}
                        className={`w-full rounded-2xl border px-4 py-3 text-right text-sm font-black transition ${activeLesson?.id === lesson.id ? 'border-gold bg-gold/15 text-deepTeal dark:text-ivory' : 'border-sand bg-cream text-warm-gray hover:border-gold dark:border-gold/20 dark:bg-white/10 dark:text-cream'}`}
                      >
                        <span className="block text-xs text-gold">الدرس {index + 1}</span>
                        {lesson.title}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-gold/40 bg-gold/10 p-5 text-sm font-bold leading-7 text-warm-gray dark:text-cream">
                    الدروس التفصيلية ستظهر هنا عند إضافتها من الإدارة. استخدمي رابط مساحة التعلم الرئيسي لحين تجهيز الدروس.
                  </div>
                )}
              </aside>

              <article className="rounded-[2rem] border border-sand bg-ivory p-6 shadow-premium dark:border-gold/25 dark:bg-white/10">
                <div className="flex flex-wrap items-center gap-2">
                  <PremiumBadge variant="gold">وصول مدفوع</PremiumBadge>
                  <PremiumBadge variant="petrol">حساب محمي</PremiumBadge>
                </div>
                <h2 className="mt-5 text-2xl font-black text-charcoal dark:text-ivory">{activeLesson?.title || 'مساحة الكورس'}</h2>
                {activeLesson?.description ? <p className="mt-3 text-sm font-bold leading-8 text-warm-gray dark:text-cream">{activeLesson.description}</p> : null}

                <div className="mt-6 rounded-[1.75rem] border border-gold/25 bg-gold/10 p-5">
                  <p className="text-sm font-black text-deepTeal dark:text-ivory">رابط المحتوى المحمي</p>
                  <p className="mt-2 text-xs font-bold leading-6 text-warm-gray dark:text-cream">يفتح الرابط فقط بعد تحقق الوصول من الخادم. إذا تغيّر الرابط من الإدارة سيظهر تلقائيًا هنا.</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {(activeLesson?.contentUrl || payload?.contentUrl) ? <PremiumButton href={activeLesson?.contentUrl || payload?.contentUrl || '#'} variant="primary" target="_blank">فتح الدرس</PremiumButton> : null}
                    {(activeLesson?.resourceUrl || payload?.resourceUrl) ? <PremiumButton href={activeLesson?.resourceUrl || payload?.resourceUrl || '#'} variant="outline" target="_blank">المرفقات</PremiumButton> : null}
                    <PremiumButton type="button" variant="gold" onClick={markComplete}>تحديد كمكتمل</PremiumButton>
                  </div>
                </div>
              </article>
            </div>
          </section>
        ) : null}
      </main>
      <Footer />
    </>
  )
}
