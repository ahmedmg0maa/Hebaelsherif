import type { HTMLAttributes, ReactNode } from 'react'

type PremiumBadgeVariant = 'gold' | 'petrol' | 'olive' | 'burgundy' | 'neutral'

interface PremiumBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode
  variant?: PremiumBadgeVariant
}

const variants: Record<PremiumBadgeVariant, string> = {
  gold: 'border-gold/25 bg-gold/10 text-gold',
  petrol: 'border-petrol/20 bg-petrol/10 text-petrol',
  olive: 'border-olive/20 bg-olive/10 text-olive',
  burgundy: 'border-burgundy/20 bg-burgundy/10 text-burgundy',
  neutral: 'border-sand bg-cream text-warm-gray',
}

export default function PremiumBadge({
  children,
  variant = 'gold',
  className = '',
  ...props
}: PremiumBadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold',
        variants[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </span>
  )
}