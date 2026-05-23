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
  primary: 'bg-burgundy text-ivory shadow-[0_14px_32px_rgba(122,36,51,.18)] hover:bg-burgundy/90',
  outline: 'border border-burgundy/25 bg-ivory/60 text-burgundy hover:border-burgundy hover:bg-burgundy hover:text-ivory',
  ghost: 'text-burgundy hover:bg-burgundy/10',
  gold: 'bg-gold text-ivory shadow-[0_14px_32px_rgba(183,155,108,.18)] hover:bg-gold/90',
  danger: 'bg-burgundy text-ivory hover:bg-burgundy/90',
  soft: 'border border-sand bg-ivory/80 text-charcoal hover:border-gold/50 hover:bg-cream',
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
