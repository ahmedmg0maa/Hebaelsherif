import type { HTMLAttributes, ReactNode } from 'react'

interface PremiumCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  hover?: boolean
}

export default function PremiumCard({
  children,
  hover = false,
  className = '',
  ...props
}: PremiumCardProps) {
  const classes = [
    'rounded-3xl border border-sand bg-ivory/90 shadow-soft backdrop-blur-sm',
    hover ? 'transition-all duration-300 hover:-translate-y-1 hover:shadow-premium' : '',
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