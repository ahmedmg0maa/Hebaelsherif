'use client'

export const dynamic = 'force-dynamic'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { fetchAdminApi } from '@/lib/admin/client'
import { formatArabicDateTime, formatNumber } from '@/lib/utils/formatters'
import { AdminActionButton, AdminPageHeader, AdminPanel, EmptyState, Field, MetricCard, ToneBadge, inputClass } from '@/components/admin/OperationsUI'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'

interface OfferRow {
  id: string
  title_ar: string
  description_ar: string | null
  discount_type: 'percentage' | 'fixed' | 'none'
  discount_value: number
  starts_at: string | null
  ends_at: string | null
  countdown_enabled: boolean
  target_type: string
  public_coupon_code: string | null
  badge_text_ar: string | null
  cta_label_ar: string | null
  cta_href: string | null
  status: 'draft' | 'scheduled' | 'active' | 'expired' | 'archived'
  created_at: string
}

const statusMeta: Record<OfferRow['status'], { label: string; tone: 'success' | 'warning' | 'muted' | 'petrol' | 'danger' }> = {
  draft: { label: 'مسودة', tone: 'muted' },
  scheduled: { label: 'مجدول', tone: 'petrol' },
  active: { label: 'فعال', tone: 'success' },
  expired: { label: 'منتهي', tone: 'warning' },
  archived: { label: 'مؤرشف', tone: 'muted' },
}

const targetLabels: Record<string, string> = {
  all: 'كل المنصة',
  book: 'الكتب',
  course: 'الكورسات',
  workshop: 'الورش',
  session: 'الجلسات',
  bundle: 'الباقات',
}

const emptyForm = {
  title_ar: '',
  description_ar: '',
  discount_type: 'percentage',
  discount_value: '10',
  target_type: 'all',
  public_coupon_code: '',
  badge_text_ar: '',
  cta_label_ar: '',
  cta_href: '',
  starts_at: '',
  ends_at: '',
  countdown_enabled: true,
}

