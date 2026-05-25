'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import BrandDivider from '@/components/brand/BrandDivider'
import PremiumBadge from '@/components/ui/PremiumBadge'
import PremiumButton from '@/components/ui/PremiumButton'
import PremiumCard from '@/components/ui/PremiumCard'
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

interface LessonGroup {
  title: string
  lessons: Lesson[]
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
  const [activeLessonId, setActiveLessonId] = useState('')
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
          getCourseLessons(courseData.id, token),
          getDoc(doc(db, 'course_progress', `${userId}_${courseData.id}`)),
        ])

        const loadedProgress = progressSnap.exists() ? (progressSnap.data() as CourseProgress) : null
        const initialLessonId = loadedProgress?.lastLessonId || lessonsData[0]?.id || ''

        setCourse(courseData)
        setLessons(lessonsData)
        setContentUrl(accessData.contentUrl || '')
        setResourceUrl(accessData.resourceUrl || '')
        setProgress(loadedProgress)
        setActiveLessonId(initialLessonId)
      } catch (loadError) {
        console.error('Course learn load error:', loadError)
        setError('المحتوى غير متاح الآن. راجعي حالة الطلب من لوحة حسابك أو تواصلي معنا.')
      } finally {
        setLoading(false)
      }
    }

    loadProtectedCourse(firebaseUser, user.uid)
  }, [authLoading, firebaseUser, router, slug, user])

  const completedLessonIds = useMemo(() => progress?.completedLessonIds || [], [progress])
  const activeLesson = useMemo(
    () => lessons.find((lesson) => lesson.id === activeLessonId) || lessons[0] || null,
    [activeLessonId, lessons],
  )
  const lessonGroups = useMemo(() => groupLessonsByStage(lessons), [lessons])
  const safeProgress = lessons.length > 0 ? Math.round((completedLessonIds.length / lessons.length) * 100) : progress?.progressPercent || 0
  const activeContentUrl = activeLesson?.contentUrl || contentUrl
  const activeResourceUrl = activeLesson?.resourceUrl || resourceUrl

  async function persistProgress(nextCompletedLessonIds: string[], lastLessonId: string) {
    if (!user || !course) return

    const progressPercent = lessons.length > 0 ? Math.round((nextCompletedLessonIds.length / lessons.length) * 100) : 0

    await setDoc(
      doc(db, 'course_progress', `${user.uid}_${course.id}`),
      {
        userId: user.uid,
        courseId: course.id,
        completedLessonIds: nextCompletedLessonIds,
        lastLessonId,
        progressPercent,
        lastViewedAt: serverTimestamp(),
      },
      { merge: true },
    )

    setProgress({
      userId: user.uid,
      courseId: course.id,
      completedLessonIds: nextCompletedLessonIds,
      lastLessonId,
      progressPercent,
      lastViewedAt: new Date(),
    })
  }

  async function handleSelectLesson(lessonId: string) {
    setActiveLessonId(lessonId)
    await persistProgress(completedLessonIds, lessonId)
  }

  async function markActiveLessonComplete() {
    if (!activeLesson) return

    const nextCompleted = completedLessonIds.includes(activeLesson.id)
      ? completedLessonIds
      : [...completedLessonIds, activeLesson.id]

    await persistProgress(nextCompleted, activeLesson.id)
  }

  async function goToRelativeLesson(direction: 'next' | 'previous') {
    if (!activeLesson) return

    const currentIndex = lessons.findIndex((lesson) => lesson.id === activeLesson.id)
    const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1
    const nextLesson = lessons[nextIndex]

    if (!nextLesson) return
    await handleSelectLesson(nextLesson.id)
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
        <section className="paper-texture relative overflow-hidden border-b border-gold/15 bg-petrol text-ivory">
          <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-gold/18 blur-3xl" />
          <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-aqua/10 blur-3xl" />
          <div className="container-premium relative py-10">
            <Link
              href="/dashboard/courses"
              className="mb-5 inline-flex rounded-full border border-white/15 bg-white/8 px-4 py-2 text-xs font-bold text-ivory/75 transition hover:text-gold"
            >
              ← العودة لكورساتي
            </Link>

            <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
              <div>
                <PremiumBadge variant="gold">مساحة تعلم محمية</PremiumBadge>
                <h1 className="mt-5 max-w-4xl text-4xl font-black leading-tight md:text-6xl">{course.title}</h1>
                <p className="mt-5 max-w-2xl text-sm font-bold leading-8 text-ivory/72">
                  اختاري الدرس، شاهدي المحتوى، واحفظي تقدمك خطوة بخطوة داخل مساحة شخصية محمية.
                </p>
              </div>

              <PremiumCard className="border-white/10 bg-white/8 p-5 text-ivory">
                <p className="text-xs font-bold text-ivory/55">نسبة التقدم</p>
                <strong className="mt-2 block text-5xl font-black text-gold">{safeProgress}%</strong>
                <div className="mt-5">
                  <PremiumProgressBar value={safeProgress} variant="gold" />
                </div>
                <p className="mt-4 text-xs font-bold leading-6 text-ivory/60">
                  {completedLessonIds.length} من {lessons.length || course.lessonsCount || 0} درس مكتمل
                </p>
              </PremiumCard>
            </div>
          </div>
        </section>

        <section className="container-premium grid gap-8 py-10 xl:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <PremiumCard className="overflow-hidden p-0">
              <div className="border-b border-sand bg-cream/70 px-6 py-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="mini-label">الدرس الحالي</p>
                    <h2 className="brand-title mt-2 text-2xl font-black text-charcoal">
                      {activeLesson?.title || 'محتوى الكورس'}
                    </h2>
                    {activeLesson ? (
                      <p className="mt-2 text-sm font-bold text-warm-gray">
                        {activeLesson.stageTitle} · {activeLesson.duration} دقيقة
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <PremiumButton type="button" variant="outline" size="sm" onClick={() => goToRelativeLesson('previous')} disabled={!activeLesson || lessons.findIndex((lesson) => lesson.id === activeLesson.id) <= 0}>
                      السابق
                    </PremiumButton>
                    <PremiumButton type="button" size="sm" onClick={() => goToRelativeLesson('next')} disabled={!activeLesson || lessons.findIndex((lesson) => lesson.id === activeLesson.id) >= lessons.length - 1}>
                      التالي
                    </PremiumButton>
                  </div>
                </div>
              </div>

              <div className="p-4 md:p-5">
                <ContentProtection userLabel={user?.email || user?.uid || 'حساب خاص'} productTitle={course.title} className="border border-sand bg-cream">
                  {activeContentUrl ? (
                    <iframe
                      src={activeContentUrl}
                      title={activeLesson?.title || course.title}
                      className="h-[560px] w-full rounded-[2rem]"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <div className="flex h-[460px] items-center justify-center rounded-[2rem] border border-dashed border-sand bg-cream/70 px-6 text-center text-sm font-bold leading-7 text-warm-gray">
                      رابط هذا الدرس غير متاح حاليًا. يمكن للأدمن إضافته من Course Builder أو Google Drive.
                    </div>
                  )}
                </ContentProtection>

                <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
                  <div className="rounded-2xl border border-sand bg-cream/70 px-4 py-3 text-xs font-bold leading-6 text-warm-gray">
                    يتم حفظ آخر مشاهدة والتقدم داخل حسابك. الوصول شخصي ومحمي للحفاظ على حقوق المحتوى.
                  </div>

                  <div className="flex flex-wrap gap-2 md:justify-end">
                    <PremiumButton type="button" onClick={markActiveLessonComplete} disabled={!activeLesson}>
                      إكمال الدرس
                    </PremiumButton>

                    {activeResourceUrl ? (
                      <PremiumButton href={activeResourceUrl} variant="outline">
                        فتح الموارد
                      </PremiumButton>
                    ) : null}
                  </div>
                </div>
              </div>
            </PremiumCard>

            <div className="grid gap-4 md:grid-cols-3">
              <MiniLearningCard title="ملاحظاتك" value="اكتبي تأملاتك في دفتر الرحلة الخاص بكِ." />
              <MiniLearningCard title="الموارد" value={activeResourceUrl ? 'يوجد مورد متاح لهذا الدرس.' : 'لا توجد موارد مضافة لهذا الدرس.'} />
              <MiniLearningCard title="الشهادة" value="تظهر شهادة الإكمال بعد إنهاء جميع الدروس." />
            </div>
          </div>

          <aside className="h-fit rounded-[2rem] border border-sand bg-ivory/90 p-5 shadow-soft backdrop-blur-sm xl:sticky xl:top-28">
            <div className="mb-5">
              <p className="mini-label">منهج الكورس</p>
              <h3 className="brand-title mt-2 text-2xl font-black text-charcoal">الفصول والدروس</h3>
              <BrandDivider className="mt-4 justify-start" />
            </div>

            {lessonGroups.length > 0 ? (
              <div className="space-y-4">
                {lessonGroups.map((group, groupIndex) => (
                  <div key={group.title} className="rounded-[1.5rem] border border-sand bg-cream/70 p-3">
                    <p className="mb-3 px-2 text-xs font-black text-gold">
                      الفصل {groupIndex + 1}: {group.title}
                    </p>
                    <div className="space-y-2">
                      {group.lessons.map((lesson, index) => {
                        const active = activeLesson?.id === lesson.id
                        const completed = completedLessonIds.includes(lesson.id)

                        return (
                          <button
                            key={lesson.id}
                            type="button"
                            onClick={() => handleSelectLesson(lesson.id)}
                            className={`w-full rounded-2xl border px-4 py-3 text-right transition ${
                              active
                                ? 'border-petrol/25 bg-petrol text-ivory shadow-soft'
                                : 'border-sand bg-ivory/80 text-charcoal hover:border-gold/35'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${completed ? 'bg-gold text-deepTeal' : active ? 'bg-ivory/18 text-ivory' : 'bg-petrol/10 text-petrol'}`}>
                                {completed ? '✓' : index + 1}
                              </span>
                              <span className="min-w-0">
                                <span className="block text-sm font-black">{lesson.title}</span>
                                <span className={`mt-1 block text-[11px] font-bold ${active ? 'text-ivory/65' : 'text-warm-gray'}`}>
                                  {lesson.duration} دقيقة · {lesson.resourceUrl ? 'مورد مرفق' : 'درس'}
                                </span>
                              </span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-sand bg-cream/70 p-5 text-sm font-bold leading-7 text-warm-gray">
                لم يتم إضافة دروس لهذا الكورس بعد.
              </p>
            )}
          </aside>
        </section>
      </main>

      <Footer />
    </>
  )
}

function groupLessonsByStage(lessons: Lesson[]): LessonGroup[] {
  const groups = new Map<string, Lesson[]>()

  lessons.forEach((lesson) => {
    const key = lesson.stageTitle || 'الرحلة الأساسية'
    const current = groups.get(key) || []
    current.push(lesson)
    groups.set(key, current)
  })

  return Array.from(groups.entries()).map(([title, groupLessons]) => ({
    title,
    lessons: [...groupLessons].sort((a, b) => Number(a.order || 0) - Number(b.order || 0)),
  }))
}

function MiniLearningCard({ title, value }: { title: string; value: string }) {
  return (
    <PremiumCard className="p-5">
      <p className="text-xs font-black text-gold">{title}</p>
      <p className="mt-3 text-sm font-bold leading-7 text-warm-gray">{value}</p>
    </PremiumCard>
  )
}
