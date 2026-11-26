'use client'

import { useEffect, useRef, useState } from 'react'

export function BackToTop() {
  const [visible, setVisible] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    let frame = 0
    const update = () => {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        const focused = document.activeElement === button.current
        setVisible(window.scrollY > 640 || focused)
        frame = 0
      })
    }
    window.addEventListener('scroll', update, { passive: true })
    update()
    return () => { window.removeEventListener('scroll', update); window.cancelAnimationFrame(frame) }
  }, [])
  return <button ref={button} type="button" hidden={!visible} aria-label="العودة إلى بداية الصفحة" className="back-to-top"
    onClick={() => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduced'
      document.getElementById('main-content')?.focus({ preventScroll: true })
      window.scrollTo({ top: 0, behavior: reduced ? 'instant' : 'smooth' })
      setVisible(false)
    }}>
    <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5"><path d="m6 14 6-6 6 6M12 8v12" strokeLinecap="round" strokeLinejoin="round"/></svg>
  </button>
}
