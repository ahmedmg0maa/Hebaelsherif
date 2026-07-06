'use client'

import { useEffect, useMemo } from 'react'

interface ContentProtectionProps {
  children: React.ReactNode
  userLabel?: string
  productTitle?: string
  className?: string
}

export default function ContentProtection({
  children,
  userLabel = 'حساب خاص',
  productTitle = 'محتوى محمي',
  className = '',
}: ContentProtectionProps) {
  const watermark = useMemo(() => {
    const date = new Date().toISOString().slice(0, 10)
    return `${userLabel} · ${productTitle} · ${date}`
  }, [productTitle, userLabel])

  useEffect(() => {
    function protectEvent(event: Event) {
      const target = event.target as HTMLElement | null
      if (target?.closest('[data-protected-content="true"]')) {
        event.preventDefault()
      }
    }

    document.addEventListener('contextmenu', protectEvent)
    document.addEventListener('copy', protectEvent)
    document.addEventListener('cut', protectEvent)
    document.addEventListener('dragstart', protectEvent)

    return () => {
      document.removeEventListener('contextmenu', protectEvent)
      document.removeEventListener('copy', protectEvent)
      document.removeEventListener('cut', protectEvent)
      document.removeEventListener('dragstart', protectEvent)
    }
  }, [])

  return (
    <div
      data-protected-content="true"
      className={`protected-content-shell relative overflow-hidden rounded-[2rem] ${className}`}
      aria-label="محتوى شخصي محمي"
    >
      <div className="pointer-events-none absolute inset-0 z-20 opacity-[0.075] mix-blend-multiply dark:mix-blend-screen">
        <div className="grid h-full w-full rotate-[-18deg] grid-cols-2 gap-10 text-center text-xs font-black text-petrol">
          {Array.from({ length: 18 }).map((_, index) => (
            <span key={index} className="latin-numerals whitespace-nowrap">
              {watermark}
            </span>
          ))}
        </div>
      </div>
      <div className="pointer-events-none absolute right-4 top-4 z-30 rounded-full border border-sand bg-ivory/82 px-3 py-1 text-[11px] font-black text-petrol shadow-soft backdrop-blur-md">
        وصول شخصي محمي
      </div>
      {children}
    </div>
  )
}
