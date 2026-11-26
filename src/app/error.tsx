'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/Button'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application boundary error', { digest: error.digest ?? 'unavailable' })
  }, [error])

  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <svg viewBox="0 0 64 64" className="h-16 w-16 text-antique-gold" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <circle cx="32" cy="32" r="28" strokeOpacity="0.35" />
        <path d="M32 18v18M32 44v.5" strokeLinecap="round" strokeWidth="2.5" />
      </svg>
      <h1 className="text-3xl font-bold text-deep-teal">حدث خطأ غير متوقع</h1>
      <p className="max-w-md leading-loose text-text-soft">
        نعتذر عن هذا الانقطاع — المشكلة لدينا وليست لديك. جرّبي مرة أخرى، ولو تكررت راسلينا.
      </p>
      {error.digest && <p className="tnum text-xs text-taupe">رمز الخطأ: {error.digest}</p>}
      <div className="flex flex-wrap justify-center gap-4">
        <Button onClick={reset}>إعادة المحاولة</Button>
        <Button href="/" variant="secondary">
          العودة للرئيسية
        </Button>
      </div>
    </main>
  )
}
