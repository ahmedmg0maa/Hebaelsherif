import type { Lesson } from '@/types'

export default function LessonItem({ lesson, active, completed }: { lesson: Lesson; active?: boolean; completed?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${active ? 'border-gold bg-gold/10' : 'border-sand bg-ivory/80 dark:border-gold/25 dark:bg-white/10'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-gold">{lesson.stageTitle}</p>
          <h4 className="mt-1 font-black text-charcoal dark:text-ivory">{lesson.title}</h4>
          <p className="mt-1 text-xs font-bold leading-6 text-warm-gray dark:text-cream">{lesson.description}</p>
        </div>
        <span className="rounded-full border border-gold/35 px-3 py-1 text-[11px] font-black text-petrol dark:text-gold">{completed ? 'تم' : `${lesson.duration} د`}</span>
      </div>
    </div>
  )
}
