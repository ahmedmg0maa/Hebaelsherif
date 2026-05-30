'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import { useAuth } from '@/hooks/useAuth'
import type { Order } from '@/types'
import { formatArabicDateTime, formatEGP, formatNumber } from '@/lib/utils/formatters'
import { getAmount, getCustomerName, getProductTitle, orderStatusMeta, paymentStatusMeta, toMillis } from '@/lib/admin/operations'
import { AdminActionButton, AdminPageHeader, AdminPanel, EmptyState, Field, inputClass, MetricCard, StatusBadge, ToneBadge } from '@/components/admin/OperationsUI'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'

interface OrderItem extends Order {
  userEmail?: string
  userName?: string
  productTitle?: string
  productSlug?: string
  accessGrantedAt?: unknown
  paidAt?: unknown
  rejectionReason?: string
}

const statusOptions = [
  { value: 'all', label: 'كل الحالات' },
  { value: 'pending', label: 'طلبات جديدة' },
  { value: 'awaiting_payment', label: 'بانتظار الدفع' },
  { value: 'payment_submitted', label: 'إثبات مرسل' },
  { value: 'paid', label: 'مدفوعة' },
  { value: 'access_granted', label: 'محتوى مفتوح' },
  { value: 'rejected', label: 'مرفوضة' },
  { value: 'cancelled', label: 'ملغية' },
]

function mapOrders(snapshot: Awaited<ReturnType<typeof getDocs>>) {
  return snapshot.docs.map((docItem) => ({ id: docItem.id, ...(docItem.data() as Record<string, unknown>) })) as OrderItem[]
}

