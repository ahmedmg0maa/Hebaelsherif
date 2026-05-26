'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import { addDoc, collection, doc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import type { Order } from '@/types'
import { formatArabicDateTime, formatEGP, formatNumber } from '@/lib/utils/formatters'
import { getAmount, getCustomerName, getProductTitle, orderStatusMeta, paymentStatusMeta, toMillis } from '@/lib/admin/operations'
import { AdminActionButton, AdminPageHeader, AdminPanel, EmptyState, Field, inputClass, MetricCard, StatusBadge, ToneBadge } from '@/components/admin/OperationsUI'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'

interface OrderItem extends Order {
  userEmail?: string
  userName?: string
  productTitle?: string
  paymentStatus?: string
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

  async function writeLog(action: string, order: OrderItem, after: Record<string, unknown>) {
    try {
      await addDoc(collection(db, 'admin_logs'), {
        action,
        targetType: 'orders',
        targetId: order.id,
        before: { status: order.status, paymentStatus: order.paymentStatus },
        after,
        message: `${action} - ${getProductTitle(order)}`,
        createdAt: serverTimestamp(),
      })
    } catch (logError) {
      console.warn('Order log failed:', logError)
    }
  }

  async function updateOrder(order: OrderItem, action: string, values: Record<string, unknown>, confirmMessage: string) {
    if (!window.confirm(confirmMessage)) return
    setSavingId(order.id)
    setMessage('')
    setError('')

    try {
      const nextValues = { ...values, updatedAt: serverTimestamp() }
      await updateDoc(doc(db, 'orders', order.id), nextValues)
      await writeLog(action, order, nextValues)
      setOrders((current) => current.map((item) => (item.id === order.id ? { ...item, ...values } as OrderItem : item)))
      setMessage('تم تحديث الطلب بنجاح.')
    } catch (updateError) {
      console.error('Admin order update error:', updateError)
      setError('تعذر تحديث الطلب. تأكد من الصلاحيات وحاول مرة أخرى.')
    } finally {
      setSavingId('')
    }
  }

  function rejectOrder(order: OrderItem) {
    const reason = window.prompt('اكتب سبب الرفض أو المراجعة:')
    if (!reason) return
    updateOrder(
      order,
      'order_rejected',
      { status: 'rejected', paymentStatus: 'failed', rejectionReason: reason },
      'هل تريد رفض هذا الطلب؟',
    )
  }

  function addAdminNote(order: OrderItem) {
    const note = window.prompt('اكتب ملاحظة داخلية لهذا الطلب:', order.adminNote || '')
    if (!note) return
    updateOrder(order, 'order_note_added', { adminNote: note }, 'هل تريد حفظ الملاحظة؟')
  }

  const filteredOrders = useMemo(() => {
    const queryText = search.trim().toLowerCase()
    return orders.filter((order) => {
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter
      const matchesProduct = productFilter === 'all' || order.productType === productFilter
      const haystack = [getProductTitle(order), getCustomerName(order), order.userEmail, order.paymentReference, order.id]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
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
      <AdminPageHeader
        title="إدارة الطلبات والدفع"
        description="مركز تشغيل الطلبات: مراجعة إثباتات الدفع، تأكيد المدفوعات، فتح المحتوى، وتسجيل كل إجراء مهم."
      />

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

      <AdminPanel title="قائمة الطلبات" description="كل زر هنا يغير حالة حقيقية ويسجل الإجراء في admin_logs.">
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
                    </div>
                    {order.adminNote ? <p className="mt-4 rounded-2xl border border-gold/25 bg-gold/10 p-3 text-sm font-bold text-deepTeal dark:text-ivory">ملاحظة: {order.adminNote}</p> : null}
                    {order.rejectionReason ? <p className="mt-4 rounded-2xl border border-burgundy/25 bg-burgundy/10 p-3 text-sm font-bold text-burgundy dark:text-ivory">سبب الرفض: {order.rejectionReason}</p> : null}
                  </div>

                  <div className="rounded-[1.5rem] border border-sand bg-ivory/80 p-4 dark:border-gold/25 dark:bg-deepTeal/60">
                    <p className="mb-3 text-xs font-black text-petrol dark:text-gold">إجراءات الطلب</p>
                    <div className="flex flex-wrap gap-2">
                      <AdminActionButton disabled={savingId === order.id} tone="petrol" onClick={() => updateOrder(order, 'order_payment_submitted', { status: 'payment_submitted', paymentStatus: 'submitted' }, 'تحديد أن إثبات الدفع مرسل؟')}>
                        إثبات مرسل
                      </AdminActionButton>
                      <AdminActionButton disabled={savingId === order.id} tone="success" onClick={() => updateOrder(order, 'order_paid', { status: 'paid', paymentStatus: 'confirmed', paidAt: serverTimestamp() }, 'تأكيد الدفع لهذا الطلب؟')}>
                        تأكيد الدفع
                      </AdminActionButton>
                      <AdminActionButton disabled={savingId === order.id} tone="gold" onClick={() => updateOrder(order, 'access_granted', { status: 'access_granted', paymentStatus: 'confirmed', accessGrantedAt: serverTimestamp() }, 'فتح المحتوى لهذا الطلب؟')}>
                        فتح المحتوى
                      </AdminActionButton>
                      <AdminActionButton disabled={savingId === order.id} tone="danger" onClick={() => rejectOrder(order)}>
                        رفض
                      </AdminActionButton>
                      <AdminActionButton disabled={savingId === order.id} tone="muted" onClick={() => updateOrder(order, 'order_cancelled', { status: 'cancelled' }, 'إلغاء هذا الطلب؟')}>
                        إلغاء
                      </AdminActionButton>
                      <AdminActionButton disabled={savingId === order.id} tone="muted" onClick={() => addAdminNote(order)}>
                        ملاحظة
                      </AdminActionButton>
                    </div>

                    <div className="mt-5 space-y-2 border-t border-sand pt-4 text-xs font-bold text-warm-gray dark:border-gold/25 dark:text-cream">
                      <p>1. طلب جديد</p>
                      <p>2. إثبات الدفع</p>
                      <p>3. تأكيد الدفع</p>
                      <p>4. فتح المحتوى</p>
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
