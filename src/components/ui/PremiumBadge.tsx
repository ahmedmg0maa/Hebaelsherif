import type { HTMLAttributes, ReactNode } from 'react'

type PremiumBadgeVariant = 'gold' | 'petrol' | 'olive' | 'burgundy' | 'neutral' | 'rose'

interface PremiumBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode
  variant?: PremiumBadgeVariant
}

const variants: Record<PremiumBadgeVariant, string> = {
  gold: 'border-gold/24 bg-gold/9 text-gold',
  petrol: 'border-petrol/20 bg-petrol/9 text-petrol',
  olive: 'border-olive/18 bg-olive/9 text-olive',
  burgundy: 'border-petrol/18 bg-petrol/8 text-petrol',
  rose: 'border-stone/40 bg-cream/65 text-charcoal',
  neutral: 'border-sand bg-cream text-warm-gray',
}

export default function PremiumBadge({ children, variant = 'petrol', className = '', ...props }: PremiumBadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-3.5 py-1.5 text-xs font-black',
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