export default function AdminOrdersPage() {
  const { firebaseUser } = useAuth()
  const [orders, setOrders] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [productFilter, setProductFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function loadOrders() {
    setLoading(true)
    setError('')
    try {
      const snap = await getDocs(collection(db, 'orders'))
      setOrders(mapOrders(snap).sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt)))
    } catch (loadError) {
      console.error('Admin orders load error:', loadError)
      setError('تعذر تحميل الطلبات. راجع صلاحيات الأدمن واتصال Firebase.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [])

  async function runOrderAction(order: OrderItem, action: string, payload: Record<string, unknown>, confirmMessage: string) {
    if (!firebaseUser) {
      setError('انتهت جلسة الدخول. أعد تسجيل الدخول كأدمن.')
      return
    }

    if (!window.confirm(confirmMessage)) return

    setSavingId(order.id)
    setMessage('')
    setError('')

    try {
      const token = await firebaseUser.getIdToken()
      const response = await fetch(`/api/admin/orders/${order.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, ...payload }),
      })
      const data = (await response.json()) as { success?: boolean; error?: string }

      if (!response.ok || !data.success) {
        setError(data.error || 'تعذر تنفيذ الإجراء.')
        return
      }

      await loadOrders()
      setMessage('تم تنفيذ الإجراء وتسجيله في السجلات وإرسال الإشعار المناسب.')
    } catch (updateError) {
      console.error('Admin order action error:', updateError)
      setError('تعذر تنفيذ الإجراء. تأكد من الصلاحيات وحاول مرة أخرى.')
    } finally {
      setSavingId('')
    }
  }

  function rejectOrder(order: OrderItem) {
    const reason = window.prompt('اكتب سبب الرفض أو المراجعة:')
    if (!reason) return
    runOrderAction(order, 'reject_payment', { reason }, 'هل تريد رفض هذا الطلب؟')
  }

  function cancelOrder(order: OrderItem) {
    const reason = window.prompt('سبب الإلغاء اختياري:') || ''
    runOrderAction(order, 'cancel', { reason }, 'هل تريد إلغاء هذا الطلب؟')
  }

  function refundOrder(order: OrderItem) {
    const reason = window.prompt('سبب الاسترداد اختياري:') || ''
    runOrderAction(order, 'refund', { reason }, 'تسجيل هذا الطلب كمسترد؟')
  }

  function addAdminNote(order: OrderItem) {
    const note = window.prompt('اكتب ملاحظة داخلية لهذا الطلب:', order.adminNote || '')
    if (!note) return
    runOrderAction(order, 'add_note', { note }, 'هل تريد حفظ الملاحظة؟')
  }

  const filteredOrders = useMemo(() => {
    const queryText = search.trim().toLowerCase()
    return orders.filter((order) => {
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter
      const matchesProduct = productFilter === 'all' || order.productType === productFilter
      const haystack = [getProductTitle(order), getCustomerName(order), order.userEmail, order.paymentReference, order.id].filter(Boolean).join(' ').toLowerCase()
      const matchesSearch = !queryText || haystack.includes(queryText)
      return matchesStatus && matchesProduct && matchesSearch
    })
  }, [orders, productFilter, search, statusFilter])

  const stats = useMemo(() => {
    const paid = orders.filter((order) => order.status === 'paid' || order.status === 'access_granted')
    return {
      total: orders.length,
      awaiting: orders.filter((order) => order.status === 'awaiting_payment' || order.status === 'pending').length,
      submitted: orders.filter((order) => order.status === 'payment_submitted').length,
      paid: paid.length,
      accessGranted: orders.filter((order) => order.status === 'access_granted').length,
      revenue: paid.reduce((sum, order) => sum + getAmount(order), 0),
    }
  }, [orders])

  if (loading) return <PremiumSkeleton className="h-[32rem]" />

  return (
    <div className="space-y-8">
      <AdminPageHeader title="إدارة الطلبات والدفع" description="مركز مبيعات آمن: مراجعة إثباتات الدفع، تأكيد المدفوعات، فتح المحتوى، وتسجيل Timeline لكل إجراء من السيرفر." />

      {message ? <div className="rounded-2xl border border-olive/25 bg-olive/10 p-4 text-sm font-black text-olive dark:text-ivory">{message}</div> : null}
      {error ? <div className="rounded-2xl border border-burgundy/25 bg-burgundy/10 p-4 text-sm font-black text-burgundy dark:text-ivory">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard label="كل الطلبات" value={formatNumber(stats.total)} tone="muted" />
        <MetricCard label="بانتظار الدفع" value={formatNumber(stats.awaiting)} tone="warning" />
        <MetricCard label="إثباتات مرسلة" value={formatNumber(stats.submitted)} tone="petrol" />
        <MetricCard label="مدفوعة" value={formatNumber(stats.paid)} tone="success" />
        <MetricCard label="مفتوح لها المحتوى" value={formatNumber(stats.accessGranted)} tone="olive" />
        <MetricCard label="إيرادات مؤكدة" value={formatEGP(stats.revenue)} tone="gold" />
      </div>

      <AdminPanel title="فلترة الطلبات" description="اعرض فقط ما يحتاج مراجعة أو ابحث عن طلب محدد.">
        <div className="grid gap-4 md:grid-cols-4">
          <Field label="الحالة">
            <select className={inputClass} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </Field>
          <Field label="نوع المنتج">
            <select className={inputClass} value={productFilter} onChange={(event) => setProductFilter(event.target.value)}>
              <option value="all">كل المنتجات</option>
              <option value="course">كورسات</option>
              <option value="book">كتب</option>
            </select>
          </Field>
          <div className="md:col-span-2">
            <Field label="بحث">
              <input className={inputClass} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="اسم، بريد، منتج، مرجع دفع..." />
            </Field>
          </div>
        </div>
      </AdminPanel>

      <AdminPanel title="قائمة الطلبات" description="كل إجراء هنا يمر عبر API محمية ويُسجل في السجلات ويرسل إشعارًا للعميلة عند الحاجة.">
        {filteredOrders.length === 0 ? (
          <EmptyState title="لا توجد طلبات مطابقة" description="عند وصول طلب شراء أو عند تغيير الفلاتر ستظهر الطلبات هنا للمراجعة." />
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <article key={order.id} className="rounded-[1.75rem] border border-sand bg-cream/80 p-5 shadow-soft dark:border-gold/25 dark:bg-white/10">
                <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-xl font-black text-charcoal dark:text-ivory">{getProductTitle(order)}</h3>
                      <StatusBadge meta={orderStatusMeta[String(order.status)]} fallback={String(order.status)} />
                      <StatusBadge meta={paymentStatusMeta[String(order.paymentStatus || 'pending')]} fallback={String(order.paymentStatus || 'pending')} />
                      <ToneBadge tone="gold">{order.productType === 'book' ? 'كتاب' : 'كورس'}</ToneBadge>
                    </div>
                    <div className="mt-4 grid gap-3 text-sm font-bold text-warm-gray dark:text-cream md:grid-cols-2">
                      <p>العميلة: <span className="text-charcoal dark:text-ivory">{getCustomerName(order)}</span></p>
                      <p>البريد: <span className="text-charcoal dark:text-ivory">{order.userEmail || 'غير متوفر'}</span></p>
                      <p>المبلغ: <span className="text-charcoal dark:text-ivory">{formatEGP(getAmount(order))}</span></p>
                      <p>طريقة الدفع: <span className="text-charcoal dark:text-ivory">{order.paymentMethod || 'غير محددة'}</span></p>
                      <p>مرجع الدفع: <span className="text-charcoal dark:text-ivory">{order.paymentReference || 'لم يرسل بعد'}</span></p>
                      <p>تاريخ الطلب: <span className="text-charcoal dark:text-ivory">{formatArabicDateTime(order.createdAt)}</span></p>
                      <p>رقم الطلب: <span className="text-charcoal dark:text-ivory">{order.id}</span></p>
                    </div>
                    {order.paymentProofUrl ? <p className="mt-4 break-all rounded-2xl border border-gold/25 bg-gold/10 p-3 text-sm font-bold text-deepTeal dark:text-ivory">إثبات الدفع: {order.paymentProofUrl}</p> : null}
                    {order.rejectionReason ? <p className="mt-4 rounded-2xl border border-burgundy/25 bg-burgundy/10 p-3 text-sm font-bold text-burgundy dark:text-ivory">سبب الرفض: {order.rejectionReason}</p> : null}
                    {order.adminNote ? <p className="mt-4 rounded-2xl border border-petrol/25 bg-petrol/10 p-3 text-sm font-bold text-petrol dark:text-ivory">ملاحظة إدارية: {order.adminNote}</p> : null}
                  </div>

                  <div className="rounded-[1.5rem] border border-sand bg-ivory/80 p-4 dark:border-gold/25 dark:bg-deepTeal/60">
                    <p className="mb-3 text-xs font-black text-petrol dark:text-gold">إجراءات آمنة</p>
                    <div className="flex flex-wrap gap-2">
                      <AdminActionButton disabled={savingId === order.id} tone="success" onClick={() => runOrderAction(order, 'confirm_payment', {}, 'تأكيد الدفع لهذا الطلب؟')}>تأكيد الدفع</AdminActionButton>
                      <AdminActionButton disabled={savingId === order.id} tone="gold" onClick={() => runOrderAction(order, 'grant_access', {}, 'فتح المحتوى لهذا الطلب؟')}>فتح المحتوى</AdminActionButton>
                      <AdminActionButton disabled={savingId === order.id} tone="danger" onClick={() => rejectOrder(order)}>رفض</AdminActionButton>
                      <AdminActionButton disabled={savingId === order.id} tone="warning" onClick={() => refundOrder(order)}>استرداد</AdminActionButton>
                      <AdminActionButton disabled={savingId === order.id} tone="muted" onClick={() => cancelOrder(order)}>إلغاء</AdminActionButton>
                      <AdminActionButton disabled={savingId === order.id} tone="muted" onClick={() => addAdminNote(order)}>ملاحظة</AdminActionButton>
                    </div>
                    <div className="mt-5 space-y-2 border-t border-sand pt-4 text-xs font-bold text-warm-gray dark:border-gold/25 dark:text-cream">
                      <p>1. طلب جديد</p>
                      <p>2. إثبات الدفع</p>
                      <p>3. تأكيد الدفع</p>
                      <p>4. فتح المحتوى</p>
                      <p>5. إشعار العميلة وتسجيل Timeline</p>
                    </div>
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
