'use client'

import { useEffect, useState } from 'react'

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [dark, setDark] = useState(false)

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

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex items-center justify-center rounded-full border border-sand bg-ivory/85 font-black text-burgundy shadow-soft backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-gold ${compact ? 'h-10 w-10 text-base' : 'h-11 gap-2 px-4 text-xs'}`}
      aria-label={dark ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن'}
    >
      <span>{dark ? '☀' : '☾'}</span>
      {!compact ? <span>{dark ? 'فاتح' : 'داكن'}</span> : null}
    </button>
  )
}
