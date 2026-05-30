'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ADMIN_NAV_LINKS } from '@/constants/design'

const quickActions = [
  { href: '/admin/orders', label: 'مراجعة الطلبات', keywords: 'payment orders دفع طلبات' },
  { href: '/admin/bookings', label: 'مراجعة الحجوزات', keywords: 'booking sessions جلسات حجوزات' },
  { href: '/admin/content', label: 'المحتوى المحمي', keywords: 'protected content روابط حماية' },
  { href: '/admin/tasks', label: 'المهام والمتابعة', keywords: 'tasks follow up مهام متابعة' },
  { href: '/admin/system-health', label: 'صحة النظام', keywords: 'health system alerts صحة النظام' },
]

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((current) => !current)
      }
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const items = useMemo(() => [...ADMIN_NAV_LINKS, ...quickActions], [])
  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase()
    return items.filter((item) => !value || `${item.label} ${'keywords' in item ? item.keywords : ''}`.toLowerCase().includes(value)).slice(0, 10)
  }, [items, query])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden rounded-full border border-sand bg-ivory px-4 py-2 text-xs font-black text-warm-gray shadow-soft transition hover:text-petrol dark:border-gold/25 dark:bg-white/10 dark:text-cream md:inline-flex"
      >
        Ctrl K
      </button>
      {open ? (
        <div className="fixed inset-0 z-[80] bg-deepTeal/55 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="mx-auto mt-20 max-w-2xl rounded-[2rem] border border-gold/25 bg-ivory p-4 shadow-premium dark:bg-deepTeal" onClick={(event) => event.stopPropagation()}>
            <input
              autoFocus
              className="w-full rounded-2xl border border-sand bg-cream px-5 py-4 text-sm font-black text-charcoal outline-none focus:border-gold dark:border-gold/25 dark:bg-white/10 dark:text-ivory"
              placeholder="ابحثي عن صفحة أو إجراء..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <div className="mt-4 space-y-2">
              {filtered.map((item) => (
                <Link
                  key={`${item.href}-${item.label}`}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between rounded-2xl border border-sand bg-cream/70 px-4 py-3 text-sm font-black text-charcoal transition hover:border-gold hover:bg-gold/10 dark:border-gold/20 dark:bg-white/10 dark:text-ivory"
                >
                  <span>{item.label}</span>
                  <span className="text-xs text-gold">فتح</span>
                </Link>
              ))}
              {filtered.length === 0 ? <p className="p-4 text-center text-sm font-bold text-warm-gray dark:text-cream">لا توجد نتائج.</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
