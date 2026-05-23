'use client'

import { useState } from 'react'

export interface AccordionItem {
  title: string
  content: string
}

export default function PremiumAccordion({ items }: { items: AccordionItem[] }) {
  const [active, setActive] = useState(0)

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const open = active === index
        return (
          <div key={item.title} className="overflow-hidden rounded-[1.5rem] border border-sand bg-ivory/85 shadow-soft backdrop-blur-sm">
            <button
              type="button"
              onClick={() => setActive(open ? -1 : index)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-right"
              aria-expanded={open}
            >
              <span className="text-sm font-black text-charcoal">{item.title}</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cream text-petrol">{open ? '−' : '+'}</span>
            </button>
            {open ? <p className="border-t border-sand px-5 py-4 text-sm leading-8 text-warm-gray">{item.content}</p> : null}
          </div>
        )
      })}
    </div>
  )
}
