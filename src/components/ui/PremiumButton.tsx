import Link from 'next/link'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'gold' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface PremiumButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  href?: string
  variant?: ButtonVariant
  size?: ButtonSize
  children: ReactNode
  className?: string
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-petrol text-cream hover:bg-petrol/90',
  outline: 'border border-petrol text-petrol hover:bg-petrol hover:text-cream',
  ghost: 'text-petrol hover:bg-petrol/10',
  gold: 'bg-gold text-cream hover:bg-gold/90',
  danger: 'bg-burgundy text-cream hover:bg-burgundy/90',
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
    'inline-flex items-center justify-center rounded-full font-bold transition-all duration-200',
    'focus-premium disabled:pointer-events-none disabled:opacity-50',
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