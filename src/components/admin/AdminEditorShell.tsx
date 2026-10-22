import { cn } from '@/lib/cn'

export function AdminEditorShell({ title, description, status, children, actions, className }: {
  title: string
  description?: string
  status?: React.ReactNode
  children: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn('overflow-hidden rounded-3xl border border-line bg-surface-raised shadow-card', className)}>
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line bg-ivory/45 px-5 py-5 sm:px-7">
        <div><div className="flex items-center gap-3"><h2 className="text-xl font-bold text-deep-teal">{title}</h2>{status}</div>{description && <p className="mt-1 max-w-2xl text-sm text-text-soft">{description}</p>}</div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
      <div className="p-5 sm:p-7">{children}</div>
    </section>
  )
}
