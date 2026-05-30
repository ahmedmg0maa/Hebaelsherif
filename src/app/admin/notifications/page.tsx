'use client'

export const dynamic = 'force-dynamic'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { formatArabicDateTime } from '@/lib/utils/formatters'
import type { NotificationItem } from '@/types'
import { AdminActionButton, AdminPageHeader, AdminPanel, EmptyState, MetricCard, ToneBadge } from '@/components/admin/OperationsUI'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'

export default function AdminNotificationsPage() {
  const { firebaseUser } = useAuth()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadNotifications = useCallback(async () => {
    if (!firebaseUser) return
    setLoading(true)
    setError('')
    try {
      const token = await firebaseUser.getIdToken()
      const response = await fetch('/api/admin/notifications', { headers: { Authorization: `Bearer ${token}` } })
      const data = (await response.json()) as { success?: boolean; notifications?: NotificationItem[]; error?: string }
      if (!response.ok || !data.success) {
        setError(data.error || 'تعذر تحميل الإشعارات.')
        return
      }
      setNotifications(data.notifications || [])
    } catch (loadError) {
      console.error('Notifications load error:', loadError)
      setError('تعذر تحميل الإشعارات الآن.')
    } finally {
      setLoading(false)
    }
  }, [firebaseUser])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  async function markRead(id: string) {
    if (!firebaseUser) return
    const token = await firebaseUser.getIdToken()
    await fetch(`/api/admin/notifications/${id}/read`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } })
    setNotifications((current) => current.map((item) => (item.id === id ? { ...item, read: true } : item)))
  }

  const stats = useMemo(() => ({
    total: notifications.length,
    unread: notifications.filter((item) => !item.read).length,
    high: notifications.filter((item) => item.priority === 'high' && !item.read).length,
  }), [notifications])

  if (loading) return <PremiumSkeleton className="h-[30rem]" />

  return (
    <div className="space-y-8">
      <AdminPageHeader title="مركز الإشعارات" description="إشعارات تشغيلية حقيقية من الطلبات، الحجوزات، إثباتات الدفع، والمحتوى الذي يحتاج متابعة." />
      {error ? <div className="rounded-2xl border border-burgundy/25 bg-burgundy/10 p-4 text-sm font-black text-burgundy dark:text-ivory">{error}</div> : null}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="كل الإشعارات" value={stats.total} tone="muted" />
        <MetricCard label="غير مقروءة" value={stats.unread} tone="warning" />
        <MetricCard label="أولوية عالية" value={stats.high} tone="danger" />
      </div>
      <AdminPanel title="آخر الإشعارات" description="كل إشعار مرتبط بخطوة تشغيلية أو متابعة واضحة.">
        {notifications.length === 0 ? (
          <EmptyState title="لا توجد إشعارات بعد" description="عند وصول طلبات أو حجوزات أو أحداث مهمة ستظهر هنا." />
        ) : (
          <div className="space-y-3">
            {notifications.map((item) => (
              <article key={item.id} className={`rounded-[1.5rem] border p-4 shadow-soft ${item.read ? 'border-sand bg-cream/70 dark:border-gold/20 dark:bg-white/10' : 'border-gold/35 bg-gold/10'}`}>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-black text-charcoal dark:text-ivory">{item.title}</h3>
                      <ToneBadge tone={item.priority === 'high' ? 'danger' : item.read ? 'muted' : 'gold'}>{item.read ? 'مقروء' : 'جديد'}</ToneBadge>
                    </div>
                    <p className="mt-2 text-sm font-bold leading-7 text-warm-gray dark:text-cream">{item.body}</p>
                    <p className="mt-2 text-xs font-bold text-warm-gray dark:text-cream">{formatArabicDateTime(item.createdAt)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.href ? <Link className="rounded-full border border-gold/35 px-4 py-2 text-xs font-black text-petrol dark:text-gold" href={item.href}>فتح</Link> : null}
                    {!item.read ? <AdminActionButton tone="petrol" onClick={() => markRead(item.id)}>تمت القراءة</AdminActionButton> : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </AdminPanel>
    </div>
  )
}
