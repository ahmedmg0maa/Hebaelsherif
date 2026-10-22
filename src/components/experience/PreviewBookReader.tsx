'use client'

import { useEffect, useState } from 'react'
import type { PreviewBookChapter } from '@/lib/data/catalog'
import { cn } from '@/lib/cn'

const STORAGE_KEY = 'heba-preview-book-chapter-v1'

export function PreviewBookReader({ chapters }: { chapters: PreviewBookChapter[] }) {
  const [activeId, setActiveId] = useState(chapters[0]?.id ?? '')
  const [fontSize, setFontSize] = useState<'normal' | 'large'>('normal')
  const [paper, setPaper] = useState<'light' | 'night'>('light')

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = window.sessionStorage.getItem(STORAGE_KEY)
        if (stored && chapters.some((chapter) => chapter.id === stored)) setActiveId(stored)
      } catch { /* Reading remains usable when storage is blocked. */ }
    }, 0)
    return () => window.clearTimeout(timer)
  }, [chapters])

  const active = chapters.find((chapter) => chapter.id === activeId) ?? chapters[0]
  if (!active) return null
  const activeIndex = chapters.findIndex((chapter) => chapter.id === active.id)

  function selectChapter(id: string) {
    setActiveId(id)
    try { window.sessionStorage.setItem(STORAGE_KEY, id) } catch { /* Selection still works in this page. */ }
  }

  return (
    <section id="book-preview" className="experience-canvas relative scroll-mt-28 overflow-hidden border-y border-line bg-[#082730] px-4 py-14 sm:px-6 md:py-20" aria-labelledby="book-preview-title">
      <span className="experience-orb experience-orb-a" aria-hidden />
      <div className="relative mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 text-on-dark sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold tracking-[.16em] text-aqua">قارئة كتاب تفاعلية</p>
            <h2 id="book-preview-title" className="mt-2 text-3xl font-bold sm:text-4xl">اقرئي الكتاب كاملًا كتجربة</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-on-dark/65">نص أصلي للعرض، محفوظ داخل الكود ولا يمثل إصدارًا تجاريًا أو ملفًا مدفوعًا.</p>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="إعدادات القراءة">
            <button type="button" onClick={() => setFontSize(fontSize === 'normal' ? 'large' : 'normal')} className="min-h-11 rounded-full border border-on-dark/18 bg-on-dark/7 px-4 text-xs font-bold text-on-dark transition hover:bg-on-dark/12">حجم الخط: {fontSize === 'normal' ? 'عادي' : 'كبير'}</button>
            <button type="button" onClick={() => setPaper(paper === 'light' ? 'night' : 'light')} className="min-h-11 rounded-full border border-on-dark/18 bg-on-dark/7 px-4 text-xs font-bold text-on-dark transition hover:bg-on-dark/12">وضع القراءة: {paper === 'light' ? 'ورقي' : 'ليلي'}</button>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <nav className="h-fit rounded-[1.75rem] border border-on-dark/12 bg-on-dark/6 p-4 text-on-dark backdrop-blur-xl" aria-label="فصول الكتاب">
            <p className="px-3 pb-3 text-xs font-bold text-antique-gold">فهرس الكتاب</p>
            <ol className="space-y-1.5">
              {chapters.map((chapter, index) => (
                <li key={chapter.id}>
                  <button type="button" onClick={() => selectChapter(chapter.id)} className={cn('flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-2 text-start transition', chapter.id === active.id ? 'bg-aqua text-deep-teal' : 'text-on-dark/72 hover:bg-on-dark/8 hover:text-on-dark')} aria-current={chapter.id === active.id ? 'page' : undefined}>
                    <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold', chapter.id === active.id ? 'bg-deep-teal text-on-dark' : 'bg-on-dark/8 text-antique-gold')}>{(index + 1).toLocaleString('ar-EG')}</span>
                    <span><small className="block text-[10px] opacity-65">{chapter.number}</small><strong className="block text-sm">{chapter.title}</strong></span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          <article key={active.id} className={cn('experience-panel-in relative overflow-hidden rounded-[2rem] border shadow-[0_35px_100px_rgb(0_0_0_/_0.28)] transition-colors', paper === 'light' ? 'border-[#E7D7BC] bg-surface-raised text-[#293C41]' : 'border-on-dark/10 bg-[#0C313A] text-on-dark')}>
            <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:radial-gradient(circle_at_20%_10%,rgb(216_195_165_/_0.25)_0_1px,transparent_1.5px)] [background-size:28px_28px]" aria-hidden />
            <div className="relative mx-auto max-w-3xl px-6 py-10 sm:px-12 sm:py-14">
              <p className={cn('text-xs font-bold tracking-[.16em]', paper === 'light' ? 'text-antique-gold' : 'text-aqua')}>{active.number}</p>
              <h3 className={cn('mt-3 text-4xl leading-tight font-bold sm:text-5xl', paper === 'light' ? 'text-deep-teal' : 'text-on-dark')}>{active.title}</h3>
              <p className={cn('mt-4 border-s-2 ps-4 text-lg leading-relaxed font-semibold', paper === 'light' ? 'border-antique-gold text-text-soft' : 'border-aqua text-on-dark/68')}>{active.lead}</p>

              <div className={cn('mt-9 space-y-6 leading-[2.2]', fontSize === 'large' ? 'text-xl' : 'text-[1.08rem]', paper === 'light' ? 'text-[#35474A]' : 'text-on-dark/82')}>
                {active.paragraphs.map((paragraph, index) => <p key={paragraph} className={index === 0 ? 'first-letter:float-right first-letter:ms-2 first-letter:font-heading first-letter:text-5xl first-letter:font-bold first-letter:text-aqua-deep' : ''}>{paragraph}</p>)}
              </div>

              <section className={cn('mt-10 rounded-2xl border p-5 sm:p-6', paper === 'light' ? 'border-antique-gold/35 bg-antique-gold/8' : 'border-aqua/20 bg-aqua/7')} aria-labelledby={`prompt-${active.id}`}>
                <p className={cn('text-xs font-bold tracking-[.14em]', paper === 'light' ? 'text-antique-gold' : 'text-aqua')}>وقفة مع القلم</p>
                <h4 id={`prompt-${active.id}`} className={cn('mt-2 text-xl leading-relaxed font-bold', paper === 'light' ? 'text-deep-teal' : 'text-on-dark')}>{active.prompt}</h4>
                <ol className="mt-4 grid gap-3 sm:grid-cols-3">
                  {active.exercise.map((item, index) => <li key={item} className={cn('rounded-xl p-3 text-sm leading-relaxed', paper === 'light' ? 'bg-surface-raised text-text-soft' : 'bg-on-dark/7 text-on-dark/72')}><span className="mb-2 block text-xs font-bold text-aqua">{(index + 1).toLocaleString('ar-EG')}</span>{item}</li>)}
                </ol>
              </section>

              <footer className={cn('mt-8 flex items-center justify-between gap-3 border-t pt-5', paper === 'light' ? 'border-line' : 'border-on-dark/12')}>
                <button type="button" disabled={activeIndex === 0} onClick={() => selectChapter(chapters[activeIndex - 1].id)} className="min-h-11 rounded-full border border-current/15 px-5 text-sm font-bold disabled:opacity-35">السابق</button>
                <span className="text-xs opacity-60">{(activeIndex + 1).toLocaleString('ar-EG')} / {chapters.length.toLocaleString('ar-EG')}</span>
                <button type="button" disabled={activeIndex === chapters.length - 1} onClick={() => selectChapter(chapters[activeIndex + 1].id)} className="min-h-11 rounded-full border border-current/15 px-5 text-sm font-bold disabled:opacity-35">التالي</button>
              </footer>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
