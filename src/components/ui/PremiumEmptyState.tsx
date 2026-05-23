import PremiumButton from './PremiumButton'

interface PremiumEmptyStateProps {
  icon?: string
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
  className?: string
}

export default function PremiumEmptyState({
  icon = '✦',
  title,
  description,
  actionLabel,
  actionHref,
  className = '',
}: PremiumEmptyStateProps) {
  return (
    <div
      className={[
        'flex flex-col items-center justify-center rounded-3xl border border-sand bg-ivory/90 px-6 py-16 text-center shadow-soft backdrop-blur-sm',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="mb-5 text-4xl text-gold">{icon}</div>

      <h3 className="mb-3 text-xl font-black text-charcoal">{title}</h3>

      <p className="max-w-md text-sm leading-7 text-warm-gray">{description}</p>

      {actionLabel && actionHref ? (
        <PremiumButton href={actionHref} variant="outline" size="sm" className="mt-7">
          {actionLabel}
        </PremiumButton>
      ) : null}
    </div>
  )
}