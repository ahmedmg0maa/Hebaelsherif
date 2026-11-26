'use client'

import { useSyncExternalStore } from 'react'
import { cn } from '@/lib/cn'

export function ThemeToggle({ compact = false, className }: { compact?: boolean; className?: string }) {
  // The server shell is intentionally inert until React has attached the
  // handler; useSyncExternalStore provides the correct server/client boundary
  // without a synchronous state update in an effect.
  const interactive = useSyncExternalStore(() => () => {}, () => true, () => false)

  function toggle() {
    const next = !document.documentElement.classList.contains('dark')
    document.documentElement.classList.toggle('dark', next)
    document.documentElement.style.colorScheme = next ? 'dark' : 'light'
    try { localStorage.setItem('heba-theme', next ? 'dark' : 'light') } catch { /* Theme still works when device storage is unavailable. */ }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={!interactive}
      aria-label="تبديل الوضع الفاتح والداكن"
      title="تبديل المظهر"
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line bg-surface-raised px-3 text-sm font-semibold text-deep-teal transition-colors hover:border-aqua hover:bg-aqua/8 dark:border-on-dark/18 dark:bg-on-dark/6 dark:text-on-dark dark:hover:text-aqua',
        compact && 'h-11 w-11 px-0',
        className,
      )}
    >
        <svg viewBox="0 0 24 24" className="hidden h-5 w-5 dark:block" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" strokeLinecap="round" />
        </svg>
        <svg viewBox="0 0 24 24" className="h-5 w-5 dark:hidden" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M20 15.2A8.5 8.5 0 0 1 8.8 4 8.5 8.5 0 1 0 20 15.2Z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      {!compact && <><span className="dark:hidden">الوضع الداكن</span><span className="hidden dark:inline">الوضع الفاتح</span></>}
    </button>
  )
}
