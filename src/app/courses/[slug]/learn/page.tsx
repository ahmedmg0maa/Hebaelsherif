'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import PremiumButton from '@/components/ui/PremiumButton'
import PremiumEmptyState from '@/components/ui/PremiumEmptyState'
import PremiumProgressBar from '@/components/ui/PremiumProgressBar'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'
import ProtectedContentNotice from '@/components/ui/ProtectedContentNotice'
import ContentProtection from '@/components/security/ContentProtection'
import { useAuth } from '@/hooks/useAuth'
import { db } from '@/lib/firebase/client'
import { getCourseBySlug, getCourseLessons } from '@/lib/firestore/courses'
import type { Course, CourseProgress, Lesson } from '@/types'
import type { User as FirebaseUser } from 'firebase/auth'

interface VerifyAccessResponse {
  hasAccess: boolean
  contentUrl?: string
  resourceUrl?: string
  error?: string
}

export default function CourseLearnPage() {
  const params = useParams<{ slug: string }>()
  const slug = params.slug
  const router = useRouter()

  const { user, firebaseUser, loading: authLoading } = useAuth()

  const [course, setCourse] = useState<Course | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [progress, setProgress] = useState<CourseProgress | null>(null)
  const [contentUrl, setContentUrl] = useState('')
  const [resourceUrl, setResourceUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (authLoading) return

    if (!user || !firebaseUser) {
      router.push(`/auth/login?next=${encodeURIComponent(`/courses/${slug}/learn`)}`)
      return
    }

    async function loadProtectedCourse(authUser: FirebaseUser, userId: string) {
      try {
        setLoading(true)
        setAccessDenied(false)
        setError('')

        const courseData = await getCourseBySlug(slug)

        if (!courseData) {
          setCourse(null)
          return
        }

        const token = await authUser.getIdToken()

        const accessResponse = await fetch('/api/verify-access', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            productId: courseData.id,
            productType: 'course',
          }),
        })

        const accessData = (await accessResponse.json()) as VerifyAccessResponse

        if (!accessResponse.ok || !accessData.hasAccess) {
          setCourse(courseData)
          setAccessDenied(true)
          setError(accessData.error || 'لا يوجد وصول لهذا المحتوى.')
          return
        }

        const [lessonsData, progressSnap] = await Promise.all([
          getCourseLessons(courseData.id),
          getDoc(doc(db, 'course_progress', `${userId}_${courseData.id}`)),
        ])

        setCourse(courseData)
        setLessons(lessonsData)
        setContentUrl(accessData.contentUrl || '')
        setResourceUrl(accessData.resourceUrl || '')
        setProgress(progressSnap.exists() ? (progressSnap.data() as CourseProgress) : null)
      } catch (loadError) {
        console.error('Course learn load error:', loadError)
        setError('تعذر تحميل محتوى الكورس الآن.')
      } finally {
        setLoading(false)
      }
    }

    loadProtectedCourse(firebaseUser, user.uid)
  }, [authLoading, firebaseUser, router, slug, user])

  async function markCourseStarted() {
    if (!user || !course) return

    const completedLessonIds = progress?.completedLessonIds || []
    const lastLessonId = lessons[0]?.id || progress?.lastLessonId || ''

    await setDoc(
      doc(db, 'course_progress', `${user.uid}_${course.id}`),
      {
        userId: user.uid,
        courseId: course.id,
        completedLessonIds,
        lastLessonId,
        progressPercent: progress?.progressPercent || 0,
        lastViewedAt: serverTimestamp(),
      },
      { merge: true },
    )

    setProgress({
      userId: user.uid,
      courseId: course.id,
      completedLessonIds,
      lastLessonId,
      progressPercent: progress?.progressPercent || 0,
      lastViewedAt: new Date(),
    })
  }

  if (authLoading || loading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-20">
          <section className="container-premium py-12">
            <PremiumSkeleton className="mb-6 h-10 w-72" />
            <PremiumSkeleton className="mb-5 h-96" />
            <PremiumSkeleton className="h-32" />
          </section>
        </main>
        <Footer />
      </>
    )
  }

  if (!course) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-20">
          <section className="container-premium py-12">
            <PremiumEmptyState
              icon="📚"
              title="الكورس غير موجود"
              description="قد يكون الكورس قيد المراجعة أو تم تغيير الرابط."
              actionLabel="عرض الكورسات"
              actionHref="/courses"
            />
          </section>
        </main>
        <Footer />
      </>
    )
  }

  if (accessDenied) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-20">
          <ProtectedContentNotice
            productTitle={course.title}
            productType="course"
            description={error}
            purchaseHref={`/courses/${course.slug}`}
            backHref="/dashboard/courses"
          />
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen pt-20">
        <section className="border-b border-sand bg-ivory/60">
          <div className="container-premium py-10">
            <Link
              href="/dashboard/courses"
              className="mb-4 inline-block text-sm font-bold text-warm-gray transition hover:text-petrol"
            >
              ← العودة لكورساتي
            </Link>

            <h1 className="text-4xl font-black leading-tight text-petrol">{course.title}</h1>

            <p className="mt-4 max-w-2xl text-sm leading-8 text-warm-gray">
              محتوى الكورس متاح لكِ الآن بعد تأكيد الوصول.
            </p>

            <div className="mt-6 max-w-xl">
              <PremiumProgressBar value={progress?.progressPercent || 0} showLabel />
            </div>
          </div>
        </section>

        <section className="container-premium grid gap-8 py-10 lg:grid-cols-[1fr_360px]">
          <div className="rounded-[2rem] border border-sand bg-ivory p-5 shadow-soft">
            <ContentProtection userLabel={user?.email || user?.uid || 'حساب خاص'} productTitle={course.title} className="border border-sand bg-cream">
              {contentUrl ? (
                <iframe
                  src={contentUrl}
                  title={course.title}
                  className="h-[520px] w-full rounded-[2rem]"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="flex h-[420px] items-center justify-center text-sm font-bold text-warm-gray">
                  رابط المحتوى غير متاح حاليًا.
                </div>
              )}
            </ContentProtection>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <PremiumButton type="button" onClick={markCourseStarted}>
                حفظ آخر مشاهدة
              </PremiumButton>

              {resourceUrl ? (
                <PremiumButton href={resourceUrl} variant="outline">
                  فتح الموارد
                </PremiumButton>
              ) : null}
            </div>
          </div>

          <aside className="h-fit rounded-[2rem] border border-sand bg-ivory p-6 shadow-soft lg:sticky lg:top-28">
            <p className="mb-3 text-sm font-bold text-gold">دروس الكورس</p>

            {lessons.length > 0 ? (
              <div className="space-y-3">
                {lessons.map((lesson, index) => (
                  <div key={lesson.id} className="rounded-2xl border border-sand bg-cream p-4">
                    <p className="text-xs font-bold text-gold">
                      {index + 1}. {lesson.stageTitle}
                    </p>

                    <h3 className="mt-2 text-sm font-black text-charcoal">{lesson.title}</h3>

                    <p className="mt-2 text-xs leading-6 text-warm-gray">{lesson.description}</p>

                    <p className="mt-2 text-xs font-bold text-warm-gray">{lesson.duration} دقيقة</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-7 text-warm-gray">
                لم يتم إضافة دروس لهذه الكورس بعد.
              </p>
            )}
          </aside>
        </section>
      </main>

      <Footer />
    </>
  )
}