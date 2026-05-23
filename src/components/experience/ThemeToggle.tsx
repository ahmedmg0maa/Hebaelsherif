'use client'

import { useEffect, useId, useState } from 'react'

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [dark, setDark] = useState(false)
  const labelId = useId()

  useEffect(() => {
    const stored = window.localStorage.getItem('heba-theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const shouldDark = stored ? stored === 'dark' : prefersDark
    setDark(shouldDark)
    document.documentElement.classList.toggle('dark', shouldDark)
  }, [])

  function toggleTheme() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    window.localStorage.setItem('heba-theme', next ? 'dark' : 'light')
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className="group inline-flex h-10 items-center gap-1 rounded-full border border-sand bg-ivory/88 px-1.5 shadow-soft backdrop-blur-md transition hover:border-petrol/35"
        aria-label={dark ? 'تفعيل الوضع الهادئ' : 'تفعيل الوضع الليلي'}
        aria-pressed={dark}
      >
        <span className={`rounded-full px-3 py-1.5 text-[11px] font-black transition ${!dark ? 'bg-petrol text-ivory shadow-soft' : 'text-warm-gray group-hover:text-petrol'}`}>هادئ</span>
        <span className={`rounded-full px-3 py-1.5 text-[11px] font-black transition ${dark ? 'bg-gold text-charcoal shadow-soft' : 'text-warm-gray group-hover:text-petrol'}`}>ليلي</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex w-full items-center justify-between gap-3 rounded-full border border-sand bg-ivory/88 px-3 py-2 text-xs font-black text-charcoal shadow-soft backdrop-blur-md transition hover:border-petrol/35"
      aria-labelledby={labelId}
      aria-pressed={dark}
    >
      <span id={labelId}>{dark ? 'الوضع الليلي' : 'الوضع الهادئ'}</span>
      <span className="inline-flex rounded-full border border-sand bg-cream/75 p-1">
        <span className={`rounded-full px-3 py-1 transition ${!dark ? 'bg-petrol text-ivory' : 'text-warm-gray'}`}>هادئ</span>
        <span className={`rounded-full px-3 py-1 transition ${dark ? 'bg-gold text-charcoal' : 'text-warm-gray'}`}>ليلي</span>
      </span>
    </button>
  )
}
