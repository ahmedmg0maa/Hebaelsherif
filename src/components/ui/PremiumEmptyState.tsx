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
        'premium-glow-border flex flex-col items-center justify-center rounded-[2rem] border border-sand bg-ivory/90 px-6 py-16 text-center shadow-soft backdrop-blur-sm',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-petrol/10 text-3xl text-petrol">
        {icon}
      </div>
      <h3 className="mb-3 text-2xl font-black text-charcoal">{title}</h3>
      <p className="max-w-md text-sm leading-8 text-warm-gray">{description}</p>
      {actionLabel && actionHref ? (
        <PremiumButton href={actionHref} variant="outline" size="sm" className="mt-7">
          {actionLabel}
        </PremiumButton>
      ) : null}
    </div>
  )
}
