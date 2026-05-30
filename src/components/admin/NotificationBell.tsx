'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import type { NotificationItem } from '@/types'

export default function NotificationBell() {
  const { firebaseUser, isAdmin } = useAuth()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!firebaseUser || !isAdmin) return
      try {
        const token = await firebaseUser.getIdToken()
        const response = await fetch('/api/admin/notifications', { headers: { Authorization: `Bearer ${token}` } })
        if (!response.ok) return
        const data = (await response.json()) as { notifications?: NotificationItem[] }
        if (!cancelled) setNotifications(data.notifications || [])
      } catch (error) {
        console.warn('Admin notifications failed:', error)
      }
    }
    load()
    const timer = window.setInterval(load, 60_000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [firebaseUser, isAdmin])

  const unreadCount = useMemo(() => notifications.filter((item) => !item.read).length, [notifications])

  async function markRead(id: string) {
    if (!firebaseUser) return
    setNotifications((current) => current.map((item) => (item.id === id ? { ...item, read: true } : item)))
    try {
      const token = await firebaseUser.getIdToken()
      await fetch(`/api/admin/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch (error) {
      console.warn('Mark notification read failed:', error)
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative inline-flex h-10 items-center justify-center rounded-full border border-gold/30 bg-gold/10 px-4 text-xs font-black text-deepTeal shadow-soft transition hover:-translate-y-0.5 dark:text-ivory"
        aria-label="إشعارات الأدمن"
      >
        الإشعارات
        {unreadCount > 0 ? <span className="mr-2 rounded-full bg-burgundy px-2 py-0.5 text-[10px] text-ivory">{unreadCount}</span> : null}
      </button>

      {open ? (
        <div className="absolute left-0 z-50 mt-3 w-[22rem] max-w-[calc(100vw-2rem)] rounded-[1.5rem] border border-sand bg-ivory p-3 shadow-premium dark:border-gold/25 dark:bg-deepTeal">
          <div className="mb-2 flex items-center justify-between border-b border-sand pb-2 dark:border-gold/20">
            <p className="text-sm font-black text-charcoal dark:text-ivory">مركز الإشعارات</p>
            <Link href="/admin/action-queue" className="text-xs font-black text-gold" onClick={() => setOpen(false)}>
              قائمة المتابعة
            </Link>
          </div>
          {notifications.length === 0 ? (
            <p className="p-4 text-center text-sm font-bold text-warm-gray dark:text-cream">لا توجد إشعارات جديدة.</p>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {notifications.slice(0, 12).map((notification) => (
                <div key={notification.id} className="rounded-2xl border border-sand bg-cream/70 p-3 dark:border-gold/20 dark:bg-white/10">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-charcoal dark:text-ivory">{notification.title}</p>
                      <p className="mt-1 text-xs font-bold leading-5 text-warm-gray dark:text-cream">{notification.body}</p>
                    </div>
                    {!notification.read ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gold" /> : null}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    {notification.href ? (
                      <Link href={notification.href} onClick={() => { setOpen(false); markRead(notification.id) }} className="rounded-full bg-petrol px-3 py-1 text-[11px] font-black text-ivory">
                        فتح
                      </Link>
                    ) : null}
                    {!notification.read ? (
                      <button type="button" onClick={() => markRead(notification.id)} className="rounded-full border border-sand px-3 py-1 text-[11px] font-black text-warm-gray dark:border-gold/25 dark:text-cream">
                        تم الاطلاع
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
