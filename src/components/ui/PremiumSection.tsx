import BrandDivider from '@/components/brand/BrandDivider'
import type { ReactNode } from 'react'

interface PremiumSectionProps {
  eyebrow?: string
  title: string
  description?: string
  children?: ReactNode
  align?: 'start' | 'center'
  className?: string
  showDivider?: boolean
}

export default function PremiumSection({
  eyebrow,
  title,
  description,
  children,
  align = 'start',
  className = '',
  showDivider = false,
}: PremiumSectionProps) {
  return (
    <section className={className}>
      <div className={align === 'center' ? 'mx-auto mb-10 max-w-3xl text-center' : 'mb-10 max-w-3xl'}>
        {eyebrow ? <p className="mini-label mb-3">{eyebrow}</p> : null}
        <h2 className="brand-title text-balance text-3xl font-black leading-tight md:text-5xl">{title}</h2>
        {showDivider ? <BrandDivider className={align === 'center' ? 'mx-auto mt-4' : 'mt-4 justify-start'} /> : null}
        {description ? <p className="mt-5 text-sm leading-8 text-warm-gray md:text-base">{description}</p> : null}
      </div>
      {children}
    </section>
  )
}
