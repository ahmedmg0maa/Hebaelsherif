import Link from 'next/link'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'gold' | 'burgundy' | 'ghost' | 'inverse'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary:
    'bg-deep-teal text-on-dark hover:bg-teal-hover shadow-card hover:shadow-card-hover',
  secondary:
    'border border-deep-teal/30 bg-transparent text-deep-teal hover:border-deep-teal hover:bg-deep-teal/5',
  inverse: 'border border-on-dark/50 bg-transparent text-on-dark hover:border-on-dark hover:bg-on-dark/10',
  gold: 'bg-antique-gold text-[#263238] hover:bg-antique-gold/90 shadow-card',
  burgundy: 'bg-burgundy text-on-dark hover:bg-burgundy/90 shadow-card',
  ghost: 'bg-transparent text-deep-teal hover:bg-deep-teal/5',
}

// Primary controls retain comfortable 48px touch targets.
const sizes: Record<Size, string> = {
  sm: 'min-h-11 px-4 py-2 text-sm',
  md: 'min-h-12 px-6 py-2.5 text-base',
  lg: 'min-h-12 px-8 py-3.5 text-lg',
}

const base =
  'button-interactive inline-flex max-w-full touch-manipulation items-center justify-center gap-2 rounded-full text-center font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt disabled:pointer-events-none disabled:opacity-50'

type ButtonProps = {
  variant?: Variant
  size?: Size
  className?: string
  href?: string
  target?: string
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  onClick?: React.MouseEventHandler<HTMLButtonElement>
  children: React.ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  href,
  target,
  type = 'button',
  disabled,
  onClick,
  children,
}: ButtonProps) {
  const cls = cn(base, variants[variant], sizes[size], className)

  if (href !== undefined) {
    return (
      <Link prefetch={false} href={href} target={target} rel={target === '_blank' ? 'noopener noreferrer' : undefined} className={cls}>
        {children}
      </Link>
    )
  }

  return (
    <button type={type} disabled={disabled} onClick={onClick} className={cls}>
      {children}
    </button>
  )
}
