'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/cn'

// Content is readable without JS. Only below-fold content opts into a short entrance.
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (reduced.matches || document.documentElement.dataset.motion === 'reduced' || typeof IntersectionObserver !== 'function') return
    if (el.getBoundingClientRect().top <= window.innerHeight - 32) return
    el.classList.add('reveal-pending')
    const finish = () => { el.classList.remove('reveal-pending'); el.classList.add('is-visible') }
    const preferenceChanged = () => { if (reduced.matches || document.documentElement.dataset.motion === 'reduced') finish() }
    let observed = false
    let observer: IntersectionObserver
    try { observer = new IntersectionObserver(
      (entries) => {
        observed = true
        for (const entry of entries) {
          if (entry.isIntersecting) {
            finish()
            observer.disconnect()
          }
        }
      },
      { threshold: 0, rootMargin: '0px 0px -24px 0px' },
    )
    observer.observe(el)
    } catch { finish(); return }
    // Keep real off-screen entrances; fall back only if the observer never responds.
    const failSafe = window.setTimeout(() => { if (!observed) finish() }, 1800)
    reduced.addEventListener('change', preferenceChanged)
    window.addEventListener('heba-motion-change', preferenceChanged)
    el.addEventListener('focusin', finish)
    return () => { observer.disconnect(); window.clearTimeout(failSafe); reduced.removeEventListener('change', preferenceChanged); window.removeEventListener('heba-motion-change', preferenceChanged); el.removeEventListener('focusin', finish); finish() }
  }, [])

  return (
    <div ref={ref} className={cn('reveal', className)} style={delay ? { transitionDelay: `${Math.min(200, Math.max(0, delay))}ms` } : undefined}>
      {children}
    </div>
  )
}
