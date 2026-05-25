import Link from 'next/link'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'gold' | 'danger' | 'soft' | 'burgundy'
type ButtonSize = 'sm' | 'md' | 'lg'

interface PremiumButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  href?: string
  variant?: ButtonVariant
  size?: ButtonSize
  children: ReactNode
  className?: string
}

const variants: Record<ButtonVariant, string> = {
  primary:
    'teal-gradient text-ivory shadow-[0_16px_34px_rgb(var(--color-petrol)/.20)] hover:shadow-[0_20px_44px_rgb(var(--color-petrol)/.24)]',
  outline:
    'border border-petrol/30 bg-ivory/70 text-petrol hover:border-petrol hover:bg-petrol hover:text-ivory',
  ghost: 'text-petrol hover:bg-petrol/10',
  gold: 'bg-gold text-deep-teal shadow-[0_16px_34px_rgb(var(--color-gold)/.18)] hover:bg-gold/90',
  danger: 'bg-burgundy text-ivory hover:bg-burgundy/90',
  burgundy: 'bg-burgundy text-ivory shadow-[0_16px_34px_rgb(var(--color-burgundy)/.18)] hover:bg-burgundy/90',
  soft: 'border border-sand bg-ivory/80 text-charcoal hover:border-petrol/35 hover:bg-cream hover:text-petrol',
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
    'relative overflow-hidden',
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
