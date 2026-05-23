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
        className="group inline-flex h-10 w-[72px] items-center rounded-full border border-sand bg-ivory/88 p-1 shadow-soft backdrop-blur-md transition hover:border-petrol/40"
        aria-label={dark ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الليلي'}
        aria-pressed={dark}
      >
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full bg-petrol text-[10px] font-black text-ivory shadow-soft transition-transform duration-300 ${
            dark ? '-translate-x-[32px]' : 'translate-x-0'
          }`}
        >
          {dark ? 'ليل' : 'نهار'}
        </span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex items-center gap-3 rounded-full border border-sand bg-ivory/88 px-3 py-2 text-xs font-black text-charcoal shadow-soft backdrop-blur-md transition hover:border-petrol/40"
      aria-labelledby={labelId}
      aria-pressed={dark}
    >
      <span className="relative h-7 w-12 rounded-full bg-cream ring-1 ring-sand">
        <span
          className={`absolute top-1 flex h-5 w-5 items-center justify-center rounded-full bg-petrol text-[8px] text-ivory shadow-soft transition-all duration-300 ${
            dark ? 'right-1' : 'right-6'
          }`}
        >
          {dark ? 'ليل' : 'هدوء'}
        </span>
      </span>
      <span id={labelId}>{dark ? 'الوضع الليلي' : 'الوضع الهادئ'}</span>
    </button>
  )
}
