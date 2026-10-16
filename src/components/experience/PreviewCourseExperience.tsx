'use client'

import { useEffect, useMemo, useState } from 'react'
import type { PreviewCourseLesson } from '@/lib/data/catalog'
import { cn } from '@/lib/cn'

const STORAGE_KEY = 'heba-preview-course-progress-v1'

function safeStoredProgress() {
  try {
    const value = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

export function PreviewCourseExperience({ lessons }: { lessons: PreviewCourseLesson[] }) {
  const [activeId, setActiveId] = useState(lessons[0]?.id ?? '')
  const [completed, setCompleted] = useState<string[]>([])
  const [reflection, setReflection] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => setCompleted(safeStoredProgress()), 0)
    return () => window.clearTimeout(timer)
  }, [])

  const active = lessons.find((lesson) => lesson.id === activeId) ?? lessons[0]
  const modules = useMemo(() => [...new Set(lessons.map((lesson) => lesson.module))], [lessons])
  const progress = lessons.length ? Math.round((completed.length / lessons.length) * 100) : 0

  if (!active) return null

  function toggleComplete(id: string) {
    setCompleted((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  const activeIndex = lessons.findIndex((lesson) => lesson.id === active.id)
  const nextLesson = lessons[activeIndex + 1]

  return (
    <section id="course-preview" className="experience-canvas relative scroll-mt-28 overflow-hidden border-y border-on-dark/10 bg-[#082730] px-4 py-14 text-on-dark sm:px-6 md:py-20" aria-labelledby="course-preview-title">
      <span className="experience-orb experience-orb-a" aria-hidden />
      <span className="experience-orb experience-orb-b" aria-hidden />
      <div className="relative mx-auto max-w-7xl">
        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="rounded-[2rem] border border-on-dark/12 bg-[#0B303A]/92 p-5 shadow-[0_30px_90px_rgb(0_0_0_/_0.22)] backdrop-blur-xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold tracking-[.16em] text-aqua">منهج التجربة</p>
                <h2 id="course-preview-title" className="mt-2 text-2xl font-bold">تعلّمي وطبّقي الآن</h2>
              </div>
              <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[conic-gradient(var(--color-aqua)_var(--progress),rgb(255_255_255_/_0.12)_0)]" style={{ '--progress': `${progress}%` } as React.CSSProperties} aria-label={`اكتمل ${progress.toLocaleString('ar-EG')}٪`}>
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0B303A] text-xs font-bold text-aqua">{progress.toLocaleString('ar-EG')}٪</span>
              </div>
            </div>

            <p className="mt-4 rounded-2xl border border-antique-gold/20 bg-antique-gold/8 p-3 text-xs leading-relaxed text-on-dark/72">
              تجربة عرض فقط. يُحفظ تقدّمك داخل جلسة المتصفح الحالية ولا يُنشئ حسابًا أو استحقاقًا أو شهادة.
            </p>

            <div className="mt-6 space-y-6">
              {modules.map((module) => (
                <div key={module}>
                  <h3 className="mb-2 text-xs font-bold text-antique-gold">{module}</h3>
                  <ol className="space-y-1.5">
                    {lessons.filter((lesson) => lesson.module === module).map((lesson, index) => {
                      const isActive = lesson.id === active.id
                      const isDone = completed.includes(lesson.id)
                      return (
                        <li key={lesson.id}>
                          <button type="button" onClick={() => { setActiveId(lesson.id); setReflection('') }} className={cn('group flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2 text-start text-sm transition', isActive ? 'bg-aqua text-deep-teal shadow-lg' : 'text-on-dark/75 hover:bg-on-dark/7 hover:text-on-dark')} aria-current={isActive ? 'step' : undefined}>
                            <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold', isActive ? 'border-deep-teal/20 bg-deep-teal text-on-dark' : isDone ? 'border-aqua/45 bg-aqua/12 text-aqua' : 'border-on-dark/16')}>
                              {isDone ? '✓' : (index + 1).toLocaleString('ar-EG')}
                            </span>
                            <span className="min-w-0 flex-1">
                              <strong className="block truncate font-semibold">{lesson.title}</strong>
                              <span className={cn('text-[10px]', isActive ? 'text-deep-teal/70' : 'text-on-dark/42')}>{lesson.durationMinutes.toLocaleString('ar-EG')} دقائق</span>
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ol>
                </div>
              ))}
            </div>
          </aside>

          <article key={active.id} className="experience-panel-in overflow-hidden rounded-[2rem] border border-on-dark/12 bg-surface-raised text-ink shadow-[0_35px_100px_rgb(0_0_0_/_0.3)]">
            <header className="relative overflow-hidden border-b border-line bg-[linear-gradient(135deg,#F7F0E3,#EEF7F3)] px-5 py-8 sm:px-9 sm:py-10">
              <span className="absolute -end-16 -top-24 h-64 w-64 rounded-full border-[42px] border-aqua/10" aria-hidden />
              <p className="relative text-xs font-bold tracking-[.16em] text-antique-gold">{active.module}</p>
              <h3 className="relative mt-3 max-w-3xl text-3xl leading-tight font-bold text-deep-teal sm:text-4xl">{active.title}</h3>
              <p className="relative mt-4 max-w-2xl text-base leading-loose text-text-soft">{active.summary}</p>
            </header>

            <div className="grid gap-8 p-5 sm:p-9 xl:grid-cols-[minmax(0,1fr)_300px]">
              <div>
                <div className="space-y-5 text-[1.02rem] leading-[2.05] text-ink">
                  {active.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                </div>

                <div className="mt-8 rounded-2xl border border-antique-gold/35 bg-antique-gold/8 p-5 sm:p-6">
                  <p className="text-xs font-bold tracking-[.14em] text-antique-gold">سؤال الدرس</p>
                  <p className="mt-2 text-xl leading-relaxed font-bold text-deep-teal">{active.prompt}</p>
                  <label className="mt-4 block">
                    <span className="text-sm font-semibold text-ink">اكتبي ملاحظتك لنفسك</span>
                    <textarea value={reflection} onChange={(event) => setReflection(event.target.value.slice(0, 700))} rows={4} placeholder="هذه الكتابة محلية داخل الصفحة ولا تُرسل إلى أي خادم…" className="mt-2 w-full rounded-xl border border-line bg-surface-raised px-4 py-3 leading-relaxed text-ink outline-none transition focus:border-aqua focus:ring-3 focus:ring-aqua/15" />
                    <span className="mt-1 block text-[11px] text-taupe">لا تُحفظ الإجابة بعد إغلاق الصفحة.</span>
                  </label>
                </div>

                <div className="mt-6 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <button type="button" onClick={() => toggleComplete(active.id)} className={cn('min-h-12 rounded-full px-6 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-deep-teal', completed.includes(active.id) ? 'border border-deep-teal bg-transparent text-deep-teal' : 'bg-deep-teal text-on-dark hover:bg-teal-hover')}>
                    {completed.includes(active.id) ? 'إلغاء علامة الاكتمال' : 'علّمي الدرس كمكتمل'}
                  </button>
                  {nextLesson ? <button type="button" onClick={() => { setActiveId(nextLesson.id); setReflection('') }} className="min-h-12 rounded-full border border-line px-6 text-sm font-bold text-deep-teal transition hover:border-aqua hover:bg-aqua/6">الدرس التالي <span aria-hidden>←</span></button> : <span className="text-sm font-bold text-aqua-deep">وصلتِ إلى نهاية تجربة الكورس ✓</span>}
                </div>
              </div>

              <aside className="h-fit rounded-2xl bg-deep-teal p-5 text-on-dark">
                <p className="text-xs font-bold tracking-[.14em] text-aqua">تطبيق سريع</p>
                <ul className="mt-4 space-y-3 text-sm leading-relaxed text-on-dark/76">
                  {active.practice.map((item, index) => (
                    <li key={item} className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-on-dark/9 text-[10px] font-bold text-antique-gold">{(index + 1).toLocaleString('ar-EG')}</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 border-t border-on-dark/12 pt-5 text-xs leading-relaxed text-on-dark/58">في النسخة الفعلية، يظهر التقدّم والاستحقاق داخل لوحة العميلة بعد اعتماد الطلب. هذه التجربة لا تكتب أي بيانات.</div>
              </aside>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
