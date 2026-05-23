'use client'

import { useMemo, useState } from 'react'
import PremiumButton from '@/components/ui/PremiumButton'

const questions = [
  {
    key: 'state',
    title: 'ما الأقرب لما تشعرين به الآن؟',
    options: [
      { label: 'تشتت واحتياج لوضوح', score: 'session' },
      { label: 'أريد مسار تعلم منظم', score: 'course' },
      { label: 'أحتاج قراءة هادئة وحدي', score: 'book' },
    ],
  },
  {
    key: 'pace',
    title: 'أي إيقاع يناسبك؟',
    options: [
      { label: 'جلسة مركزة وسريعة', score: 'session' },
      { label: 'خطوات أسبوعية', score: 'course' },
      { label: 'وقت خاص للقراءة', score: 'book' },
    ],
  },
  {
    key: 'need',
    title: 'ما الذي تحتاجينه أكثر؟',
    options: [
      { label: 'تفكيك سؤال شخصي', score: 'session' },
      { label: 'فهم نمط متكرر', score: 'course' },
      { label: 'تهدئة داخلية', score: 'book' },
    ],
  },
]

const resultCopy = {
  session: {
    title: 'الأنسب الآن: جلسة وضوح خاصة',
    text: 'يبدو أن سؤالك يحتاج مساحة آمنة ومباشرة. ابدئي بجلسة واحدة لتفكيك المشهد بهدوء.',
    href: '/booking',
    cta: 'احجزي جلسة',
  },
  course: {
    title: 'الأنسب الآن: كورس منظم',
    text: 'يبدو أنكِ تحتاجين مسارًا تدريجيًا يساعدك على فهم النمط وبناء تطبيق عملي.',
    href: '/courses',
    cta: 'استكشفي الكورسات',
  },
  book: {
    title: 'الأنسب الآن: كتاب هادئ',
    text: 'يبدو أن البداية الألطف هي قراءة عميقة تمنحك لغة وهدوءًا قبل أي خطوة أكبر.',
    href: '/books',
    cta: 'استكشفي الكتب',
  },
} as const

type ResultKey = keyof typeof resultCopy

export default function PremiumAssessment() {
  const [answers, setAnswers] = useState<Record<string, ResultKey>>({})

  const result = useMemo(() => {
    const counts: Record<ResultKey, number> = { session: 0, course: 0, book: 0 }
    Object.values(answers).forEach((answer) => {
      counts[answer] += 1
    })
    return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'course') as ResultKey
  }, [answers])

  const complete = Object.keys(answers).length === questions.length

  return (
    <section className="premium-glow-border rounded-[2.5rem] border border-sand bg-ivory/90 p-6 shadow-premium backdrop-blur-sm md:p-8">
      <p className="mini-label">ابدئي من هنا</p>
      <h2 className="mt-3 text-3xl font-black leading-tight text-charcoal">اختبار هادئ لاختيار المسار المناسب</h2>
      <p className="mt-3 max-w-2xl text-sm leading-8 text-warm-gray">
        ثلاث أسئلة بسيطة تساعدك على اختيار بداية مناسبة بدون ضغط أو استعجال.
      </p>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        {questions.map((question, index) => (
          <article key={question.key} className="rounded-[2rem] border border-sand bg-cream/65 p-5">
            <p className="text-xs font-black text-gold">{index + 1} / 3</p>
            <h3 className="mt-2 text-lg font-black text-charcoal">{question.title}</h3>
            <div className="mt-5 grid gap-2">
              {question.options.map((option) => {
                const active = answers[question.key] === option.score
                return (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => setAnswers((current) => ({ ...current, [question.key]: option.score as ResultKey }))}
                    className={`rounded-2xl border px-4 py-3 text-right text-sm font-bold transition ${
                      active
                        ? 'border-petrol bg-petrol text-ivory shadow-soft'
                        : 'border-sand bg-ivory/75 text-charcoal hover:border-petrol/40 hover:text-petrol'
                    }`}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </article>
        ))}
      </div>

      {complete ? (
        <div className="mt-8 rounded-[2rem] border border-gold/30 bg-gold/10 p-6">
          <h3 className="text-2xl font-black text-charcoal">{resultCopy[result].title}</h3>
          <p className="mt-3 text-sm leading-8 text-warm-gray">{resultCopy[result].text}</p>
          <PremiumButton href={resultCopy[result].href} className="mt-5">
            {resultCopy[result].cta}
          </PremiumButton>
        </div>
      ) : null}
    </section>
  )
}
