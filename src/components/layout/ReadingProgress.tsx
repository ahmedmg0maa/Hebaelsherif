'use client'
import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
export function ReadingProgress() {
  const bar = useRef<HTMLSpanElement>(null)
  const path = usePathname()
  useEffect(() => {
    let frame = 0
    function update() {
      if (frame) return
      frame = requestAnimationFrame(() => {
        const range = document.documentElement.scrollHeight - document.documentElement.clientHeight
        const fraction = range > 0 ? Math.max(0, Math.min(1, window.scrollY / range)) : 0
        if (bar.current) bar.current.style.transform = `scaleX(${fraction})`
        frame = 0
      })
    }
    window.addEventListener('scroll', update, { passive: true }); window.addEventListener('resize', update); update()
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(update) : null
    observer?.observe(document.body)
    return () => { window.removeEventListener('scroll', update); window.removeEventListener('resize', update); observer?.disconnect(); cancelAnimationFrame(frame) }
  }, [path])
  return <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5"><span ref={bar} className="block h-full origin-right scale-x-0 bg-burgundy dark:bg-antique-gold" /></span>
}
