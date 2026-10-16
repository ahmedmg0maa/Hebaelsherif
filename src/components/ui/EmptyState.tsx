import { cn } from '@/lib/cn'
import { Button } from './Button'

type EmptyStateProps = {
  icon?: React.ReactNode
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
  className?: string
}

function DefaultOrnament() {
  return (
    <svg viewBox="0 0 64 64" className="h-14 w-14 text-antique-gold" fill="none" aria-hidden>
      <circle cx="32" cy="32" r="30" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.5" />
      <path
        d="M32 14c3 8 10 15 18 18-8 3-15 10-18 18-3-8-10-15-18-18 8-3 15-10 18-18Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function EmptyState({ icon, title, description, actionLabel, actionHref, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-sand bg-surface-raised/60 px-8 py-16 text-center',
        className,
      )}
    >
      {icon ?? <DefaultOrnament />}
      <h3 className="text-xl font-bold text-deep-teal">{title}</h3>
      <p className="max-w-sm leading-relaxed text-text-soft">{description}</p>
      {actionLabel && actionHref && (
        <Button href={actionHref} variant="secondary" size="sm" className="mt-2">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
