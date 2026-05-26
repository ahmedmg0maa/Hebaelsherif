'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import { addDoc, collection, doc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import type { Review } from '@/types'
import { formatArabicDateTime, formatNumber } from '@/lib/utils/formatters'
import { reviewStatusMeta, toMillis } from '@/lib/admin/operations'
import { AdminActionButton, AdminPageHeader, AdminPanel, EmptyState, Field, inputClass, MetricCard, StatusBadge, ToneBadge } from '@/components/admin/OperationsUI'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'

function mapReviews(snapshot: Awaited<ReturnType<typeof getDocs>>) {
  return snapshot.docs.map((docItem) => ({ id: docItem.id, ...(docItem.data() as Record<string, unknown>) })) as Review[]
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [savingId, setSavingId] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    try {
      const snap = await getDocs(collection(db, 'reviews'))
      setReviews(mapReviews(snap).sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt)))
    } catch (loadError) {
      console.error('Reviews load error:', loadError)
      setError('تعذر تحميل التقييمات.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function updateReview(review: Review, status: 'approved' | 'rejected' | 'hidden', action: string) {
    const text = status === 'approved' ? 'اعتماد هذا التقييم؟' : status === 'rejected' ? 'رفض هذا التقييم؟' : 'إخفاء هذا التقييم؟'
    if (!window.confirm(text)) return
    setSavingId(review.id)
    try {
      const values = { status, isApproved: status === 'approved', updatedAt: serverTimestamp() }
      await updateDoc(doc(db, 'reviews', review.id), values)
      await addDoc(collection(db, 'admin_logs'), {
        action,
        targetType: 'reviews',
        targetId: review.id,
        before: { status: review.status },
        after: values,
        message: `${action} - ${review.userName || review.userId}`,
        createdAt: serverTimestamp(),
      })
      setReviews((current) => current.map((item) => (item.id === review.id ? { ...item, status } : item)))
      setMessage('تم تحديث التقييم.')
    } catch (updateError) {
      console.error('Review update error:', updateError)
      setError('تعذر تحديث التقييم.')
    } finally {
      setSavingId('')
    }
  }

  const filtered = useMemo(() => reviews.filter((review) => filter === 'all' || review.status === filter), [filter, reviews])
  const stats = useMemo(() => ({
    total: reviews.length,
    pending: reviews.filter((review) => review.status === 'pending').length,
    approved: reviews.filter((review) => review.status === 'approved' || review.status === 'published').length,
    hidden: reviews.filter((review) => review.status === 'hidden').length,
    rejected: reviews.filter((review) => review.status === 'rejected').length,
  }), [reviews])

  if (loading) return <PremiumSkeleton className="h-[28rem]" />

  return (
    <div className="space-y-8">
      <AdminPageHeader title="مراجعة التقييمات" description="اعتماد التقييمات الحقيقية فقط، مع منع الادعاءات العلاجية أو البيانات الشخصية قبل ظهورها للعامة." />
      {message ? <div className="rounded-2xl border border-olive/25 bg-olive/10 p-4 text-sm font-black text-olive dark:text-ivory">{message}</div> : null}
      {error ? <div className="rounded-2xl border border-burgundy/25 bg-burgundy/10 p-4 text-sm font-black text-burgundy dark:text-ivory">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-5">
        <MetricCard label="كل التقييمات" value={formatNumber(stats.total)} tone="muted" />
        <MetricCard label="بانتظار الاعتماد" value={formatNumber(stats.pending)} tone="warning" />
        <MetricCard label="معتمدة" value={formatNumber(stats.approved)} tone="success" />
        <MetricCard label="مخفية" value={formatNumber(stats.hidden)} tone="muted" />
        <MetricCard label="مرفوضة" value={formatNumber(stats.rejected)} tone="danger" />
      </div>

      <AdminPanel title="فلترة التقييمات" description="كل تقييم يظهر للعامة فقط بعد الاعتماد.">
        <Field label="الحالة">
          <select className={inputClass} value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">كل الحالات</option>
            <option value="pending">بانتظار الاعتماد</option>
            <option value="approved">معتمدة</option>
            <option value="published">منشورة</option>
            <option value="hidden">مخفية</option>
            <option value="rejected">مرفوضة</option>
          </select>
        </Field>
      </AdminPanel>

      <AdminPanel title="قائمة التقييمات" description="راجعي النص قبل الاعتماد؛ لا نستخدم تقييمات وهمية ولا نعرض معلومات حساسة.">
        {filtered.length === 0 ? <EmptyState title="لا توجد تقييمات" description="عند إرسال تقييم حقيقي سيظهر هنا للمراجعة والاعتماد." /> : (
          <div className="grid gap-4 xl:grid-cols-2">
            {filtered.map((review) => (
              <article key={review.id} className="rounded-[1.75rem] border border-sand bg-cream/80 p-5 shadow-soft dark:border-gold/25 dark:bg-white/10">
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <h3 className="text-lg font-black text-charcoal dark:text-ivory">{review.userName || 'عميلة'}</h3>
                  <StatusBadge meta={reviewStatusMeta[String(review.status)]} fallback={String(review.status)} />
                  <ToneBadge tone="gold">{review.rating}/5</ToneBadge>
                </div>
                <p className="text-sm font-bold leading-7 text-warm-gray dark:text-cream">{review.content}</p>
                <p className="mt-3 text-xs font-bold text-warm-gray dark:text-cream">{review.productType} · {review.productId} · {formatArabicDateTime(review.createdAt)}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <AdminActionButton disabled={savingId === review.id} tone="success" onClick={() => updateReview(review, 'approved', 'review_approved')}>اعتماد</AdminActionButton>
                  <AdminActionButton disabled={savingId === review.id} tone="warning" onClick={() => updateReview(review, 'hidden', 'review_hidden')}>إخفاء</AdminActionButton>
                  <AdminActionButton disabled={savingId === review.id} tone="danger" onClick={() => updateReview(review, 'rejected', 'review_rejected')}>رفض</AdminActionButton>
                </div>
              </article>
            ))}
          </div>
        )}
      </AdminPanel>
    </div>
  )
}
