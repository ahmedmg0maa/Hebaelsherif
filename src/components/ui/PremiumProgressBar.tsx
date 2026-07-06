type ProgressVariant = 'petrol' | 'gold' | 'olive' | 'burgundy'

interface PremiumProgressBarProps {
  value: number
  variant?: ProgressVariant
  showLabel?: boolean
  className?: string
}

const colors: Record<ProgressVariant, string> = {
  petrol: 'bg-petrol',
  gold: 'bg-gold',
  olive: 'bg-olive',
  burgundy: 'bg-petrol',
}

export default function PremiumProgressBar({
  value,
  variant = 'burgundy',
  showLabel = false,
  className = '',
}: PremiumProgressBarProps) {
  const safeValue = Math.max(0, Math.min(Math.round(value), 100))

  return (
    <div className={className}>
      {showLabel ? (
        <div className="mb-2 flex items-center justify-between text-xs font-bold text-warm-gray">
          <span>التقدم</span>
          <span>{safeValue}%</span>
        </div>
      ) : null}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-sand/90">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${colors[variant]}`}
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  )
}
