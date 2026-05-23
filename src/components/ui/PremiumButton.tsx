import Link from 'next/link'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'gold' | 'danger' | 'soft'
type ButtonSize = 'sm' | 'md' | 'lg'

interface PremiumButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  href?: string
  variant?: ButtonVariant
  size?: ButtonSize
  children: ReactNode
  className?: string
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-petrol text-ivory shadow-[0_14px_32px_rgba(47,97,115,.17)] hover:bg-petrol/92',
  outline: 'border border-petrol/28 bg-ivory/64 text-petrol hover:border-petrol hover:bg-petrol hover:text-ivory',
  ghost: 'text-petrol hover:bg-petrol/10',
  gold: 'bg-gold text-charcoal shadow-[0_14px_32px_rgba(183,155,108,.16)] hover:bg-gold/88',
  danger: 'bg-petrol text-ivory hover:bg-petrol/90',
  soft: 'border border-sand bg-ivory/80 text-charcoal hover:border-petrol/35 hover:bg-cream',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-xs',
  md: 'px-6 py-3 text-sm',
  lg: 'px-8 py-4 text-base',
}

export default function PremiumButton({
  href,
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  disabled,
  type = 'button',
  ...props
}: PremiumButtonProps) {
  const classes = [
    'inline-flex items-center justify-center rounded-full font-black transition-all duration-300',
    'focus-premium disabled:pointer-events-none disabled:opacity-50 hover:-translate-y-0.5',
    variants[variant],
    sizes[size],
    className,
  ]
    .filter(Boolean)
    .join(' ')

  if (href && !disabled) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    )
  }

  return (
    <button type={type} disabled={disabled} className={classes} {...props}>
      {children}
    </button>
  )
}
