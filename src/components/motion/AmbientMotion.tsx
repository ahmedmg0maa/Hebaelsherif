'use client'

import { useEffect, useRef } from 'react'

/** Pause decorative loops when their section or the page is out of view. */
export function AmbientMotion() {
  const anchor = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const section = anchor.current?.closest<HTMLElement>('[data-ambient-motion]')
    if (!section) return

    let inView = true
    const update = () => {
      section.dataset.ambientMotion = inView && !document.hidden ? 'running' : 'paused'
    }

    let observer: IntersectionObserver | undefined
    if (typeof IntersectionObserver === 'function') {
      observer = new IntersectionObserver(([entry]) => {
        if (entry) {
          inView = entry.isIntersecting
          update()
        }
      })
      observer.observe(section)
    }

    update()
    document.addEventListener('visibilitychange', update)
    return () => {
      observer?.disconnect()
      document.removeEventListener('visibilitychange', update)
    }
  }, [])

  return <span ref={anchor} hidden aria-hidden />
}
