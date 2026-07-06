import type { HTMLAttributes, ReactNode } from 'react'

interface PremiumCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  hover?: boolean
  variant?: 'glass' | 'paper' | 'teal' | 'plain'
}

const variants = {
  glass: 'glass-panel',
  paper: 'brand-rich-card paper-texture',
  teal: 'border border-petrol/20 bg-petrol text-ivory shadow-botanical',
  plain: 'rounded-[2rem] border border-sand bg-ivory/90 shadow-soft backdrop-blur-sm',
}

export default function PremiumCard({
  children,
  hover = false,
  variant = 'glass',
  className = '',
  ...props
}: PremiumCardProps) {
  const classes = [
    'rounded-[2rem]',
    variants[variant],
    hover ? 'interactive-lift' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  )
}
