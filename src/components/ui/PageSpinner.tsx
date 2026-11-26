export function PageSpinner({ label = 'لحظات…' }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4" role="status" aria-live="polite">
      <svg viewBox="0 0 44 44" className="h-11 w-11 animate-spin text-antique-gold" fill="none" aria-hidden>
        <circle cx="22" cy="22" r="18" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
        <path d="M40 22a18 18 0 0 0-18-18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <p className="text-sm text-taupe">{label}</p>
    </div>
  )
}
