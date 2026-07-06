'use client'

import { useState } from 'react'
import type { Lesson } from '@/types'
import LessonItem from './LessonItem'

export default function StageAccordion({ title, lessons }: { title: string; lessons: Lesson[] }) {
  const [open, setOpen] = useState(true)
  return (
    <section className="rounded-[1.75rem] border border-sand bg-ivory/80 p-4 shadow-soft dark:border-gold/25 dark:bg-white/10">
      <button type="button" onClick={() => setOpen((current) => !current)} className="flex w-full items-center justify-between text-right font-black text-charcoal dark:text-ivory">
        <span>{title}</span>
        <span className="text-gold">{open ? '−' : '+'}</span>
      </button>
      {open ? <div className="mt-4 grid gap-3">{lessons.map((lesson) => <LessonItem key={lesson.id} lesson={lesson} />)}</div> : null}
    </section>
  )
}
