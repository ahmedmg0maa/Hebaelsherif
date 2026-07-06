'use client'

import { useMemo, useState, type ReactNode } from 'react'
import BrandDivider from '@/components/brand/BrandDivider'
import BrandOrnament from '@/components/brand/BrandOrnament'
import LearnerProgressRing from '@/components/dashboard/LearnerProgressRing'
import ImageSlot from '@/components/ui/ImageSlot'
import PremiumButton from '@/components/ui/PremiumButton'
import PremiumEmptyState from '@/components/ui/PremiumEmptyState'
import PremiumProgressBar from '@/components/ui/PremiumProgressBar'
import type { Course, CourseProgress, Lesson } from '@/types'

interface CoursePlayerShellProps {
  course: Course
  lessons: Lesson[]
  initialProgress: CourseProgress | null
  accessToken?: string
}

function getLessonDurationLabel(duration: number | undefined) {
  const value = Number(duration || 0)
  if (!value) return 'مدة غير محددة'
  return `${value} دقيقة`
}

export default function CoursePlayerShell({ course, lessons, initialProgress, accessToken }: CoursePlayerShellProps) {
  const [progress, setProgress] = useState<CourseProgress | null>(initialProgress)
  const [activeLessonId, setActiveLessonId] = useState(initialProgress?.lastLessonId || '')
  const completedLessonIds = useMemo(() => new Set(progress?.completedLessonIds || []), [progress?.completedLessonIds])
  const sortedLessons = useMemo(() => [...lessons].sort((a, b) => Number(a.order || 0) - Number(b.order || 0)), [lessons])
  const activeLesson = useMemo(() => {
    if (activeLessonId) {
      const byActive = sortedLessons.find((lesson) => lesson.id === activeLessonId)
      if (byActive) return byActive
    }
    if (progress?.lastLessonId) {
      const byLast = sortedLessons.find((lesson) => lesson.id === progress.lastLessonId)
      if (byLast) return byLast
    }
    return sortedLessons.find((lesson) => !completedLessonIds.has(lesson.id)) || sortedLessons[0] || null
  }, [activeLessonId, completedLessonIds, progress?.lastLessonId, sortedLessons])

  const currentIndex = activeLesson ? sortedLessons.findIndex((lesson) => lesson.id === activeLesson.id) : -1
  const previousLesson = currentIndex > 0 ? sortedLessons[currentIndex - 1] : null
  const nextLesson = currentIndex >= 0 && currentIndex < sortedLessons.length - 1 ? sortedLessons[currentIndex + 1] : null
  const progressPercent = progress?.progressPercent ?? (sortedLessons.length ? Math.round((completedLessonIds.size / sortedLessons.length) * 100) : 0)

  async function markLesson(lessonId: string, completed = true) {
    if (!accessToken || !course.id || !lessonId) return
    const response = await fetch('/api/progress', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ courseId: course.id, lessonId, completed, totalLessons: Math.max(1, sortedLessons.length) }),
    })
    const payload = await response.json()
    if (!response.ok || !payload.success) return
    setActiveLessonId(lessonId)
    setProgress((current) => ({
      userId: current?.userId || '',
      courseId: course.id,
      completedLessonIds: payload.completedLessonIds || [],
      lastLessonId: lessonId,
      progressPercent: payload.progressPercent || 0,
      lastViewedAt: new Date(),
      notes: current?.notes || {},
      bookmarks: current?.bookmarks || [],
    }))
  }

  if (!activeLesson) {
    return (
      <PremiumEmptyState
        icon="◈"
        title="لم تتم إضافة دروس لهذا الكورس بعد"
        description="الوصول مؤكد، لكن المحتوى التعليمي يحتاج إضافة دروس من لوحة الإدارة قبل بدء المشاهدة. لن نعرض دروسًا وهمية في الإنتاج."
        actionLabel="العودة لكورساتي"
        actionHref="/dashboard/courses"
      />
    )
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[310px_1fr_360px] xl:items-start">
        <aside className="space-y-5 xl:sticky xl:top-28">
          <div className="rounded-[2.25rem] border border-sand bg-ivory/92 p-6 shadow-premium backdrop-blur-sm">
            <LearnerProgressRing value={progressPercent} label="تقدّمك في الكورس" size="lg" />
            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              <MiniStat label="دروس" value={sortedLessons.length} />
              <MiniStat label="مكتمل" value={completedLessonIds.size} />
              <MiniStat label="متبقّي" value={Math.max(0, sortedLessons.length - completedLessonIds.size)} />
            </div>
          </div>

          <div className="rounded-[2.25rem] border border-sand bg-ivory/92 p-6 shadow-soft backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-xl font-black text-charcoal">جلساتك القادمة</h3>
              <span className="rounded-full border border-gold/20 bg-gold/10 px-3 py-1 text-xs font-black text-gold">اختياري</span>
            </div>
            <p className="text-sm leading-7 text-warm-gray">
              عند ربط جلسة بهذا المسار ستظهر هنا تلقائيًا. لا توجد بيانات وهمية في هذه المساحة.
            </p>
            <PremiumButton href="/booking" variant="outline" size="sm" className="mt-5 w-full">حجز جلسة متابعة</PremiumButton>
          </div>
        </aside>

        <main className="space-y-5">
          <section className="premium-glow-border overflow-hidden rounded-[2.5rem] border border-sand bg-ivory/92 shadow-premium backdrop-blur-sm">
            <div className="p-5 sm:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-xs font-black text-warm-gray">
                <span>السابق: {previousLesson?.title || 'بداية المسار'}</span>
                <span>التالي: {nextLesson?.title || 'نهاية الوحدة'}</span>
              </div>
              <div className="relative overflow-hidden rounded-[2rem] border border-sand bg-petrol shadow-soft">
                <ImageSlot src={course.heroImageUrl || course.coverImageUrl} alt={course.title} ratio="video" variant="course" className="rounded-none border-0 opacity-72 shadow-none" />
                <div className="absolute inset-0 bg-gradient-to-t from-petrol via-petrol/28 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-ivory sm:p-7">
                  <p className="text-xs font-black tracking-[.18em] text-gold">{activeLesson.stageTitle || 'الفصل الحالي'}</p>
                  <h1 className="mt-2 max-w-2xl text-3xl font-black leading-tight md:text-5xl">{activeLesson.title}</h1>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-ivory/78">{activeLesson.description || course.description}</p>
                  <div className="mt-5 flex items-center gap-3">
                    <button className="flex h-14 w-14 items-center justify-center rounded-full border border-gold/30 bg-ivory/12 text-xl text-gold backdrop-blur-sm" aria-label="تشغيل الدرس">▶</button>
                    <span className="latin-numerals text-xs font-black text-ivory/78">00:00 / {getLessonDurationLabel(activeLesson.duration)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_240px] lg:items-center">
                <div>
                  <div className="mb-3 flex items-center justify-between gap-3 text-xs font-black text-warm-gray">
                    <span>تقدّم الدرس والكورس</span>
                    <span className="latin-numerals text-burgundy">{progressPercent}%</span>
                  </div>
                  <PremiumProgressBar value={progressPercent} />
                </div>
                <PremiumButton type="button" onClick={() => markLesson(activeLesson.id, !completedLessonIds.has(activeLesson.id))} className="w-full">
                  {completedLessonIds.has(activeLesson.id) ? 'إلغاء اكتمال الدرس' : 'علّمي الدرس كمكتمل'}
                </PremiumButton>
              </div>
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <UtilityPanel title="تنزيلاتي ومواردي" icon="⇩">
              {activeLesson.resourceUrl ? (
                <a href={activeLesson.resourceUrl} className="flex items-center justify-between rounded-2xl border border-sand bg-cream/70 px-4 py-3 text-sm font-black text-petrol transition hover:border-gold/40" target="_blank" rel="noreferrer">
                  <span>فتح مورد الدرس</span>
                  <span className="text-gold">PDF</span>
                </a>
              ) : (
                <p className="rounded-2xl border border-dashed border-sand bg-cream/60 p-4 text-sm leading-7 text-warm-gray">لا توجد مرفقات لهذا الدرس بعد.</p>
              )}
            </UtilityPanel>

            <UtilityPanel title="ملاحظاتي الشخصية" icon="✎">
              <textarea
                className="min-h-32 w-full rounded-2xl border border-sand bg-cream/70 p-4 text-sm font-bold leading-7 text-charcoal outline-none transition focus:border-gold"
                placeholder="اكتبي ملاحظاتك الخاصة هنا..."
                aria-label="ملاحظاتي الشخصية"
              />
              <p className="mt-2 text-xs font-bold text-warm-gray">الملاحظات هنا واجهة جاهزة؛ ربط الحفظ الدائم ضمن V7.2.x إذا احتجنا.</p>
            </UtilityPanel>
          </section>
        </main>

        <aside className="xl:sticky xl:top-28">
          <section className="rounded-[2.25rem] border border-sand bg-ivory/92 p-5 shadow-premium backdrop-blur-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="mini-label mb-2">محتوى الدورة</p>
                <h2 className="text-2xl font-black text-charcoal">{course.title}</h2>
              </div>
              <BrandOrnament className="scale-75" />
            </div>
            <div className="space-y-2">
              {sortedLessons.map((lesson, index) => {
                const completed = completedLessonIds.has(lesson.id)
                const active = lesson.id === activeLesson.id
                return (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => setActiveLessonId(lesson.id)}
                    className={`w-full rounded-2xl border p-4 text-right transition ${active ? 'border-burgundy bg-burgundy/10' : 'border-sand bg-cream/62 hover:border-gold/40 hover:bg-ivory'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="latin-numerals text-xs font-black text-gold">{String(index + 1).padStart(2, '0')}</p>
                        <h3 className="mt-1 text-sm font-black text-charcoal">{lesson.title}</h3>
                        <p className="mt-1 text-xs font-bold text-warm-gray">{getLessonDurationLabel(lesson.duration)}</p>
                      </div>
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-black ${completed ? 'border-petrol bg-petrol text-ivory' : active ? 'border-burgundy text-burgundy' : 'border-sand text-gold'}`}>
                        {completed ? '✓' : active ? '▶' : '○'}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
            <BrandDivider className="my-5" />
            <PremiumButton href="/dashboard/courses" variant="outline" className="w-full">العودة إلى كورساتي</PremiumButton>
          </section>
        </aside>
      </section>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-sand bg-cream/70 p-3">
      <strong className="latin-numerals block text-xl font-black text-petrol">{value}</strong>
      <span className="mt-1 block text-[11px] font-black text-warm-gray">{label}</span>
    </div>
  )
}

function UtilityPanel({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
  return (
    <section className="rounded-[2.1rem] border border-sand bg-ivory/92 p-5 shadow-soft backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-xl font-black text-charcoal">{title}</h3>
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-gold/20 bg-gold/10 text-gold">{icon}</span>
      </div>
      {children}
    </section>
  )
}
