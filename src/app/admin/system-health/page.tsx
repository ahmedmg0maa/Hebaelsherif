'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { AdminPageHeader, AdminPanel, EmptyState, MetricCard, ToneBadge } from '@/components/admin/OperationsUI'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'

interface HealthPayload {
  health?: { label: string; description: string; tone: 'success' | 'warning' | 'danger' | 'muted' }
  alerts?: Array<{ title: string; description: string; href: string; tone: 'success' | 'warning' | 'danger' | 'gold' | 'petrol' | 'muted' }>
  checks?: Array<{ key: string; label: string; passed: boolean; hint: string }>
}

export default function AdminSystemHealthPage() {
  const { firebaseUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [payload, setPayload] = useState<HealthPayload>({})
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      if (!firebaseUser) return
      setLoading(true)
      setError('')
      try {
        const token = await firebaseUser.getIdToken()
        const response = await fetch('/api/admin/system-health', { headers: { Authorization: `Bearer ${token}` } })
        const data = (await response.json()) as HealthPayload & { error?: string }
        if (!response.ok) {
          setError(data.error || 'تعذر تحميل صحة النظام.')
          return
        }
        setPayload(data)
      } catch (loadError) {
        console.error('System health load error:', loadError)
        setError('تعذر تحميل صحة النظام.')
      } finally {
        setLoading(false)
      }
    }
    load().catch(() => setLoading(false))
  }, [firebaseUser])

  if (loading) return <PremiumSkeleton className="h-[32rem]" />

  const checks = payload.checks || []
  const alerts = payload.alerts || []
  const passed = checks.filter((check) => check.passed).length
  const score = checks.length ? Math.round((passed / checks.length) * 100) : 100

  return (
    <div className="space-y-8">
      <AdminPageHeader title="صحة النظام" description="فحص تشغيلي مباشر للبيئة، الحماية، روابط المحتوى، الدفع، والتنبيهات التي قد تؤثر على جودة التشغيل." />
      {error ? <div className="rounded-2xl border border-burgundy/25 bg-burgundy/10 p-4 text-sm font-black text-burgundy dark:text-ivory">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="مؤشر الصحة" value={payload.health?.label || 'مستقرة'} hint={payload.health?.description} tone={payload.health?.tone || 'success'} />
        <MetricCard label="نسبة الفحوصات" value={`${score}%`} hint={`${passed} من ${checks.length} فحص سليم`} tone={score >= 90 ? 'success' : score >= 70 ? 'warning' : 'danger'} />
        <MetricCard label="تنبيهات التشغيل" value={alerts.length} hint="تنبيهات يجب مراجعتها قبل الحملات أو التشغيل الكثيف" tone={alerts.length ? 'warning' : 'success'} />
      </div>

      <AdminPanel title="فحوصات الإنتاج" description="لا تعتمد على الشكل فقط؛ هذه الفحوصات تمنع أكثر أخطاء التشغيل شيوعًا.">
        <div className="grid gap-4 md:grid-cols-2">
          {checks.map((check) => (
            <article key={check.key} className="rounded-[1.5rem] border border-sand bg-cream/80 p-5 dark:border-gold/25 dark:bg-white/10">
              <ToneBadge tone={check.passed ? 'success' : 'danger'}>{check.passed ? 'سليم' : 'يحتاج مراجعة'}</ToneBadge>
              <h3 className="mt-3 text-lg font-black text-charcoal dark:text-ivory">{check.label}</h3>
              <p className="mt-2 text-sm font-bold leading-7 text-warm-gray dark:text-cream">{check.hint}</p>
            </article>
          ))}
        </div>
      </AdminPanel>

      <AdminPanel title="تنبيهات التشغيل" description="قائمة بالمشاكل التي قد تحتاج إجراء داخل الأدمن.">
        {alerts.length === 0 ? (
          <EmptyState title="لا توجد تنبيهات حرجة" description="النظام لا يعرض حاليًا تنبيهات تشغيل تحتاج إجراء فوري." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {alerts.map((alert) => (
              <article key={`${alert.title}-${alert.href}`} className="rounded-[1.5rem] border border-sand bg-cream/80 p-5 dark:border-gold/25 dark:bg-white/10">
                <ToneBadge tone={alert.tone === 'gold' ? 'gold' : alert.tone}>{alert.tone === 'danger' ? 'حرج' : 'متابعة'}</ToneBadge>
                <h3 className="mt-3 text-lg font-black text-charcoal dark:text-ivory">{alert.title}</h3>
                <p className="mt-2 text-sm font-bold leading-7 text-warm-gray dark:text-cream">{alert.description}</p>
              </article>
            ))}
          </div>
        )}
      </AdminPanel>
    </div>
  )
}
