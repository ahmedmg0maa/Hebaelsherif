'use client'

// Last-resort boundary — replaces the root layout, so it carries its own html shell.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ fontFamily: 'system-ui, sans-serif', background: '#EDE1CB', color: '#1F1E1C' }}>
        <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center' }}>
          <h1 style={{ color: '#0E3440', fontSize: 28 }}>حدث خطأ غير متوقع</h1>
          <p style={{ color: '#6E675D', maxWidth: 400, lineHeight: 1.8 }}>نعتذر عن هذا الانقطاع. جرّبي إعادة تحميل الصفحة.</p>
          <button
            onClick={reset}
            style={{ background: '#0E3440', color: '#FFFDF8', border: 0, borderRadius: 999, padding: '12px 32px', fontSize: 16, cursor: 'pointer' }}
          >
            إعادة المحاولة
          </button>
        </main>
      </body>
    </html>
  )
}
