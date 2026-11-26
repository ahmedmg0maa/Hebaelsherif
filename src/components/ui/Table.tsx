import { cn } from '@/lib/cn'

export function Table({ className, children, caption = 'سجلات البيانات' }: { className?: string; children: React.ReactNode; caption?: string }) {
  return (
    <div role="region" aria-label="جدول البيانات؛ يمكن تمريره أفقيًا" tabIndex={0} className={cn('overflow-x-auto overscroll-x-contain rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cobalt border border-line bg-surface-raised shadow-card', className)}>
      <table className="w-full min-w-max text-start text-sm"><caption className="sr-only">{caption}</caption>{children}</table>
    </div>
  )
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="border-b border-line bg-ivory/70 text-sm font-semibold text-text-soft">
      {children}
    </thead>
  )
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-line/70">{children}</tbody>
}

export function TR({ className, children }: { className?: string; children: React.ReactNode }) {
  return <tr className={cn('transition-colors hover:bg-ivory/50', className)}>{children}</tr>
}

export function TH({ className, children }: { className?: string; children: React.ReactNode }) {
  return <th scope="col" className={cn('px-5 py-3.5 text-start font-semibold', className)}>{children}</th>
}

export function TD({ className, children }: { className?: string; children: React.ReactNode }) {
  return <td className={cn('tnum px-5 py-4 align-middle text-ink', className)}>{children}</td>
}
