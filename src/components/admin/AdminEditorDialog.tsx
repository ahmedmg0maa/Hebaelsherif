'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'

// Native modal reuses the workspace's dialog approach. Content stays mounted
// after its first open so closing/reopening does not discard an unsaved draft.
export function AdminEditorDialog({ title, triggerLabel, children }: {
  title: string
  triggerLabel: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [visited, setVisited] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const id = useId()
  useEffect(() => {
    if (!open || !dialog.current) return
    const element = dialog.current, opener = trigger.current
    const overflow = document.body.style.overflow
    element.showModal()
    document.body.style.overflow = 'hidden'
    heading.current?.focus({ preventScroll: true })
    return () => {
      element.close()
      document.body.style.overflow = overflow
      if (opener?.isConnected) opener.focus({ preventScroll: true })
    }
  }, [open])
  return <>
    <button ref={trigger} type="button" className="min-h-12 rounded-full border border-deep-teal/30 px-4 py-2 text-sm font-semibold text-deep-teal hover:bg-deep-teal/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt" aria-haspopup="dialog" aria-controls={id} onClick={() => { setVisited(true); setOpen(true) }}>{triggerLabel}</button>
    <dialog ref={dialog} id={id} aria-labelledby={`${id}-title`} onCancel={() => setOpen(false)} onClose={() => setOpen(false)} className="fixed inset-0 m-auto max-h-[92dvh] w-[calc(100%_-_1rem)] max-w-4xl overflow-y-auto overscroll-contain rounded-3xl border border-line bg-surface-raised p-0 text-ink shadow-card backdrop:bg-ink/60">
      <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-surface-raised px-5 py-4 sm:px-8">
        <h2 ref={heading} tabIndex={-1} id={`${id}-title`} className="min-w-0 break-words font-heading text-2xl leading-relaxed text-deep-teal outline-none">{title}</h2>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="shrink-0">إغلاق</Button>
      </header>
      <div className="p-5 sm:p-8">{visited && children}</div>
    </dialog>
  </>
}
