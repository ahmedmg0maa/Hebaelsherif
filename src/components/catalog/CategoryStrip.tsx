import Link from 'next/link'

export type CategoryItem = {
  href: string
  label: string
  count: number
  icon: React.ReactNode
}

export function CategoryStrip({ items }: { items: CategoryItem[] }) {
  return (
    <div className="border-b border-line bg-ivory">
      <ul className="mx-auto flex max-w-5xl flex-wrap justify-center gap-3 px-6 py-6">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="group flex items-center gap-3 rounded-full border border-line bg-surface-raised px-5 py-2.5 text-sm font-semibold text-deep-teal shadow-card transition-all hover:-translate-y-0.5 hover:border-antique-gold hover:shadow-card-hover"
            >
              <span className="text-antique-gold" aria-hidden>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
                  {item.icon}
                </svg>
              </span>
              {item.label}
              <span className="tnum rounded-full bg-deep-teal/8 px-2 py-0.5 text-xs text-deep-teal">
                {item.count.toLocaleString('ar-EG')}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
