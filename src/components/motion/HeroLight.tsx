'use client'

import { useEffect, useRef } from 'react'
import { useReducedMotion } from './MotionToggle'

/** A bounded light follows a fine pointer; it never captures input or changes layout. */
export function HeroLight() {
  const light = useRef<HTMLSpanElement>(null)
  const reduced = useReducedMotion()
  useEffect(() => {
    const node = light.current
    const host = node?.closest<HTMLElement>('.learning-hero')
    const pointer = window.matchMedia('(hover: hover) and (pointer: fine)')
    if (!node || !host || reduced || !pointer.matches) return
    let frame = 0
    let x = 0, y = 0
    const hide = () => { cancelAnimationFrame(frame); frame = 0; node.style.opacity = '0' }
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      x = event.clientX; y = event.clientY
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        const box = host.getBoundingClientRect()
        node.style.transform = `translate3d(${x - box.left - 208}px,${y - box.top - 208}px,0)`
        node.style.opacity = '1'
      })
    }
    host.addEventListener('pointermove', move, { passive: true })
    host.addEventListener('pointerleave', hide)
    window.addEventListener('scroll', hide, { passive: true })
    pointer.addEventListener('change', hide)
    return () => { hide(); host.removeEventListener('pointermove', move); host.removeEventListener('pointerleave', hide); window.removeEventListener('scroll', hide); pointer.removeEventListener('change', hide) }
  }, [reduced])
  return <span ref={light} className="hero-pointer-glow" aria-hidden />
}
