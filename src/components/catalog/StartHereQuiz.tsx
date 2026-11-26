'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import type { GuidedAssessmentContent } from '@/lib/assessments/governance'
import { scoreAssessmentResults } from '@/lib/assessments/scoring'

export function StartHereQuiz({ content, version }: { content: GuidedAssessmentContent; version?: number | null }) {
  return <Quiz key={JSON.stringify(content)} content={content} version={version} />
}

function Quiz({ content, version }: { content: GuidedAssessmentContent; version?: number | null }) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [answerOrder, setAnswerOrder] = useState<string[]>([])
  const [step, setStep] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const focusRef = useRef<HTMLHeadingElement>(null)
  const moved = useRef(false)
  const rootRef = useRef<HTMLDivElement>(null)
  useEffect(() => { rootRef.current?.setAttribute('data-hydrated', 'true') }, [])
  useEffect(() => { if (moved.current) focusRef.current?.focus({ preventScroll: true }) }, [step, showResult])

  const answered = content.questions.filter((question) => answers[question.key]).length
  const results = showResult ? scoreAssessmentResults(content, answers) : []
  const question = content.questions[step]
  const navigate = (next: number) => { moved.current = true; setShowResult(false); setStep(next) }
  const undoLast = () => {
    const last = answerOrder.at(-1)
    if (last) { setAnswers((current) => { const next = { ...current }; delete next[last]; return next }); setAnswerOrder((current) => current.slice(0, -1)); navigate(Math.max(0, content.questions.findIndex((item) => item.key === last))) }
  }
  if (!question) return null

  return (
    <div ref={rootRef} data-start-here-quiz data-version={version ?? undefined} data-hydrated="false" className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-line bg-surface-raised shadow-card">
      <div className="grid lg:grid-cols-[.8fr_1.2fr]">
      <div className="border-b border-line bg-ivory/65 p-6 sm:p-9 lg:border-b-0 lg:border-e">
        <p className="text-sm font-bold text-burgundy">{content.eyebrow}</p>
        <h2 className="mt-4 font-heading text-3xl leading-snug font-bold text-deep-teal sm:text-4xl">{content.heading}</h2>
        <p className="mt-4 leading-loose text-text-soft">{content.lead}</p>
        <p className="mt-4 text-xs leading-loose text-text-soft">اختاري ما يناسبكِ الآن؛ يمكنكِ تغيير أي إجابة قبل الاختيار.</p>
      <div className="mt-7" aria-live="polite">
        <div className="flex items-center justify-between gap-3 text-xs font-bold text-deep-teal">
          <span>التقدم: {answered.toLocaleString('ar-EG')} من {content.questions.length.toLocaleString('ar-EG')}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-label="تقدم الاختبار" aria-valuemin={0} aria-valuemax={content.questions.length} aria-valuenow={answered}>
          <div className="h-full rounded-full bg-deep-teal origin-right w-full transition-transform motion-reduce:transition-none" style={{ transform: `scaleX(${answered / content.questions.length})` }} />
        </div>
      </div>
      </div>
      <div className="p-6 sm:p-9">
        {!showResult || results.length === 0 ? <>
          <p className="text-xs font-bold text-text-soft">السؤال {(step + 1).toLocaleString('ar-EG')} / {content.questions.length.toLocaleString('ar-EG')}</p>
          <h3 ref={focusRef} tabIndex={-1} className="mt-3 text-2xl leading-snug font-bold text-deep-teal">{question.title}</h3>
          <fieldset key={question.key} className="mt-5">
            <legend className="sr-only">{question.title}</legend>
            {question.help ? <p className="mt-1 text-xs leading-relaxed text-text-soft">{question.help}</p> : null}
            <div className="mt-3 space-y-2">
              {question.options.map((option) => (
                <button key={option.key} type="button" aria-pressed={answers[question.key] === option.key}
                  onClick={() => { setAnswers((current) => ({ ...current, [question.key]: option.key })); setAnswerOrder((current) => [...current.filter((key) => key !== question.key), question.key]) }}
                  className={cn('flex min-h-14 w-full items-center gap-3 rounded-xl border px-4 py-3 text-start text-base font-semibold transition-colors', answers[question.key] === option.key ? 'border-deep-teal bg-deep-teal text-on-dark' : 'border-line bg-surface-raised text-text-soft hover:border-deep-teal')}>
                  <span aria-hidden className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border">{answers[question.key] === option.key ? '✓' : ''}</span><span className="min-w-0 break-words">{option.label}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button type="button" disabled={!answers[question.key]} onClick={() => { moved.current = true; if (step === content.questions.length - 1) setShowResult(true); else setStep(step + 1) }}>{step === content.questions.length - 1 ? 'اكتشفي مسارك' : 'السؤال التالي'}</Button>
            {step > 0 ? <Button type="button" variant="ghost" onClick={() => navigate(step - 1)}>السؤال السابق</Button> : null}
          </div>
          {answered > 0 ? <button type="button" className="mt-3 min-h-12 text-sm font-semibold text-burgundy underline underline-offset-4" onClick={undoLast}>الرجوع عن آخر إجابة</button> : null}
        </> : (
        <div role="status" aria-live="polite">
          <p className="text-xs font-bold text-burgundy">بدايات مقترحة لكِ</p>
          <h3 ref={focusRef} tabIndex={-1} className="mt-3 text-2xl leading-snug font-bold text-deep-teal">{results.length === 1 ? results[0].title : 'أكثر من بداية ممكن تناسبكِ'}</h3>
          {results.length > 1 && <p className="mt-3 leading-loose text-text-soft">إجاباتكِ موزعة بالتساوي بين هذه المسارات. قارنيها واختاري الأقرب لوقتكِ وطريقتكِ؛ لا يوجد مسار واحد محسوم.</p>}
          <div className="mt-5 space-y-4">
            {results.map((result) => <article key={result.key} className="rounded-2xl border border-line bg-ivory/65 p-5">
              {results.length > 1 && <h4 className="text-xl font-bold leading-loose text-deep-teal">{result.title}</h4>}
              <p className="mt-2 leading-loose text-text-soft">{result.explanation}</p>
              <p className="mt-2 text-sm leading-loose text-deep-teal">{result.rationale}</p>
              <Button href={result.target} className="mt-4">{result.cta}</Button>
            </article>)}
          </div>
          <details className="mt-5 rounded-xl border border-line px-4 py-2">
            <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold text-deep-teal">راجعي اختياراتكِ</summary>
            <ul className="space-y-3 py-3 text-sm leading-loose text-text-soft">{content.questions.map((item) => <li key={item.key}><span className="font-bold text-deep-teal">{item.title}</span><br />{item.options.find((option) => option.key === answers[item.key])?.label}</li>)}</ul>
          </details>
          <div className="mt-5"><Button type="button" variant="secondary" onClick={() => navigate(0)}>تعديل الإجابات</Button></div>
          <button type="button" className="mt-3 min-h-12 text-sm font-semibold text-burgundy underline underline-offset-4" onClick={() => { setAnswers({}); setAnswerOrder([]); navigate(0) }}>بدء الاختبار من جديد</button>
        </div>
        )}
      </div>
      </div>
      <div className="border-t border-line px-6 py-4 text-center text-xs leading-loose text-text-soft">
        <p>{content.disclaimer}</p>
        <p className="mt-1">إجاباتك تبقى داخل هذه الصفحة ولا تُرسل إلى الخادم أو أدوات التحليل.</p>
      </div>
    </div>
  )
}
