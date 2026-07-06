export default function LearnerProgressRing({ value = 0, label = 'إجمالي التقدم', size = 'md' }: { value?: number; label?: string; size?: 'sm' | 'md' | 'lg' }) {
  const safeValue = Math.max(0, Math.min(100, Math.round(Number(value) || 0)))
  const radius = 46
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (safeValue / 100) * circumference
  const dimensions = size === 'lg' ? 'h-36 w-36' : size === 'sm' ? 'h-24 w-24' : 'h-28 w-28'

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className={`relative ${dimensions}`}>
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="rgb(var(--color-sand) / .72)" strokeWidth="8" />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="rgb(var(--color-burgundy))"
            strokeLinecap="round"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center rounded-full">
          <span className="latin-numerals text-2xl font-black text-burgundy">{safeValue}%</span>
        </div>
      </div>
      <p className="text-xs font-black text-warm-gray">{label}</p>
    </div>
  )
}
