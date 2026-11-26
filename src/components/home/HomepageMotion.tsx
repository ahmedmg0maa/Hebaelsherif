'use client'

import { useEffect, useRef } from 'react'

export function HomepageMotion() {
  const marker = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const root = marker.current?.closest<HTMLElement>('.site-home')
    if (!root) return

    const header = root.querySelector<HTMLElement>('.home-header')
    const menu = root.querySelector<HTMLDetailsElement>('.home-menu')
    const timeline = root.querySelector<HTMLOListElement>('.home-timeline')
    const steps = Array.from(root.querySelectorAll<HTMLElement>('[data-home-step]'))
    const reveals = Array.from(root.querySelectorAll<HTMLElement>('[data-home-reveal]'))
    const cards = Array.from(root.querySelectorAll<HTMLElement>('[data-home-tilt]'))
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)')

    function showAll() {
      reveals.forEach(node => { delete node.dataset.revealPending })
    }

    let observer: IntersectionObserver | undefined
    if (!reduced.matches && typeof IntersectionObserver === 'function') {
      try {
        observer = new IntersectionObserver(entries => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue
            delete (entry.target as HTMLElement).dataset.revealPending
            observer?.unobserve(entry.target)
          }
        }, { threshold: 0.12 })
        for (const node of reveals) {
          if (node.getBoundingClientRect().top < window.innerHeight) continue
          node.dataset.revealPending = ''
          observer.observe(node)
        }
      } catch {
        observer?.disconnect()
        showAll()
      }
    }

    let frame = 0
    function updateScroll() {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        const { scrollHeight, clientHeight } = document.documentElement
        const scroll = window.scrollY
        header?.toggleAttribute('data-solid', scroll > 60)
        header?.style.setProperty('--home-scroll', String(scroll / Math.max(1, scrollHeight - clientHeight)))
        if (timeline && !reduced.matches) {
          const marker = window.innerHeight * 0.67
          const bounds = timeline.getBoundingClientRect()
          const fill = Math.min(1, Math.max(0, (marker - bounds.top) / bounds.height))
          timeline.style.setProperty('--timeline-fill', String(fill))
          steps.forEach(step => step.toggleAttribute('data-step-active', step.getBoundingClientRect().top < marker))
        }
      })
    }

    const resetTilt = (card: HTMLElement) => {
      delete card.dataset.tilting
      for (const property of ['--tilt-x', '--tilt-y', '--light-x', '--light-y']) card.style.removeProperty(property)
    }
    let tiltFrame = 0
    function moveCard(event: PointerEvent) {
      const card = (event.target as Element).closest<HTMLElement>('[data-home-tilt]')
      if (!card || reduced.matches || !finePointer.matches || event.pointerType !== 'mouse') return
      const { clientX, clientY } = event
      window.cancelAnimationFrame(tiltFrame)
      tiltFrame = window.requestAnimationFrame(() => {
        const rect = card.parentElement!.getBoundingClientRect()
        const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
        const y = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height))
        card.style.setProperty('--tilt-x', `${(0.5 - y) * 12}deg`)
        card.style.setProperty('--tilt-y', `${(x - 0.5) * 12}deg`)
        card.style.setProperty('--light-x', `${x * 100}%`)
        card.style.setProperty('--light-y', `${y * 100}%`)
        card.dataset.tilting = ''
      })
    }
    function leaveCard(event: PointerEvent) {
      window.cancelAnimationFrame(tiltFrame)
      resetTilt(event.currentTarget as HTMLElement)
    }
    function onPreferenceChange() {
      if (reduced.matches) {
        observer?.disconnect()
        showAll()
        window.cancelAnimationFrame(tiltFrame)
        cards.forEach(resetTilt)
      }
      updateScroll()
    }
    function closeOnLink(event: MouseEvent) {
      if ((event.target as Element).closest('a') && menu) menu.open = false
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && menu?.open) {
        menu.open = false
        menu.querySelector('summary')?.focus()
      }
    }

    updateScroll()
    window.addEventListener('scroll', updateScroll, { passive: true })
    window.addEventListener('resize', updateScroll, { passive: true })
    reduced.addEventListener('change', onPreferenceChange)
    root.addEventListener('pointermove', moveCard, { passive: true })
    menu?.addEventListener('click', closeOnLink)
    menu?.addEventListener('keydown', closeOnEscape)
    for (const card of cards) card.addEventListener('pointerleave', leaveCard)

    return () => {
      observer?.disconnect()
      window.cancelAnimationFrame(frame)
      window.cancelAnimationFrame(tiltFrame)
      window.removeEventListener('scroll', updateScroll)
      window.removeEventListener('resize', updateScroll)
      reduced.removeEventListener('change', onPreferenceChange)
      root.removeEventListener('pointermove', moveCard)
      menu?.removeEventListener('click', closeOnLink)
      menu?.removeEventListener('keydown', closeOnEscape)
      for (const card of cards) card.removeEventListener('pointerleave', leaveCard)
    }
  }, [])

  return <span ref={marker} hidden aria-hidden />
}
