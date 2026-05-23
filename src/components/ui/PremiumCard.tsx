import type { HTMLAttributes, ReactNode } from 'react'

interface PremiumCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  hover?: boolean
}

export default function PremiumCard({ children, hover = false, className = '', ...props }: PremiumCardProps) {
  const classes = [
    'glass-panel rounded-[2rem]',
    hover ? 'transition-all duration-300 hover:-translate-y-1 hover:shadow-premium' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return <div className={classes} {...props}>{children}</div>
}
