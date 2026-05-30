'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import { formatNumber } from '@/lib/utils/formatters'
import { toMillis } from '@/lib/admin/operations'
import { AdminPageHeader, AdminPanel, EmptyState, MetricCard, ToneBadge } from '@/components/admin/OperationsUI'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'

interface EventItem {
  id: string
  name?: string
  path?: string
  source?: string
  sessionId?: string
  metadata?: { attribution?: Record<string, string> }
  createdAt?: unknown
}

interface LeadItem {
  id: string
  source?: string
  interest?: string
  status?: string
  email?: string
  createdAt?: unknown
}

function mapDocs<T>(snapshot: Awaited<ReturnType<typeof getDocs>>) {
  return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) })) as T[]
}

export default function AdminCampaignsPage() {
  const [events, setEvents] = useState<EventItem[]>([])
  const [leads, setLeads] = useState<LeadItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const [eventsSnap, leadsSnap, newsletterSnap] = await Promise.all([
          getDocs(collection(db, 'analytics_events')),
          getDocs(collection(db, 'leads')),
          getDocs(collection(db, 'newsletter_subscribers')),
        ])
        setEvents(mapDocs<EventItem>(eventsSnap).sort((a, b) => toMillis(b.createdAt as never) - toMillis(a.createdAt as never)))
        setLeads([...mapDocs<LeadItem>(leadsSnap), ...mapDocs<LeadItem>(newsletterSnap)])
      } catch (loadError) {
        console.error('Campaigns load error:', loadError)
        setError('تعذر تحميل بيانات الحملات.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const stats = useMemo(() => {
    const byName = new Map<string, number>()
    events.forEach((event) => byName.set(event.name || 'unknown', (byName.get(event.name || 'unknown') || 0) + 1))
    const topEvents = Array.from(byName.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8)
    const sources = new Map<string, number>()
    leads.forEach((lead) => sources.set(lead.source || 'غير محدد', (sources.get(lead.source || 'غير محدد') || 0) + 1))
    const topSources = Array.from(sources.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6)
    return { totalEvents: events.length, totalLeads: leads.length, topEvents, topSources, waitlist: leads.filter((lead) => lead.interest || lead.source?.includes('waitlist')).length }
  }, [events, leads])

  if (loading) return <PremiumSkeleton className="h-[32rem]" />

  return (
    <div className="space-y-8">
      <AdminPageHeader title="الحملات والقياس" description="قراءة صادقة للأحداث وقوائم الانتظار ومصادر الاهتمام بدون أرقام وهمية أو نسب غير محسوبة." />
      {error ? <div className="rounded-2xl border border-burgundy/25 bg-burgundy/10 p-4 text-sm font-black text-burgundy dark:text-ivory">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="الأحداث المسجلة" value={formatNumber(stats.totalEvents)} tone="petrol" />
        <MetricCard label="Leads / Waitlist" value={formatNumber(stats.totalLeads)} tone="gold" />
        <MetricCard label="اهتمامات محددة" value={formatNumber(stats.waitlist)} tone="success" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminPanel title="أهم الأحداث" description="الأحداث تأتي من طبقة القياس داخل الموقع.">
          {stats.topEvents.length === 0 ? <EmptyState title="لا توجد أحداث بعد" description="عند زيارة الموقع أو استخدام CTAs ستبدأ الأحداث في الظهور هنا." /> : (
            <div className="space-y-3">
              {stats.topEvents.map(([name, count]) => (
                <div key={name} className="flex items-center justify-between rounded-2xl border border-sand bg-cream/70 p-4 dark:border-gold/25 dark:bg-white/10">
                  <span className="text-sm font-black text-charcoal dark:text-ivory">{name}</span>
                  <ToneBadge tone="petrol">{formatNumber(count)}</ToneBadge>
                </div>
              ))}
            </div>
          )}
        </AdminPanel>

        <AdminPanel title="مصادر الاهتمام" description="تساعد في معرفة أين تأتي الرسائل وقوائم الانتظار.">
          {stats.topSources.length === 0 ? <EmptyState title="لا توجد مصادر بعد" description="عند وصول Leads ستظهر مصادرها هنا." /> : (
            <div className="space-y-3">
              {stats.topSources.map(([source, count]) => (
                <div key={source} className="flex items-center justify-between rounded-2xl border border-sand bg-cream/70 p-4 dark:border-gold/25 dark:bg-white/10">
                  <span className="text-sm font-black text-charcoal dark:text-ivory">{source}</span>
                  <ToneBadge tone="gold">{formatNumber(count)}</ToneBadge>
                </div>
              ))}
            </div>
          )}
        </AdminPanel>
      </div>

      <AdminPanel title="آخر أحداث التحويل" description="قائمة تشغيلية مختصرة تساعد في قراءة السلوك بدون أدوات خارجية.">
        {events.length === 0 ? <EmptyState title="لا توجد أحداث" description="طبقة الأحداث جاهزة، وستظهر البيانات بعد أول استخدام حقيقي للموقع." /> : (
          <div className="space-y-3">
            {events.slice(0, 12).map((event) => (
              <div key={event.id} className="rounded-2xl border border-sand bg-cream/70 p-4 text-sm font-bold text-warm-gray dark:border-gold/25 dark:bg-white/10 dark:text-cream">
                <span className="font-black text-charcoal dark:text-ivory">{event.name}</span>
                <span> · {event.path || 'غير محدد'} · {event.source || 'web'}</span>
              </div>
            ))}
          </div>
        )}
      </AdminPanel>
    </div>
  )
}
