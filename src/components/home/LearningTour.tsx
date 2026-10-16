'use client'

import { useId, useRef, useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import type { EditorialFeatureContent } from '@/lib/home/sections'
import type { ResolvedHomeMedia } from '@/lib/home/media'

type Stage = 'understand' | 'apply' | 'review'
const stages: { id: Stage; label: string; detail: string }[] = [
  { id: 'understand', label: 'افهمي الفكرة', detail: 'معرفة مرتبطة بحياتكِ' },
  { id: 'apply', label: 'جرّبي التطبيق', detail: 'خطوة صغيرة وواضحة' },
  { id: 'review', label: 'راجعي خطوتكِ', detail: 'اختيار يمكنكِ الرجوع إليه' },
]

/** A useful, explicitly local practice sample, not a simulated enrolled account. */
export function LearningTour({ content, media }: { content: EditorialFeatureContent; media?: ResolvedHomeMedia }) {
  const [stage, setStage] = useState<Stage>('understand')
  const [thought, setThought] = useState('')
  const [step, setStep] = useState('')
  const id = useId()
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const panelId = `${id}-panel`
  // Upgrade only the former built-in copy; owner-authored content remains authoritative.
  const heading = content.heading === 'تعلّمي على مهلك' ? 'فكرة تفهمينها، وخطوة تختارينها' : content.heading
  const body = content.body === 'مكان واحد للدروس والملاحظات والمواد العملية. اختاري درسكِ، واكتبي ما يهمكِ، وتابعي الدروس التي أكملتِها.' ? 'الفائدة لا تتوقف عند الشرح. جرّبي نموذجًا قصيرًا: افهمي فكرة، طبّقيها على موقف، ثم راجعي الخطوة التي اخترتِها.' : content.body
  const formerLibraryLink = content.secondaryLabel === 'مكتبتي' && content.secondaryHref === '/dashboard/courses'
  const index = stages.findIndex(item => item.id === stage)
  const move = (next: number) => { setStage(stages[next].id); tabRefs.current[next]?.focus() }

  return <section className="learning-tour journey-surface" aria-labelledby={`${id}-heading`} data-learning-tour>
    <div className="tour-layout">
      <div className="tour-intro">
        <p className="section-kicker">{content.eyebrow}</p>
        <h2 id={`${id}-heading`} className="mt-4 font-heading text-3xl font-bold leading-relaxed sm:text-4xl">{heading}</h2>
        <p className="mt-4 max-w-xl leading-loose text-on-dark/85">{body}</p>
        <ol className="tour-benefits" aria-label="من الفهم إلى التطبيق">
          {stages.map((item, i) => <li key={item.id}><span aria-hidden>{(i + 1).toLocaleString('ar-EG')}</span><div><strong>{item.label}</strong><p>{item.detail}</p></div></li>)}
        </ol>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button href={content.primaryHref} variant="inverse">{content.primaryLabel}<span aria-hidden>←</span></Button>
          <Button href={formerLibraryLink ? '/start-here' : content.secondaryHref} variant="inverse">{formerLibraryLink ? 'اختاري نقطة البداية' : content.secondaryLabel}</Button>
        </div>
      </div>
      <div className="tour-workspace">
        <div className="tour-workspace-heading">
          <div><p className="text-xs font-bold text-burgundy">نموذج عملي لتجربة التعلّم</p><h3 className="mt-1 text-xl font-bold text-deep-teal">من سؤال يشغلكِ إلى خطوة تختارينها</h3></div>
          <span className="tour-stage-count">{(index + 1).toLocaleString('ar-EG')} / ٣</span>
        </div>
        <div role="tablist" aria-label="مراحل التجربة العملية" className="tour-tabs">
          {stages.map((item, i) => <button key={item.id} ref={node => { tabRefs.current[i] = node }} id={`${id}-${item.id}`} type="button" role="tab" aria-controls={panelId} aria-selected={stage === item.id} tabIndex={stage === item.id ? 0 : -1}
            onClick={() => setStage(item.id)} onKeyDown={event => {
              const next = event.key === 'Home' ? 0 : event.key === 'End' ? stages.length - 1 : ['ArrowLeft', 'ArrowDown'].includes(event.key) ? (i + 1) % stages.length : ['ArrowRight', 'ArrowUp'].includes(event.key) ? (i - 1 + stages.length) % stages.length : -1
              if (next < 0) return
              event.preventDefault(); move(next)
            }}><span aria-hidden>{(i + 1).toLocaleString('ar-EG')}</span>{item.label}</button>)}
        </div>
        <div key={stage} id={panelId} role="tabpanel" tabIndex={0} aria-labelledby={`${id}-${stage}`} className="tour-panel tour-panel-enter">
          {stage === 'understand' ? <>
            {media && <div className="tour-sample-image"><Image src={media.url} alt={media.alt} fill unoptimized sizes="(min-width: 1024px) 600px, 90vw" className="object-cover" style={{ objectPosition: `${media.x}% ${media.y}%` }} /></div>}
            <p className="text-sm font-semibold text-burgundy">الفكرة التي سنجربها</p>
            <h4 className="mt-3 font-heading text-3xl leading-relaxed text-deep-teal">ابدئي بما تستطيعين فعله، لا بكل ما تتمنّين تغييره.</h4>
            <p className="mt-4 leading-loose text-text-soft">حين تتسع الأسئلة، قد يصعب اختيار البداية. جرّبي تحديد أمر واحد يشغلكِ، ثم خطوة صغيرة تقع ضمن قدرتكِ الآن.</p>
            <div className="tour-example"><p className="text-sm font-semibold text-deep-teal">مثال للتوضيح</p><p className="mt-2 leading-loose text-text-soft">«أريد تنظيم يومي» يمكن أن تبدأ بـ «سأختار مهمة واحدة وأخصص لها وقتًا قصيرًا غدًا».</p></div>
            <Button type="button" className="mt-5" onClick={() => move(1)}>جرّبيها على موقف من يومكِ <span aria-hidden>←</span></Button>
          </> : stage === 'apply' ? <div className="space-y-5">
            <label className="block text-sm font-semibold leading-loose text-deep-teal" htmlFor={`${id}-thought`}>ما الأمر الواحد الذي يشغلكِ؟<textarea id={`${id}-thought`} value={thought} onChange={event => setThought(event.target.value)} maxLength={400} rows={3} placeholder="اكتبي لنفسكِ فكرة واحدة، دون بيانات شخصية…" className="tour-input mt-2" /></label>
            <label className="block text-sm font-semibold leading-loose text-deep-teal" htmlFor={`${id}-step`}>ما أول خطوة صغيرة تستطيعين تجربتها؟<textarea id={`${id}-step`} value={step} onChange={event => setStep(event.target.value)} maxLength={400} rows={3} placeholder="خطوة محددة، وفي وقت يناسبكِ…" className="tour-input mt-2" /></label>
            <div className="flex flex-wrap gap-3"><Button type="button" disabled={!thought.trim() || !step.trim()} onClick={() => move(2)}>راجعي خطوتكِ <span aria-hidden>←</span></Button><Button type="button" variant="ghost" onClick={() => move(0)}>ارجعي للفكرة</Button></div>
          </div> : <>
            <h4 className="font-heading text-3xl leading-relaxed text-deep-teal">هل تبدو الخطوة محددة وممكنة؟</h4>
            {thought.trim() || step.trim() ? <dl className="tour-summary"><div><dt>الأمر الذي اخترتِه</dt><dd>{thought.trim() || 'يمكنكِ إضافته في خطوة التطبيق.'}</dd></div><div><dt>خطوتكِ الأولى</dt><dd>{step.trim() || 'اختاري خطوة محددة في التطبيق.'}</dd></div></dl> : <p className="mt-4 leading-loose text-text-soft">ابدئي بخطوة التطبيق لتكتبي أمرًا يشغلكِ وخطوة ممكنة، ثم عودي لمراجعتها هنا.</p>}
            <ul className="tour-checklist"><li>هل تعرفين ما ستفعلينه تحديدًا؟</li><li>هل حجم الخطوة يناسب وقتكِ وقدرتكِ؟</li><li>ما الوقت المناسب لتجربتها ومراجعة ما حدث؟</li></ul>
            <div className="mt-5 flex flex-wrap gap-3"><Button type="button" variant="secondary" onClick={() => move(1)}>عدّلي خطوتكِ</Button>{(thought || step) && <Button type="button" variant="ghost" onClick={() => { setThought(''); setStep(''); move(0) }}>امسحي وابدئي من جديد</Button>}</div>
          </>}
        </div>
        <p className="tour-privacy">هذه تجربة عامة، وليست درسًا من دورة مشتراة. ما تكتبينه يبقى داخل هذه الصفحة، ولا يُرسل أو يُحفظ في حساب؛ يُمسح عند إغلاقها أو إعادة تحميلها.</p>
      </div>
    </div>
  </section>
}
