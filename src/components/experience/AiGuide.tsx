'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

const guideTopics = [
  {
    id: 'start',
    label: 'أبدأ منين؟',
    title: 'ابدئي من السؤال الأقرب لقلبك',
    answer:
      'لو تحتاجين ترتيبًا خطوة بخطوة فابدئي بالكورسات. لو تريدين تأملًا هادئًا فالكتب أنسب. لو السؤال شخصي أو مرتبط بعلاقة محددة فالجلسة أوضح.',
    href: '/start-here',
    action: 'ابدئي هنا',
  },
  {
    id: 'session',
    label: 'جلسة أم محتوى؟',
    title: 'الجلسة مناسبة عندما يكون السؤال شخصيًا',
    answer:
      'اختاري الجلسة إذا كان لديك موقف متكرر، قرار عاطفي، علاقة مرهقة، أو احتياج لفهم أعمق لا يكفي معه محتوى عام.',
    href: '/booking',
    action: 'احجزي جلسة',
  },
  {
    id: 'course',
    label: 'أنسب كورس؟',
    title: 'اختاري الكورس حسب المرحلة لا حسب الفضول',
    answer:
      'الكورس الأنسب هو الذي يشرح ما تعيشينه الآن: حدود، تشتت، تعلق، أو ضعف اتصال بالذات. اقرئي الوعد العاطفي قبل السعر.',
    href: '/courses',
    action: 'شاهدي الكورسات',
  },
  {
    id: 'book',
    label: 'أنسب كتاب؟',
    title: 'الكتاب مناسب للهدوء والتأمل',
    answer:
      'لو تريدين بداية لطيفة بلا التزام طويل، ابدئي بكتاب رقمي ثم عودي لتحديد ما إذا كنت تحتاجين كورسًا أو جلسة.',
    href: '/books',
    action: 'شاهدي الكتب',
  },
]

const assessmentQuestions = [
  {
    id: 'clarity',
    question: 'ما الأقرب لاحتياجك الآن؟',
    answers: [
      { label: 'وضوح شخصي سريع', score: 'session' },
      { label: 'مسار تعلم منظم', score: 'course' },
      { label: 'قراءة هادئة', score: 'book' },
    ],
  },
  {
    id: 'pressure',
    question: 'هل الموضوع مرتبط بموقف محدد؟',
    answers: [
      { label: 'نعم، علاقة أو قرار', score: 'session' },
      { label: 'لا، أريد فهمًا أوسع', score: 'course' },
      { label: 'أريد مساحة تأمل فقط', score: 'book' },
    ],
  },
]

