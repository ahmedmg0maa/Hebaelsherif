'use client'

import { useEffect, useState } from 'react'

function SunIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" d="M12 2.8v2M12 19.2v2M4.3 4.3l1.4 1.4M18.3 18.3l1.4 1.4M2.8 12h2M19.2 12h2M4.3 19.7l1.4-1.4M18.3 5.7l1.4-1.4" />
    </svg>
  )
}

function MoonIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
        d="M20.1 14.3A8.2 8.2 0 0 1 9.7 3.9 8.4 8.4 0 1 0 20.1 14.3Z"
      />
    </svg>
  )
}

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
      className={`group inline-flex items-center justify-center rounded-full border border-gold/25 bg-ivory/88 text-petrol shadow-soft backdrop-blur-md transition hover:-translate-y-0.5 hover:border-gold/60 hover:bg-cream hover:text-gold ${compact ? 'h-10 w-10' : 'h-11 w-11'}`}
      aria-label={dark ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الليلي'}
      aria-pressed={dark}
      title={dark ? 'الوضع الفاتح' : 'الوضع الليلي'}
    >
      {dark ? <MoonIcon className="h-5 w-5" /> : <SunIcon className="h-5 w-5" />}
    </button>
  )
}
