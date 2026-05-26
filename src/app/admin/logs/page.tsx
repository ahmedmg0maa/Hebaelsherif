'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import type { AdminLog } from '@/types'
import { formatArabicDateTime, formatNumber } from '@/lib/utils/formatters'
import { toMillis } from '@/lib/admin/operations'
import { AdminPageHeader, AdminPanel, EmptyState, Field, inputClass, MetricCard, ToneBadge } from '@/components/admin/OperationsUI'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'

interface AdminLogItem extends AdminLog {
  message?: string
  adminEmail?: string
}

function mapLogs(snapshot: Awaited<ReturnType<typeof getDocs>>) {
  return snapshot.docs.map((docItem) => ({ id: docItem.id, ...(docItem.data() as Record<string, unknown>) })) as AdminLogItem[]
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<AdminLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const snap = await getDocs(collection(db, 'admin_logs'))
        setLogs(mapLogs(snap).sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt)).slice(0, 250))
      } catch (loadError) {
        console.error('Logs load error:', loadError)
        setError('تعذر تحميل سجل الإجراءات.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const actionTypes = useMemo(() => Array.from(new Set(logs.map((log) => log.action).filter(Boolean))).sort(), [logs])
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return logs.filter((log) => {
      const matchesFilter = filter === 'all' || log.action === filter || log.targetType === filter
      const haystack = [log.action, log.targetType, log.targetId, log.adminEmail, log.adminId, log.message].filter(Boolean).join(' ').toLowerCase()
      return matchesFilter && (!q || haystack.includes(q))
    })
  }, [filter, logs, search])

  const stats = useMemo(() => ({
    total: logs.length,
    orders: logs.filter((log) => log.targetType === 'orders').length,
    bookings: logs.filter((log) => log.targetType === 'bookings').length,
    content: logs.filter((log) => log.targetType === 'protected_content').length,
    settings: logs.filter((log) => log.action === 'settings_updated').length,
  }), [logs])

  if (loading) return <PremiumSkeleton className="h-[28rem]" />

  return (
    <div className="space-y-8">
      <AdminPageHeader title="سجل إجراءات الأدمن" description="كل إجراء حساس يجب أن يترك أثرًا واضحًا: من فعل ماذا، على أي كيان، ومتى." />
      {error ? <div className="rounded-2xl border border-burgundy/25 bg-burgundy/10 p-4 text-sm font-black text-burgundy dark:text-ivory">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-5">
        <MetricCard label="كل السجلات" value={formatNumber(stats.total)} tone="muted" />
        <MetricCard label="طلبات" value={formatNumber(stats.orders)} tone="petrol" />
        <MetricCard label="حجوزات" value={formatNumber(stats.bookings)} tone="gold" />
        <MetricCard label="محتوى محمي" value={formatNumber(stats.content)} tone="olive" />
        <MetricCard label="إعدادات" value={formatNumber(stats.settings)} tone="warning" />
      </div>

      <AdminPanel title="فلترة السجلات" description="ابحثي عن إجراء أو كيان أو معرف محدد.">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="الإجراء">
            <select className={inputClass} value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option value="all">كل الإجراءات</option>
              <option value="orders">الطلبات</option>
              <option value="bookings">الحجوزات</option>
              <option value="protected_content">المحتوى المحمي</option>
              {actionTypes.map((action) => <option key={action} value={action}>{action}</option>)}
            </select>
          </Field>
          <div className="md:col-span-2">
            <Field label="بحث">
              <input className={inputClass} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="action, target, admin..." />
            </Field>
          </div>
        </div>
      </AdminPanel>

      <AdminPanel title="آخر الإجراءات" description="آخر 250 إجراء محفوظ في admin_logs.">
        {filtered.length === 0 ? <EmptyState title="لا توجد سجلات" description="عند تنفيذ إجراءات داخل الأدمن ستظهر هنا تلقائيًا." /> : (
          <div className="space-y-3">
            {filtered.map((log) => (
              <article key={log.id} className="rounded-[1.5rem] border border-sand bg-cream/80 p-4 dark:border-gold/25 dark:bg-white/10">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black text-charcoal dark:text-ivory">{log.action}</h3>
                      <ToneBadge tone="muted">{log.targetType || 'system'}</ToneBadge>
                    </div>
                    <p className="mt-2 text-sm font-bold text-warm-gray dark:text-cream">{log.message || log.targetId || 'إجراء مسجل'}</p>
                  </div>
                  <p className="text-xs font-bold text-warm-gray dark:text-cream">{formatArabicDateTime(log.createdAt)}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </AdminPanel>
    </div>
  )
}
