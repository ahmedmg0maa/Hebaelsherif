import type { ReactNode } from 'react'
import PremiumButton from '@/components/ui/PremiumButton'

interface AdminPageShellProps {
  eyebrow: string
  title: string
  description: string
  children?: ReactNode
  actionHref?: string
  actionLabel?: string
}

export default function AdminPageShell({
  eyebrow,
  title,
  description,
  children,
  actionHref,
  actionLabel,
}: AdminPageShellProps) {
  return (
    <div>
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-sm font-black text-gold">{eyebrow}</p>
          <h2 className="text-3xl font-black leading-tight text-charcoal">{title}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-8 text-warm-gray">{description}</p>
        </div>

        {actionHref && actionLabel ? (
          <PremiumButton href={actionHref} variant="outline">
            {actionLabel}
          </PremiumButton>
        ) : null}
      </div>

      {children}
    </div>
  )
}
