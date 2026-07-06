'use client'

export const dynamic = 'force-dynamic'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { fetchAdminApi } from '@/lib/admin/client'
import { formatArabicDateTime, formatNumber } from '@/lib/utils/formatters'
import { AdminActionButton, AdminPageHeader, AdminPanel, EmptyState, Field, MetricCard, ToneBadge, inputClass } from '@/components/admin/OperationsUI'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'

interface CouponRow {
  id: string
  code: string
  type: 'percentage' | 'fixed'
  value: number
  scope: string
  min_amount: number
  usage_limit: number | null
  per_user_limit: number | null
  usage_count: number
  starts_at: string | null
  expires_at: string | null
  is_active: boolean
  created_at: string
}

const scopeLabels: Record<string, string> = {
  all: 'كل المنتجات',
  sessions: 'الجلسات',
  books: 'الكتب',
  courses: 'الكورسات',
}

const emptyForm = { code: '', type: 'percentage', value: '10', scope: 'all', min_amount: '0', usage_limit: '', expires_at: '' }

export default function AdminCouponsPage() {
  const { sessionUser } = useAuth()
  const [coupons, setCoupons] = useState<CouponRow[]>([])
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
      const data = await fetchAdminApi<{ items: CouponRow[] }>(sessionUser, '/api/admin/v7/coupons')
      setCoupons(data.items || [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'تعذر تحميل الكوبونات.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (sessionUser) load()
  }, [sessionUser])

  async function createCoupon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setError('')
    try {
      await fetchAdminApi(sessionUser, '/api/admin/v7/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: form.code,
          type: form.type,
          value: Number(form.value || 0),
          scope: form.scope,
          min_amount: Number(form.min_amount || 0),
          usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
          expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
          is_active: true,
        }),
      })
      setForm(emptyForm)
      setMessage('تم إنشاء الكوبون.')
      await load()
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'تعذر إنشاء الكوبون.')
    }
  }

  async function toggleCoupon(coupon: CouponRow) {
    setSavingId(coupon.id)
    setMessage('')
    setError('')
    try {
      await fetchAdminApi(sessionUser, `/api/admin/v7/coupons/${coupon.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !coupon.is_active }),
      })
      setCoupons((current) => current.map((item) => (item.id === coupon.id ? { ...item, is_active: !coupon.is_active } : item)))
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'تعذر تحديث الكوبون.')
    } finally {
      setSavingId('')
    }
  }

  async function deleteCoupon(coupon: CouponRow) {
    if (!window.confirm(`حذف الكوبون ${coupon.code} نهائيًا؟`)) return
    setSavingId(coupon.id)
    setError('')
    try {
      await fetchAdminApi(sessionUser, `/api/admin/v7/coupons/${coupon.id}`, { method: 'DELETE' })
      setCoupons((current) => current.filter((item) => item.id !== coupon.id))
      setMessage('تم حذف الكوبون.')
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'تعذر حذف الكوبون.')
    } finally {
      setSavingId('')
    }
  }

  const stats = useMemo(
    () => ({
      total: coupons.length,
      active: coupons.filter((coupon) => coupon.is_active).length,
      used: coupons.reduce((sum, coupon) => sum + Number(coupon.usage_count || 0), 0),
    }),
    [coupons],
  )

  if (loading) return <PremiumSkeleton className="h-[32rem]" />

  return (
    <div className="space-y-8">
      <AdminPageHeader title="الكوبونات" description="إنشاء أكواد الخصم وإدارتها. الكوبونات غير مقروءة للعامة ولا تُقبل بعد انتهاء صلاحيتها." />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="إجمالي الكوبونات" value={formatNumber(stats.total)} />
        <MetricCard label="الكوبونات الفعالة" value={formatNumber(stats.active)} />
        <MetricCard label="مرات الاستخدام" value={formatNumber(stats.used)} />
      </div>

      <AdminPanel title="كوبون جديد" description="الكود يُحفظ بأحرف كبيرة ويُطبق حسب النطاق والحد الأدنى.">
        <form onSubmit={createCoupon} className="grid gap-4 md:grid-cols-3">
          <Field label="الكود">
            <input className={inputClass} value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} placeholder="WELCOME10" required />
          </Field>
          <Field label="النوع">
            <select className={inputClass} value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
              <option value="percentage">نسبة %</option>
              <option value="fixed">مبلغ ثابت</option>
            </select>
          </Field>
          <Field label="القيمة">
            <input className={inputClass} type="number" min="0" value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} required />
          </Field>
          <Field label="النطاق">
            <select className={inputClass} value={form.scope} onChange={(event) => setForm({ ...form, scope: event.target.value })}>
              <option value="all">كل المنتجات</option>
              <option value="sessions">الجلسات</option>
              <option value="books">الكتب</option>
              <option value="courses">الكورسات</option>
            </select>
          </Field>
          <Field label="حد أدنى للمبلغ">
            <input className={inputClass} type="number" min="0" value={form.min_amount} onChange={(event) => setForm({ ...form, min_amount: event.target.value })} />
          </Field>
          <Field label="حد الاستخدام (اختياري)">
            <input className={inputClass} type="number" min="1" value={form.usage_limit} onChange={(event) => setForm({ ...form, usage_limit: event.target.value })} />
          </Field>
          <Field label="تاريخ الانتهاء (اختياري)">
            <input className={inputClass} type="datetime-local" value={form.expires_at} onChange={(event) => setForm({ ...form, expires_at: event.target.value })} />
          </Field>
          <div className="md:col-span-2 flex items-end">
            <AdminActionButton type="submit">إنشاء الكوبون</AdminActionButton>
          </div>
        </form>
        {message ? <p className="mt-4 text-sm font-black text-petrol">{message}</p> : null}
        {error ? <p className="mt-4 text-sm font-black text-burgundy">{error}</p> : null}
      </AdminPanel>

      <AdminPanel title="كل الكوبونات" description="تعطيل الكوبون يوقف قبوله فورًا دون حذف سجله.">
        {coupons.length === 0 ? (
          <EmptyState title="لا توجد كوبونات" description="أنشئي أول كوبون من النموذج أعلاه." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-right text-sm">
              <thead>
                <tr className="border-b border-sand text-xs font-black text-warm-gray">
                  <th className="px-3 py-3">الكود</th>
                  <th className="px-3 py-3">الخصم</th>
                  <th className="px-3 py-3">النطاق</th>
                  <th className="px-3 py-3">الاستخدام</th>
                  <th className="px-3 py-3">الانتهاء</th>
                  <th className="px-3 py-3">الحالة</th>
                  <th className="px-3 py-3">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => (
                  <tr key={coupon.id} className="border-b border-sand/60">
                    <td className="latin-numerals px-3 py-3 font-black text-charcoal">{coupon.code}</td>
                    <td className="latin-numerals px-3 py-3 font-bold text-petrol">
                      {coupon.type === 'percentage' ? `${coupon.value}%` : `${coupon.value} ج.م`}
                    </td>
                    <td className="px-3 py-3 font-bold text-warm-gray">{scopeLabels[coupon.scope] || coupon.scope}</td>
                    <td className="latin-numerals px-3 py-3 font-bold text-warm-gray">
                      {formatNumber(coupon.usage_count)}{coupon.usage_limit ? ` / ${formatNumber(coupon.usage_limit)}` : ''}
                    </td>
                    <td className="px-3 py-3 text-xs font-bold text-warm-gray">
                      {coupon.expires_at ? formatArabicDateTime(coupon.expires_at) : 'بدون انتهاء'}
                    </td>
                    <td className="px-3 py-3">
                      <ToneBadge tone={coupon.is_active ? 'success' : 'muted'}>{coupon.is_active ? 'فعال' : 'موقوف'}</ToneBadge>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <AdminActionButton type="button" tone="muted" disabled={savingId === coupon.id} onClick={() => toggleCoupon(coupon)}>
                          {coupon.is_active ? 'تعطيل' : 'تفعيل'}
                        </AdminActionButton>
                        <AdminActionButton type="button" tone="danger" disabled={savingId === coupon.id} onClick={() => deleteCoupon(coupon)}>
                          حذف
                        </AdminActionButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminPanel>
    </div>
  )
}
