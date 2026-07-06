'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useNotifications } from '@/hooks/useNotifications'
import { formatArabicDateTime } from '@/lib/utils/formatters'

export default function NotificationBell({ scope = 'user' }: { scope?: 'user' | 'admin' }) {
  const { items, unreadCount, markRead } = useNotifications(scope)
  const [open, setOpen] = useState(false)
  const latest = useMemo(() => items.slice(0, 6), [items])

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative inline-flex h-11 min-w-11 items-center justify-center rounded-full border border-gold/30 bg-ivory px-3 text-sm font-black text-petrol shadow-soft transition hover:-translate-y-0.5 dark:bg-white/10 dark:text-ivory"
        aria-label="الإشعارات"
      >
        تنبيهات
        {unreadCount > 0 ? <span className="absolute -right-1 -top-1 rounded-full bg-burgundy px-2 py-0.5 text-[10px] text-ivory">{unreadCount}</span> : null}
      </button>

      {open ? (
        <div className="absolute left-0 z-50 mt-3 w-[min(92vw,24rem)] rounded-[1.5rem] border border-sand bg-ivory p-4 shadow-premium dark:border-gold/25 dark:bg-deepTeal">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-black text-charcoal dark:text-ivory">الإشعارات</p>
            <button type="button" onClick={() => setOpen(false)} className="text-xs font-black text-warm-gray dark:text-cream">إغلاق</button>
          </div>
          {latest.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-sand bg-cream/70 p-4 text-center text-xs font-bold leading-6 text-warm-gray dark:border-gold/25 dark:bg-white/10 dark:text-cream">لا توجد إشعارات جديدة.</p>
          ) : (
            <div className="space-y-2">
              {latest.map((item) => (
                <article key={item.id} className={`rounded-2xl border p-3 ${item.read ? 'border-sand bg-cream/60 dark:border-gold/20 dark:bg-white/5' : 'border-gold/35 bg-gold/10'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-charcoal dark:text-ivory">{item.title}</p>
                      <p className="mt-1 text-xs font-bold leading-6 text-warm-gray dark:text-cream">{item.body}</p>
                      <p className="mt-2 text-[11px] font-bold text-gold">{formatArabicDateTime(item.createdAt)}</p>
                    </div>
                    {!item.read ? <button type="button" onClick={() => markRead(item.id)} className="text-[11px] font-black text-petrol dark:text-gold">تم</button> : null}
                  </div>
                  {item.href ? <Link href={item.href} className="mt-3 inline-block text-xs font-black text-petrol dark:text-gold">فتح التفاصيل ←</Link> : null}
                </article>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