export default function AdminOffersPage() {
  const { sessionUser } = useAuth()
  const [offers, setOffers] = useState<OfferRow[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function load() {
    if (!sessionUser) return
    setLoading(true)
    setError('')
    try {
      const data = await fetchAdminApi<{ items: OfferRow[] }>(sessionUser, '/api/admin/v7/offers')
      setOffers(data.items || [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل العروض.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (sessionUser) load()
  }, [sessionUser])

  async function createOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setError('')
    try {
      await fetchAdminApi(sessionUser, '/api/admin/v7/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title_ar: form.title_ar,
          description_ar: form.description_ar || null,
          discount_type: form.discount_type,
          discount_value: Number(form.discount_value || 0),
          target_type: form.target_type,
          public_coupon_code: form.public_coupon_code || null,
          badge_text_ar: form.badge_text_ar || null,
          cta_label_ar: form.cta_label_ar || null,
          cta_href: form.cta_href || null,
          starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
          ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
          countdown_enabled: form.countdown_enabled,
          status: 'draft',
        }),
      })
      setForm(emptyForm)
      setMessage('تم إنشاء العرض كمسودة. فعليه ليظهر للعملاء.')
      await load()
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'تعذر إنشاء العرض.')
    }
  }

  async function setStatus(offer: OfferRow, status: OfferRow['status']) {
    setSavingId(offer.id)
    setMessage('')
    setError('')
    try {
      await fetchAdminApi(sessionUser, `/api/admin/v7/offers/${offer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      setOffers((current) => current.map((item) => (item.id === offer.id ? { ...item, status } : item)))
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'تعذر تحديث العرض.')
    } finally {
      setSavingId('')
    }
  }

  async function deleteOffer(offer: OfferRow) {
    if (!window.confirm(`حذف العرض "${offer.title_ar}" نهائيًا؟`)) return
    setSavingId(offer.id)
    setError('')
    try {
      await fetchAdminApi(sessionUser, `/api/admin/v7/offers/${offer.id}`, { method: 'DELETE' })
      setOffers((current) => current.filter((item) => item.id !== offer.id))
      setMessage('تم حذف العرض.')
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'تعذر حذف العرض.')
    } finally {
      setSavingId('')
    }
  }

  const stats = useMemo(
    () => ({
      total: offers.length,
      active: offers.filter((offer) => offer.status === 'active').length,
      countdown: offers.filter((offer) => offer.countdown_enabled && offer.status === 'active').length,
    }),
    [offers],
  )

  if (loading) return <PremiumSkeleton className="h-[32rem]" />

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="العروض والحملات"
        description="حملات خصم بمدة محددة وعداد تنازلي. العرض الفعال يظهر تلقائيًا في الموقع وينتهي تلقائيًا بانتهاء وقته."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="إجمالي العروض" value={formatNumber(stats.total)} />
        <MetricCard label="العروض الفعالة" value={formatNumber(stats.active)} />
        <MetricCard label="حملات بعداد تنازلي" value={formatNumber(stats.countdown)} />
      </div>

      <AdminPanel title="عرض جديد" description="اربطي العرض بكوبون معلن إن أردتِ خصمًا فعليًا عند الدفع.">
        <form onSubmit={createOffer} className="grid gap-4 md:grid-cols-3">
          <Field label="عنوان العرض">
            <input className={inputClass} value={form.title_ar} onChange={(event) => setForm({ ...form, title_ar: event.target.value })} required />
          </Field>
          <Field label="نوع الخصم">
            <select className={inputClass} value={form.discount_type} onChange={(event) => setForm({ ...form, discount_type: event.target.value })}>
              <option value="percentage">نسبة %</option>
              <option value="fixed">مبلغ ثابت</option>
              <option value="none">إعلان بدون خصم</option>
            </select>
          </Field>
          <Field label="قيمة الخصم">
            <input className={inputClass} type="number" min="0" value={form.discount_value} onChange={(event) => setForm({ ...form, discount_value: event.target.value })} />
          </Field>
          <Field label="يستهدف">
            <select className={inputClass} value={form.target_type} onChange={(event) => setForm({ ...form, target_type: event.target.value })}>
              <option value="all">كل المنصة</option>
              <option value="session">الجلسات</option>
              <option value="book">الكتب</option>
              <option value="course">الكورسات</option>
              <option value="workshop">الورش</option>
              <option value="bundle">الباقات</option>
            </select>
          </Field>
          <Field label="كود كوبون معلن (اختياري)">
            <input className={inputClass} value={form.public_coupon_code} onChange={(event) => setForm({ ...form, public_coupon_code: event.target.value })} placeholder="RAMADAN20" />
          </Field>
          <Field label="نص الشارة (اختياري)">
            <input className={inputClass} value={form.badge_text_ar} onChange={(event) => setForm({ ...form, badge_text_ar: event.target.value })} placeholder="خصم محدود" />
          </Field>
          <Field label="يبدأ في">
            <input className={inputClass} type="datetime-local" value={form.starts_at} onChange={(event) => setForm({ ...form, starts_at: event.target.value })} />
          </Field>
          <Field label="ينتهي في">
            <input className={inputClass} type="datetime-local" value={form.ends_at} onChange={(event) => setForm({ ...form, ends_at: event.target.value })} />
          </Field>
          <Field label="عداد تنازلي">
            <select className={inputClass} value={form.countdown_enabled ? 'yes' : 'no'} onChange={(event) => setForm({ ...form, countdown_enabled: event.target.value === 'yes' })}>
              <option value="yes">مفعل</option>
              <option value="no">بدون عداد</option>
            </select>
          </Field>
          <Field label="نص الزر (اختياري)">
            <input className={inputClass} value={form.cta_label_ar} onChange={(event) => setForm({ ...form, cta_label_ar: event.target.value })} placeholder="احجزي الآن" />
          </Field>
          <Field label="رابط الزر (اختياري)">
            <input className={inputClass} value={form.cta_href} onChange={(event) => setForm({ ...form, cta_href: event.target.value })} placeholder="/booking" />
          </Field>
          <Field label="وصف مختصر (اختياري)">
            <input className={inputClass} value={form.description_ar} onChange={(event) => setForm({ ...form, description_ar: event.target.value })} />
          </Field>
          <div className="flex items-end md:col-span-3">
            <AdminActionButton type="submit">إنشاء العرض</AdminActionButton>
          </div>
        </form>
        {message ? <p className="mt-4 text-sm font-black text-petrol">{message}</p> : null}
        {error ? <p className="mt-4 text-sm font-black text-burgundy">{error}</p> : null}
      </AdminPanel>

      <AdminPanel title="كل العروض" description="التفعيل يعرض الحملة فورًا في الموقع؛ الأرشفة تخفيها.">
        {offers.length === 0 ? (
          <EmptyState title="لا توجد عروض" description="أنشئي أول حملة من النموذج أعلاه." />
        ) : (
          <div className="grid gap-4">
            {offers.map((offer) => (
              <div key={offer.id} className="rounded-[1.75rem] border border-sand bg-cream/60 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-black text-charcoal">{offer.title_ar}</h3>
                      <ToneBadge tone={statusMeta[offer.status].tone}>{statusMeta[offer.status].label}</ToneBadge>
                      {offer.countdown_enabled ? <ToneBadge tone="gold">عداد تنازلي</ToneBadge> : null}
                    </div>
                    <p className="mt-2 text-xs font-bold text-warm-gray">
                      {targetLabels[offer.target_type] || offer.target_type}
                      {offer.discount_type !== 'none' ? (
                        <span className="latin-numerals"> • خصم {offer.discount_type === 'percentage' ? `${offer.discount_value}%` : `${offer.discount_value} ج.م`}</span>
                      ) : null}
                      {offer.public_coupon_code ? <span className="latin-numerals"> • كود: {offer.public_coupon_code}</span> : null}
                    </p>
                    <p className="mt-1 text-xs font-bold text-warm-gray">
                      {offer.starts_at ? `من ${formatArabicDateTime(offer.starts_at)}` : 'يبدأ فورًا'}
                      {offer.ends_at ? ` — حتى ${formatArabicDateTime(offer.ends_at)}` : ' — بدون نهاية محددة'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {offer.status !== 'active' ? (
                      <AdminActionButton type="button" tone="success" disabled={savingId === offer.id} onClick={() => setStatus(offer, 'active')}>
                        تفعيل
                      </AdminActionButton>
                    ) : (
                      <AdminActionButton type="button" tone="warning" disabled={savingId === offer.id} onClick={() => setStatus(offer, 'expired')}>
                        إنهاء
                      </AdminActionButton>
                    )}
                    <AdminActionButton type="button" tone="muted" disabled={savingId === offer.id} onClick={() => setStatus(offer, 'archived')}>
                      أرشفة
                    </AdminActionButton>
                    <AdminActionButton type="button" tone="danger" disabled={savingId === offer.id} onClick={() => deleteOffer(offer)}>
                      حذف
                    </AdminActionButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminPanel>
    </div>
  )
}
