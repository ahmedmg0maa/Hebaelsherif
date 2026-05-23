'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

const guideTopics = [
  {
    id: 'start',
    label: 'أبدأ منين؟',
    title: 'ابدئي بالمسار الأقرب لشعورك الآن',
    answer: 'لو تحتاجين ترتيبًا خطوة بخطوة فابدئي بالدورات. لو تحتاجين تأملًا هادئًا فالكتب أنسب. لو السؤال شخصي أو مرتبط بعلاقة محددة فالجلسة أوضح.',
    href: '/services',
    action: 'اختاري مسارك',
  },
  {
    id: 'session',
    label: 'أحتاج جلسة؟',
    title: 'الجلسة مناسبة عندما يكون السؤال شخصيًا',
    answer: 'اختاري الجلسة إذا كان لديك موقف متكرر، قرار عاطفي، علاقة مرهقة، أو احتياج لفهم أعمق لا يكفي معه محتوى عام.',
    href: '/booking',
    action: 'احجزي جلسة',
  },
  {
    id: 'course',
    label: 'أنسب دورة؟',
    title: 'اختاري الدورة حسب المرحلة لا حسب الفضول',
    answer: 'الدورة الأنسب هي التي تشرح ما تعيشينه الآن: حدود، تشتت، تعلق، أو ضعف اتصال بالذات. اقرئي الوعد العاطفي قبل السعر.',
    href: '/courses',
    action: 'الدورات',
  },
  {
    id: 'book',
    label: 'أنسب كتاب؟',
    title: 'الكتاب مناسب للهدوء والتأمل',
    answer: 'لو تريدين بداية لطيفة بلا التزام طويل، ابدئي بكتاب رقمي ثم عودي لتحديد ما إذا كنت تحتاجين دورة أو جلسة.',
    href: '/books',
    action: 'الكتب',
  },
]

const assessmentQuestions = [
  {
    id: 'clarity',
    question: 'ما الأقرب لاحتياجك الآن؟',
    answers: [
      { label: 'أحتاج وضوحًا سريعًا', score: 'session' },
      { label: 'أحتاج تعلمًا منظمًا', score: 'course' },
      { label: 'أحتاج قراءة هادئة', score: 'book' },
    ],
  },
  {
    id: 'pressure',
    question: 'هل الموضوع شخصي ومحدد؟',
    answers: [
      { label: 'نعم، مرتبط بعلاقة/قرار', score: 'session' },
      { label: 'لا، أريد فهمًا عامًا', score: 'course' },
      { label: 'أريد مساحة تأمل فقط', score: 'book' },
    ],
  },
]

export default function AiGuide() {
  const [open, setOpen] = useState(false)
  const [activeId, setActiveId] = useState('start')
  const [scores, setScores] = useState<Record<string, number>>({ session: 0, course: 0, book: 0 })
  const active = useMemo(() => guideTopics.find((item) => item.id === activeId) || guideTopics[0], [activeId])
  const result = useMemo(() => {
    const entries = Object.entries(scores).sort((a, b) => b[1] - a[1])
    const top = entries[0]?.[0] || 'course'
    if (top === 'session') return { label: 'الجلسة الفردية', href: '/booking', text: 'إجاباتك تشير إلى أن جلسة فردية ستمنحك وضوحًا أسرع.' }
    if (top === 'book') return { label: 'كتاب رقمي', href: '/books', text: 'إجاباتك تشير إلى أن البداية اللطيفة بكتاب ستكون مناسبة.' }
    return { label: 'دورة منظمة', href: '/courses', text: 'إجاباتك تشير إلى أن دورة منظمة هي أنسب بداية.' }
  }, [scores])

  function answer(score: string) {
    setScores((current) => ({ ...current, [score]: (current[score] || 0) + 1 }))
  }

  return (
    <div className="fixed bottom-5 left-5 z-[90] print:hidden">
      {open ? (
        <div className="mb-3 w-[min(92vw,420px)] overflow-hidden rounded-[2rem] border border-sand bg-ivory/95 shadow-premium backdrop-blur-xl">
          <div className="relative overflow-hidden border-b border-sand p-5">
            <div className="ambient-orb ambient-orb-gold left-6 top-0 h-20 w-20" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black tracking-[0.2em] text-gold">Heba AI Guide</p>
                <h3 className="mt-2 text-lg font-black text-charcoal">مساعد توجيهي بدون دردشة عشوائية</h3>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full border border-sand bg-cream text-lg font-black text-burgundy" aria-label="إغلاق المساعد">×</button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 p-4">
            {guideTopics.map((topic) => (
              <button key={topic.id} type="button" onClick={() => setActiveId(topic.id)} className={`rounded-2xl border px-3 py-3 text-right text-xs font-black transition ${activeId === topic.id ? 'border-burgundy bg-burgundy text-ivory' : 'border-sand bg-cream/70 text-charcoal hover:border-gold'}`}>
                {topic.label}
              </button>
            ))}
          </div>

          <div className="px-5 pb-5">
            <div className="rounded-[1.5rem] border border-sand bg-cream/60 p-4">
              <h4 className="text-base font-black text-charcoal">{active.title}</h4>
              <p className="mt-3 text-sm leading-7 text-warm-gray">{active.answer}</p>
              <Link href={active.href} className="mt-4 inline-flex rounded-full bg-burgundy px-4 py-2 text-xs font-black text-ivory transition hover:bg-gold" onClick={() => setOpen(false)}>{active.action}</Link>
            </div>

            <div className="mt-4 rounded-[1.5rem] border border-sand bg-ivory/80 p-4">
              <p className="text-xs font-black text-gold">تقييم سريع</p>
              <div className="mt-3 space-y-3">
                {assessmentQuestions.map((question) => (
                  <div key={question.id}>
                    <p className="text-xs font-black text-charcoal">{question.question}</p>
                    <div className="mt-2 grid gap-2">
                      {question.answers.map((item) => (
                        <button key={item.label} type="button" onClick={() => answer(item.score)} className="rounded-2xl border border-sand bg-cream/70 px-3 py-2 text-right text-xs font-bold text-warm-gray transition hover:border-burgundy hover:text-burgundy">
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-2xl bg-burgundy/10 p-3">
                <p className="text-xs leading-6 text-charcoal">{result.text}</p>
                <Link href={result.href} onClick={() => setOpen(false)} className="mt-2 inline-flex text-xs font-black text-burgundy">اذهبي إلى {result.label}</Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <button type="button" onClick={() => setOpen((current) => !current)} className="premium-glow-border flex h-14 w-14 items-center justify-center rounded-full border border-sand bg-burgundy text-2xl text-ivory shadow-premium transition hover:-translate-y-1 hover:bg-gold" aria-label="فتح المساعد الذكي">✦</button>
    </div>
  )
}
