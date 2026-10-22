'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import type { LearnData, LearnLesson } from '@/lib/data/learn'
import { getLessonVideoUrl, getResourceUrl, markLessonComplete, saveNote, deleteNote } from '@/lib/actions/learn'

function fmtMin(s: number) {
  return `${Math.max(1, Math.round(s / 60)).toLocaleString('ar-EG')} د`
}

function ProgressRing({ percent }: { percent: number }) {
  const r = 26
  const c = 2 * Math.PI * r
  return (
    <div className="relative h-16 w-16" role="img" aria-label={`إجمالي التقدم ${Math.round(percent)}٪`}>
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--color-sand)" strokeWidth="6" opacity="0.5" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="var(--color-antique-gold)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * Math.min(100, percent)) / 100}
          className="transition-all duration-700"
        />
      </svg>
      <span className="tnum absolute inset-0 flex items-center justify-center text-sm font-bold text-deep-teal">
        {Math.round(percent).toLocaleString('ar-EG')}٪
      </span>
    </div>
  )
}

export function LearnClient({ data }: { data: LearnData }) {
  const flat = useMemo(() => data.modules.flatMap((m) => m.lessons), [data.modules])
  const firstIncomplete = flat.find((l) => !l.completed) ?? flat[0]

  const [currentId, setCurrentId] = useState<string | null>(firstIncomplete?.id ?? null)
  const [completed, setCompleted] = useState<Set<string>>(new Set(flat.filter((l) => l.completed).map((l) => l.id)))
  const [percent, setPercent] = useState(data.percent)
  const [videoKind, setVideoKind] = useState<'stream'|'file'>('file')
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [videoMsg, setVideoMsg] = useState<string | null>(null)
  const [notes, setNotes] = useState(data.notes)
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [videoLoading, setVideoLoading] = useState(false)
  const [resourceLoading, setResourceLoading] = useState(false)
  const [resourceLink, setResourceLink] = useState<string | null>(null)
  const [tab, setTab] = useState<'notes' | 'resources'>('notes')
  const [actionError, setActionError] = useState<string | null>(null)
  const actionLock = useRef(false)
  const videoLock = useRef(false)
  const resourceLock = useRef(false)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  const current: LearnLesson | null = flat.find((l) => l.id === currentId) ?? null
  const currentIndex = current ? flat.findIndex((l) => l.id === current.id) : -1
  const currentResources = current ? (data.resources[current.id] ?? []) : []
  const lessonNotes = notes.filter((n) => n.lessonId === currentId)
  const noteDraft = currentId ? noteDrafts[currentId] ?? '' : ''

  async function openLesson(lesson: LearnLesson) {
    // Admission sets a cookie: serialize requests as well as rendered videos.
    if (videoLock.current || actionLock.current) return
    videoLock.current = true
    setVideoLoading(true)
    setActionError(null)
    setCurrentId(lesson.id)
    setVideoUrl(null)
    setVideoMsg(null)
    setResourceLink(null)
    try {
      if (!lesson.hasVideo) {
        setVideoMsg('لم يُرفع فيديو هذا الدرس بعد.')
        return
      }
      const res = await getLessonVideoUrl(lesson.id)
      if (!mounted.current) return
      if (res.ok) { setVideoUrl(res.data.url); setVideoKind(res.data.kind ?? 'file') }
      else setVideoMsg(res.error)
    } catch {
      if (mounted.current) setVideoMsg('تعذر الاتصال بالفيديو. حاولي فتح الدرس مرة أخرى.')
    } finally {
      videoLock.current = false
      if (mounted.current) setVideoLoading(false)
    }
  }

  async function toggleComplete() {
    if (!current || actionLock.current || videoLock.current) return
    actionLock.current = true
    setBusy(true)
    setActionError(null)
    const target = !completed.has(current.id)
    try {
      const res = await markLessonComplete(current.id, target)
      if (!mounted.current) return
      if (res.ok) {
        setPercent(res.data.percent)
        setCompleted((prev) => {
          const next = new Set(prev)
          if (target) next.add(current.id)
          else next.delete(current.id)
          return next
        })
      } else setActionError(res.error)
    } catch { if (mounted.current) setActionError('تعذر تأكيد التقدم. راجعي حالة الدرس عند إعادة تحميل الصفحة.') }
    finally { actionLock.current = false; if (mounted.current) setBusy(false) }
  }

  async function onSaveNote(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!currentId || !noteDraft.trim() || actionLock.current) return
    actionLock.current = true
    const lessonId = currentId, content = noteDraft.trim()
    setBusy(true)
    setActionError(null)
    try {
      const res = await saveNote(lessonId, content)
      if (!mounted.current) return
      if (res.ok) {
        setNotes((prev) => [
          { id: res.data.id, lessonId, content, updatedAt: new Date().toISOString() },
          ...prev.filter(note => note.id !== res.data.id),
        ])
        setNoteDrafts(prev => ({ ...prev, [lessonId]: '' }))
      } else setActionError(res.error)
    } catch { if (mounted.current) setActionError('تعذر تأكيد الحفظ؛ النص ما زال في الحقل. تحققي من ملاحظات الدرس قبل إعادة الإرسال.') }
    finally { actionLock.current = false; if (mounted.current) setBusy(false) }
  }

  async function onDeleteNote(id: string) {
    if (actionLock.current) return
    actionLock.current = true
    setBusy(true)
    setActionError(null)
    try {
      const res = await deleteNote(id)
      if (!mounted.current) return
      if (res.ok) setNotes((prev) => prev.filter((n) => n.id !== id))
      else setActionError(res.error)
    } catch { if (mounted.current) setActionError('تعذر تأكيد الحذف. لم نزل الملاحظة من القائمة.') }
    finally { actionLock.current = false; if (mounted.current) setBusy(false) }
  }

  async function onDownload(resourceId: string) {
    if (resourceLock.current) return
    resourceLock.current = true
    setResourceLoading(true)
    setResourceLink(null)
    setActionError(null)
    // Open synchronously with the user gesture, then navigate after authorization.
    let opened: Window | null = null
    try {
      try { opened = window.open('about:blank', '_blank'); if (opened) opened.opener = null }
      catch { /* Popup policy can throw; the manual link remains available. */ }
      const res = await getResourceUrl(resourceId)
      if (!mounted.current) { opened?.close(); return }
      if (res.ok) {
        if (opened && !opened.closed) opened.location.href = res.data.url
        else setResourceLink(res.data.url)
      } else { opened?.close(); setActionError(res.error) }
    } catch { opened?.close(); if (mounted.current) setActionError('تعذر فتح الملف. حاولي مرة أخرى.') }
    finally { resourceLock.current = false; if (mounted.current) setResourceLoading(false) }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-burgundy">أنتِ الآن تتعلمين</p>
          <h1 className="text-2xl font-bold text-deep-teal md:text-3xl">{data.title}</h1>
        </div>
        <ProgressRing percent={percent} />
      </header>
      {actionError && <p className="rounded-xl bg-burgundy/10 px-4 py-3 text-sm font-semibold text-burgundy" role="alert">{actionError}</p>}

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        {/* Player column */}
        <div className="space-y-5">
          <div className="overflow-hidden rounded-3xl border border-line bg-deep-teal shadow-card">
            {videoUrl ? (
              <>{videoKind === 'stream' ? <iframe key={videoUrl} src={videoUrl} title={current?.title ?? 'فيديو الدرس'} className="aspect-video w-full border-0" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="no-referrer" /> : <video key={videoUrl} src={videoUrl} controls playsInline className="aspect-video w-full" controlsList="nodownload" preload="metadata" onError={() => setVideoMsg('تعذر تشغيل الفيديو. جددي الوصول إلى الدرس وحاولي مرة أخرى.')} />}{videoMsg && <div className="p-4 text-sm text-on-dark"><p role="alert">{videoMsg}</p>{current && <Button variant="inverse" size="sm" className="mt-3" disabled={videoLoading || busy} onClick={()=>openLesson(current)}>تجديد الوصول للفيديو</Button>}</div>}</>
            ) : (
              <div className="flex aspect-video w-full flex-col items-center justify-center gap-4 text-on-dark/80">
                <svg viewBox="0 0 64 64" className="h-16 w-16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                  <circle cx="32" cy="32" r="26" strokeOpacity="0.4" />
                  <path d="M27 23v18l14-9Z" fill="currentColor" stroke="none" />
                </svg>
                <p role="status" className="max-w-xs text-center text-sm leading-relaxed">
                  {videoLoading ? 'جارٍ فتح الدرس…' : videoMsg ?? (current ? current.title : 'اختاري درسًا من القائمة')}
                </p>
                {current?.hasVideo && <Button variant="inverse" disabled={videoLoading || busy} onClick={()=>openLesson(current)}>{videoLoading ? 'جارٍ التحميل…' : videoMsg ? 'إعادة فتح الدرس' : 'بدء هذا الدرس'}</Button>}
              </div>
            )}
          </div>

          {current && (
            <div className="rounded-3xl border border-line bg-surface-raised p-6 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-deep-teal">{current.title}</h2>
                  {current.description && <p className="mt-2 text-sm leading-relaxed text-text-soft">{current.description}</p>}
                </div>
                <Button variant={completed.has(current.id) ? 'secondary' : 'primary'} size="sm" disabled={busy || videoLoading} onClick={toggleComplete}>
                  {completed.has(current.id) ? '✓ مكتمل — تراجع' : 'وضع علامة مكتمل'}
                </Button>
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy || videoLoading || currentIndex <= 0}
                  onClick={() => currentIndex > 0 && openLesson(flat[currentIndex - 1])}
                >
                  → الدرس السابق
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy || videoLoading || currentIndex < 0 || currentIndex >= flat.length - 1}
                  onClick={() => currentIndex < flat.length - 1 && openLesson(flat[currentIndex + 1])}
                >
                  الدرس التالي ←
                </Button>
              </div>
            </div>
          )}

          {/* Notes / resources */}
          <div className="rounded-3xl border border-line bg-surface-raised shadow-card">
            <div className="flex border-b border-line" role="tablist" aria-label="أدوات الدرس">
              {(
                [
                  { id: 'notes', label: 'ملاحظاتي' },
                  { id: 'resources', label: `الملفات (${currentResources.length.toLocaleString('ar-EG')})` },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  id={`lesson-tab-${t.id}`}
                  aria-controls="lesson-tools-panel"
                  aria-selected={tab === t.id}
                  tabIndex={tab === t.id ? 0 : -1}
                  onKeyDown={event => {
                    if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return
                    event.preventDefault()
                    const next = event.key === 'Home' ? 'notes' : event.key === 'End' ? 'resources' : tab === 'notes' ? 'resources' : 'notes'
                    setTab(next); document.getElementById(`lesson-tab-${next}`)?.focus()
                  }}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    'px-6 py-3.5 text-sm font-semibold transition-colors',
                    tab === t.id ? 'border-b-2 border-antique-gold text-deep-teal' : 'text-taupe hover:text-deep-teal',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="p-6" id="lesson-tools-panel" role="tabpanel" tabIndex={0} aria-labelledby={`lesson-tab-${tab}`}>
              {resourceLink && <a href={resourceLink} target="_blank" rel="noopener noreferrer" className="mb-4 inline-flex min-h-12 items-center text-burgundy underline">فتح الملف — اضغطي إذا منع المتصفح فتح النافذة</a>}
              {tab === 'notes' ? (
                <div className="space-y-4">
                  <form onSubmit={onSaveNote} className="flex flex-col gap-3">
                    <label htmlFor="note" className="sr-only">
                      ملاحظة جديدة
                    </label>
                    <textarea
                      id="note"
                      value={noteDraft}
                      onChange={(e) => { const value = e.target.value; if (currentId) setNoteDrafts(prev => ({ ...prev, [currentId]: value })) }}
                      disabled={busy || !currentId}
                      maxLength={5000}
                      rows={3}
                      className="w-full rounded-xl border border-line bg-ivory/50 px-4 py-3 text-sm text-ink focus:border-deep-teal focus:outline-2 focus:outline-deep-teal/20"
                    />
                    <Button type="submit" size="sm" disabled={busy || !noteDraft.trim()} className="self-start">
                      حفظ الملاحظة
                    </Button>
                  </form>
                  {lessonNotes.length === 0 ? (
                    <p className="text-sm text-taupe">دوّني أفكارك أثناء المشاهدة — تُحفظ مع هذا الدرس وترجعين لها وقتما شئتِ.</p>
                  ) : (
                    <ul className="space-y-3">
                      {lessonNotes.map((n) => (
                        <li key={n.id} className="group flex items-start justify-between gap-3 rounded-xl bg-ivory/60 p-4">
                          <p className="flex-1 text-sm leading-relaxed text-ink">{n.content}</p>
                          <button
                            type="button"
                            onClick={() => onDeleteNote(n.id)}
                            disabled={busy}
                            aria-label="حذف الملاحظة"
                            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-text-soft hover:text-burgundy focus-visible:outline-2 focus-visible:outline-burgundy"
                          >
                            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <path d="M4 6h12M8 6V4h4v2m-6 0v10h8V6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : currentResources.length === 0 ? (
                <p className="text-sm text-taupe">لا ملفات مرفقة بهذا الدرس.</p>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {currentResources.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        disabled={resourceLoading}
                        onClick={() => onDownload(r.id)}
                        className="flex w-full items-center gap-3 rounded-xl border border-line bg-ivory/50 p-4 text-start transition-all hover:border-antique-gold hover:shadow-card"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-burgundy/10 text-xs font-bold text-burgundy uppercase">
                          {r.kind}
                        </span>
                        <span className="flex-1 text-sm font-semibold text-deep-teal">{r.title}</span>
                        <svg viewBox="0 0 20 20" className="h-4 w-4 text-taupe" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                          <path d="M10 3v10m0 0l-4-4m4 4l4-4M4 17h12" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Curriculum sidebar */}
        <aside className="h-fit space-y-3 xl:sticky xl:top-8">
          <h2 className="px-1 font-bold text-deep-teal">منهج الدورة</h2>
          {data.modules.map((m) => {
            const done = m.lessons.filter((l) => completed.has(l.id)).length
            return (
              <details key={m.id} open={m.lessons.some((l) => l.id === currentId)} className="group rounded-2xl border border-line bg-surface-raised shadow-card">
                <summary className="flex cursor-pointer items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
                  <span className="text-sm font-bold text-deep-teal">{m.title}</span>
                  <span className="tnum shrink-0 rounded-full bg-ivory px-2.5 py-1 text-xs font-semibold text-taupe">
                    {done.toLocaleString('ar-EG')}/{m.lessons.length.toLocaleString('ar-EG')}
                  </span>
                </summary>
                <ul className="border-t border-line/70">
                  {m.lessons.map((l) => {
                    const active = l.id === currentId
                    const isDone = completed.has(l.id)
                    return (
                      <li key={l.id}>
                        <button
                          type="button"
                          disabled={busy || videoLoading}
                          onClick={() => openLesson(l)}
                          aria-current={active ? 'true' : undefined}
                          className={cn(
                            'flex w-full items-center gap-3 px-4 py-3 text-start text-sm transition-colors',
                            active ? 'bg-deep-teal/8 font-semibold text-deep-teal' : 'text-ink hover:bg-ivory/70',
                          )}
                        >
                          <span
                            className={cn(
                              'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px]',
                              isDone ? 'border-deep-teal bg-deep-teal text-on-dark' : 'border-sand bg-transparent text-transparent',
                            )}
                            aria-hidden
                          >
                            ✓
                          </span>
                          <span className="flex-1">{l.title}</span>
                          <span className="tnum shrink-0 text-xs text-taupe">{fmtMin(l.durationSeconds)}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </details>
            )
          })}
        </aside>
      </div>
    </div>
  )
}
