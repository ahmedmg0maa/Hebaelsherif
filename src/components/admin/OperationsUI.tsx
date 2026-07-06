import Link from 'next/link'
import type { ReactNode } from 'react'
import type { AdminTone, StatusMeta } from '@/lib/admin/operations'

const toneClasses: Record<AdminTone, string> = {
  petrol: 'border-petrol/25 bg-petrol/10 text-petrol dark:border-petrol/40 dark:bg-petrol/20 dark:text-ivory',
  gold: 'border-gold/35 bg-gold/10 text-deepTeal dark:border-gold/45 dark:bg-gold/15 dark:text-gold',
  olive: 'border-olive/25 bg-olive/10 text-olive dark:border-olive/45 dark:bg-olive/20 dark:text-ivory',
  burgundy: 'border-burgundy/25 bg-burgundy/10 text-burgundy dark:border-burgundy/45 dark:bg-burgundy/20 dark:text-ivory',
  muted: 'border-sand bg-cream text-warm-gray dark:border-gold/25 dark:bg-white/10 dark:text-cream',
  success: 'border-olive/25 bg-olive/10 text-olive dark:border-olive/45 dark:bg-olive/20 dark:text-ivory',
  warning: 'border-gold/35 bg-gold/10 text-deepTeal dark:border-gold/45 dark:bg-gold/15 dark:text-gold',
  danger: 'border-burgundy/25 bg-burgundy/10 text-burgundy dark:border-burgundy/45 dark:bg-burgundy/20 dark:text-ivory',
}

export function AdminPageHeader({
  eyebrow = 'Heba Operations Center',
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description: string
  actions?: ReactNode
}) {
  return (
    <section className="admin-hero relative overflow-hidden rounded-[2rem] border p-6 shadow-botanical md:p-8">
      <div className="absolute -left-20 -top-20 h-56 w-56 rounded-full bg-gold/15 blur-3xl" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-gold">{eyebrow}</p>
          <h2 className="mt-3 text-3xl font-black leading-tight text-ivory md:text-4xl">{title}</h2>
          <p className="mt-3 text-sm font-bold leading-7 text-cream md:text-base">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
    </section>
  )
}

export function AdminPanel({
  title,
  description,
  children,
  action,
}: {
  title: string
  description?: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <section className="admin-card rounded-[2rem] border p-5 shadow-soft md:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-xl font-black text-charcoal dark:text-ivory">{title}</h3>
          {description ? <p className="mt-2 text-sm font-bold leading-6 text-warm-gray dark:text-cream">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function MetricCard({
  label,
  value,
  hint,
  tone = 'petrol',
}: {
  label: string
  value: string | number
  hint?: string
  tone?: AdminTone
}) {
  return (
    <div className={`rounded-[1.5rem] border p-5 shadow-soft ${toneClasses[tone]}`}>
      <p className="text-xs font-black opacity-90">{label}</p>
      <p className="mt-3 text-3xl font-black">{value}</p>
      {hint ? <p className="mt-2 text-xs font-bold leading-5 opacity-85">{hint}</p> : null}
    </div>
  )
}

export function StatusBadge({ meta, fallback }: { meta?: StatusMeta; fallback?: string }) {
  const resolved = meta || { label: fallback || 'غير محدد', description: '', tone: 'muted' as AdminTone }
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-black ${toneClasses[resolved.tone]}`} title={resolved.description}>
      {resolved.label}
    </span>
  )
}

export function ToneBadge({ children, tone = 'muted' }: { children: ReactNode; tone?: AdminTone }) {
  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-black ${toneClasses[tone]}`}>{children}</span>
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-gold/40 bg-cream/70 p-6 text-center dark:bg-white/10">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-gold/35 bg-gold/10 text-xl text-gold">◇</div>
      <h4 className="mt-4 text-lg font-black text-charcoal dark:text-ivory">{title}</h4>
      <p className="mx-auto mt-2 max-w-xl text-sm font-bold leading-7 text-warm-gray dark:text-cream">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  )
}

export function ActionLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center justify-center rounded-full border border-gold/35 bg-gold px-4 py-2 text-xs font-black text-deepTeal shadow-soft transition hover:-translate-y-0.5">
      {children}
    </Link>
  )
}

export function AdminActionButton({
  children,
  onClick,
  disabled,
  tone = 'petrol',
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  tone?: AdminTone
  type?: 'button' | 'submit'
}) {
  const solid: Record<AdminTone, string> = {
    petrol: 'bg-petrol text-ivory hover:bg-deepTeal',
    gold: 'bg-gold text-deepTeal hover:bg-gold/85',
    olive: 'bg-olive text-ivory hover:bg-olive/90',
    burgundy: 'bg-burgundy text-ivory hover:bg-burgundy/90',
    muted: 'bg-cream text-deepTeal hover:bg-sand',
    success: 'bg-olive text-ivory hover:bg-olive/90',
    warning: 'bg-gold text-deepTeal hover:bg-gold/85',
    danger: 'bg-burgundy text-ivory hover:bg-burgundy/90',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full px-4 py-2 text-xs font-black shadow-soft transition disabled:cursor-not-allowed disabled:opacity-60 ${solid[tone]}`}
    >
      {children}
    </button>
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black text-petrol dark:text-gold">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] font-bold text-warm-gray dark:text-cream">{hint}</span> : null}
    </label>
  )
}

export const inputClass = 'premium-input w-full rounded-2xl border border-sand bg-ivory px-4 py-3 text-sm font-bold text-charcoal outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20 dark:border-gold/35 dark:bg-deepTeal dark:text-ivory'

export function ProgressBar({ value }: { value: number }) {
  const safeValue = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div className="h-2 overflow-hidden rounded-full bg-sand/80 dark:bg-white/12">
      <div className="h-full rounded-full bg-gold" style={{ width: `${safeValue}%` }} />
    </div>
  )
}