export default function AiGuide() {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'guide' | 'assessment'>('guide')
  const [activeId, setActiveId] = useState('start')
  const [scores, setScores] = useState<Record<string, number>>({ session: 0, course: 0, book: 0 })
  const active = useMemo(() => guideTopics.find((item) => item.id === activeId) || guideTopics[0], [activeId])
  const answeredCount = Object.values(scores).reduce((sum, value) => sum + value, 0)
  const result = useMemo(() => {
    const entries = Object.entries(scores).sort((a, b) => b[1] - a[1])
    const top = entries[0]?.[0] || 'course'
    if (top === 'session') return { label: 'جلسة فردية', href: '/booking', text: 'الأقرب الآن: جلسة فردية تمنحك وضوحًا أسرع.' }
    if (top === 'book') return { label: 'كتاب رقمي', href: '/books', text: 'الأقرب الآن: كتاب هادئ تبدأين منه دون ضغط.' }
    return { label: 'كورس منظم', href: '/courses', text: 'الأقرب الآن: كورس منظم يساعدك على بناء الفهم خطوة بخطوة.' }
  }, [scores])

  function answer(score: string) {
    setScores((current) => ({ ...current, [score]: (current[score] || 0) + 1 }))
  }

  return (
    <div className="fixed bottom-4 left-4 z-[90] print:hidden sm:bottom-6 sm:left-6">
      {open ? (
        <div className="mb-3 w-[min(94vw,450px)] overflow-hidden rounded-[2.25rem] border border-sand bg-ivory/96 shadow-premium backdrop-blur-xl">
          <div className="brand-luxury-veil relative overflow-hidden border-b border-sand p-5">
            <div className="ambient-orb ambient-orb-petrol left-8 top-0 h-20 w-20" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="mini-label">دليل هبة</p>
                <h3 className="mt-2 text-xl font-black leading-snug text-charcoal">اختاري البداية الأقرب لكِ</h3>
                <p className="mt-2 text-xs leading-6 text-warm-gray">أسئلة قصيرة تقترح عليكِ بداية هادئة: جلسة، كورس، أو كتاب.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-sand bg-cream text-lg font-black text-petrol transition hover:border-petrol/30"
                aria-label="إغلاق دليل هبة"
              >
                ×
              </button>
            </div>

            <div className="relative mt-5 grid grid-cols-2 gap-2 rounded-full border border-sand bg-cream/70 p-1">
              <button
                type="button"
                onClick={() => setMode('guide')}
                className={`rounded-full px-4 py-2 text-xs font-black transition ${mode === 'guide' ? 'bg-petrol text-ivory shadow-soft' : 'text-warm-gray hover:text-petrol'}`}
              >
                توجيه سريع
              </button>
              <button
                type="button"
                onClick={() => setMode('assessment')}
                className={`rounded-full px-4 py-2 text-xs font-black transition ${mode === 'assessment' ? 'bg-petrol text-ivory shadow-soft' : 'text-warm-gray hover:text-petrol'}`}
              >
                اختبار لطيف
              </button>
            </div>
          </div>

          {mode === 'guide' ? (
            <div className="p-5">
              <div className="grid grid-cols-2 gap-2">
                {guideTopics.map((topic) => (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => setActiveId(topic.id)}
                    className={`rounded-2xl border px-3 py-3 text-right text-xs font-black transition ${
                      activeId === topic.id ? 'border-petrol bg-petrol/10 text-petrol' : 'border-sand bg-cream/70 text-charcoal hover:border-gold/40'
                    }`}
                  >
                    {topic.label}
                  </button>
                ))}
              </div>

              <div className="mt-4 rounded-[1.5rem] border border-sand bg-cream/60 p-5">
                <h4 className="text-lg font-black text-charcoal">{active.title}</h4>
                <p className="mt-3 text-sm leading-8 text-warm-gray">{active.answer}</p>
                <Link
                  href={active.href}
                  className="mt-5 inline-flex rounded-full bg-petrol px-5 py-2.5 text-xs font-black text-ivory transition hover:bg-gold hover:text-charcoal"
                  onClick={() => setOpen(false)}
                >
                  {active.action}
                </Link>
              </div>
            </div>
          ) : (
            <div className="p-5">
              <div className="space-y-4">
                {assessmentQuestions.map((question, index) => (
                  <div key={question.id} className="rounded-[1.5rem] border border-sand bg-cream/60 p-4">
                    <p className="latin-numerals text-[11px] font-black text-gold">0{index + 1}</p>
                    <p className="mt-1 text-sm font-black text-charcoal">{question.question}</p>
                    <div className="mt-3 grid gap-2">
                      {question.answers.map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => answer(item.score)}
                          className="rounded-2xl border border-sand bg-ivory/80 px-3 py-2.5 text-right text-xs font-bold text-warm-gray transition hover:border-petrol/35 hover:text-petrol"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-[1.5rem] border border-petrol/15 bg-petrol/10 p-4">
                <p className="text-xs font-black text-petrol">النتيجة الهادئة</p>
                <p className="mt-2 text-sm leading-7 text-charcoal">{answeredCount ? result.text : 'أجيبي عن سؤال أو سؤالين، وسنقترح بداية مناسبة.'}</p>
                <Link href={result.href} onClick={() => setOpen(false)} className="mt-3 inline-flex text-xs font-black text-petrol hover:text-gold">
                  اذهبي إلى {result.label}
                </Link>
              </div>
            </div>
          )}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="group inline-flex min-h-14 items-center gap-3 rounded-full border border-gold/30 bg-ivory/95 px-4 text-sm font-black text-petrol shadow-premium backdrop-blur-xl transition hover:-translate-y-1 hover:border-petrol/30"
        aria-label="فتح دليل هبة"
        aria-expanded={open}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-petrol text-xs text-ivory transition group-hover:bg-gold group-hover:text-charcoal">هبة</span>
        <span className="hidden sm:inline">دليل البداية</span>
      </button>
    </div>
  )
}
