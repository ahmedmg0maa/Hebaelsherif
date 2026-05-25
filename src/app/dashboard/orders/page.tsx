'use client'

export const dynamic = 'force-dynamic'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import BrandOrnament from '@/components/brand/BrandOrnament'
import PremiumButton from '@/components/ui/PremiumButton'
import PremiumEmptyState from '@/components/ui/PremiumEmptyState'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'
import { db } from '@/lib/firebase/client'
import { useAuth } from '@/hooks/useAuth'
import { formatArabicDate, formatEGP, getOrderStatusClass, getOrderStatusLabel } from '@/lib/utils/formatters'
import type { Order } from '@/types'

interface OrderWithProductTitle extends Order {
  productTitle: string
}

interface ProofDraft {
  paymentReference: string
  paymentProofUrl: string
  note: string
  status?: 'idle' | 'loading' | 'success' | 'error'
  message?: string
}

const proofableStatuses = new Set(['pending', 'awaiting_payment', 'rejected'])

export default function DashboardOrdersPage() {
  const { user, firebaseUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<OrderWithProductTitle[]>([])
  const [proofDrafts, setProofDrafts] = useState<Record<string, ProofDraft>>({})

  useEffect(() => {
    const userId = user?.uid
    if (!userId) return

    async function loadOrders() {
      setLoading(true)
      const ordersSnap = await getDocs(query(collection(db, 'orders'), where('userId', '==', userId)))
      const userOrders = ordersSnap.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })) as Order[]

      const ordersWithTitles = await Promise.all(
        userOrders.map(async (order) => {
          const collectionName = order.productType === 'course' ? 'courses' : 'books'
          const productSnap = await getDoc(doc(db, collectionName, order.productId))

          return {
            ...order,
            productTitle: productSnap.exists() ? String(productSnap.data().title || 'منتج غير محدد') : 'منتج غير متاح',
          }
        }),
      )

      ordersWithTitles.sort((a, b) => getMillis(b.createdAt) - getMillis(a.createdAt))
      setOrders(ordersWithTitles)
      setLoading(false)
    }

    loadOrders().catch((error) => {
      console.error('Dashboard orders error:', error)
      setLoading(false)
    })
  }, [user?.uid])

  const summary = useMemo(() => {
    return {
      total: orders.length,
      paid: orders.filter((order) => order.status === 'paid' || order.status === 'access_granted').length,
      pending: orders.filter((order) => ['pending', 'awaiting_payment', 'payment_submitted'].includes(order.status)).length,
      amount: orders
        .filter((order) => order.status === 'paid' || order.status === 'access_granted')
        .reduce((sum, order) => sum + Number(order.amount || 0), 0),
    }
  }, [orders])

  function getDraft(orderId: string): ProofDraft {
    return proofDrafts[orderId] || { paymentReference: '', paymentProofUrl: '', note: '', status: 'idle' }
  }

  function updateDraft(orderId: string, patch: Partial<ProofDraft>) {
    setProofDrafts((current) => ({
      ...current,
      [orderId]: { ...getDraft(orderId), ...patch },
    }))
  }

  async function submitProof(event: FormEvent<HTMLFormElement>, orderId: string) {
    event.preventDefault()
    const draft = getDraft(orderId)

    if (!firebaseUser) {
      updateDraft(orderId, { status: 'error', message: 'يجب تسجيل الدخول مرة أخرى.' })
      return
    }

    if (!draft.paymentReference.trim() && !draft.paymentProofUrl.trim()) {
      updateDraft(orderId, { status: 'error', message: 'أضيفي رقم العملية أو رابط إثبات الدفع.' })
      return
    }

    updateDraft(orderId, { status: 'loading', message: '' })

    try {
      const token = await firebaseUser.getIdToken()
      const response = await fetch('/api/payments/proof', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId,
          paymentReference: draft.paymentReference,
          paymentProofUrl: draft.paymentProofUrl,
          note: draft.note,
        }),
      })
      const data = (await response.json()) as { success?: boolean; error?: string }

      if (!response.ok || !data.success) {
        updateDraft(orderId, { status: 'error', message: data.error || 'لم نتمكن من إرسال إثبات الدفع.' })
        return
      }

      setOrders((current) =>
        current.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status: 'payment_submitted',
                paymentReference: draft.paymentReference,
                paymentProofUrl: draft.paymentProofUrl,
                paymentNote: draft.note,
              }
            : order,
        ),
      )
      updateDraft(orderId, {
        paymentReference: '',
        paymentProofUrl: '',
        note: '',
        status: 'success',
        message: 'تم إرسال إثبات الدفع. سيتم مراجعته وفتح الوصول بعد التأكيد.',
      })
    } catch (error) {
      console.error('Payment proof submit error:', error)
      updateDraft(orderId, { status: 'error', message: 'لم نتمكن من إرسال إثبات الدفع الآن.' })
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <PremiumSkeleton className="h-56" />
        <PremiumSkeleton className="h-28" />
        <PremiumSkeleton className="h-28" />
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <PremiumEmptyState
        icon="◇"
        title="لا توجد طلبات بعد"
        description="عند طلب كورس أو كتاب، سيظهر هنا مسار الدفع وفتح الوصول خطوة بخطوة."
        actionLabel="استكشفي المسارات"
        actionHref="/courses"
      />
    )
  }

  return (
    <div className="space-y-8">
      <section className="premium-glow-border rounded-[2.5rem] border border-sand bg-ivory/90 p-6 shadow-premium backdrop-blur-sm lg:p-8 dark:bg-deep-teal/55">
        <BrandOrnament className="mb-5" />
        <p className="mini-label mb-3">طلباتي</p>
        <h2 className="text-4xl font-black leading-tight text-petrol md:text-5xl dark:text-gold">سجل الشراء والوصول</h2>
        <p className="mt-4 max-w-2xl text-sm leading-8 text-warm-gray">
          تابعي حالة كل طلب، أرسلي إثبات الدفع، واعرفي متى يتم فتح المحتوى داخل حسابك.
        </p>

        <div className="mt-7 grid gap-3 sm:grid-cols-4">
          <SummaryPill label="كل الطلبات" value={summary.total} />
          <SummaryPill label="تم التأكيد" value={summary.paid} />
          <SummaryPill label="قيد المراجعة" value={summary.pending} />
          <SummaryPill label="إجمالي مؤكد" value={formatEGP(summary.amount)} wide />
        </div>
      </section>

      <div className="space-y-4">
        {orders.map((order) => {
          const draft = getDraft(order.id)
          const canSubmitProof = proofableStatuses.has(order.status)

          return (
            <article key={order.id} className="rounded-[2rem] border border-sand bg-ivory/90 p-6 shadow-soft backdrop-blur-sm dark:bg-deep-teal/50">
              <div className="grid gap-5 lg:grid-cols-[1fr_240px] lg:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${getOrderStatusClass(order.status)}`}>
                      {getOrderStatusLabel(order.status)}
                    </span>
                    <span className="rounded-full border border-petrol/15 bg-petrol/10 px-3 py-1 text-xs font-black text-petrol dark:text-gold">
                      {order.productType === 'course' ? 'كورس' : 'كتاب'}
                    </span>
                  </div>
                  <h3 className="mt-4 text-2xl font-black text-charcoal">{order.productTitle}</h3>
                  <p className="mt-2 text-sm leading-7 text-warm-gray">تاريخ الطلب: {formatArabicDate(order.createdAt)}</p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {order.paymentMethod ? <DetailItem label="طريقة الدفع" value={getPaymentLabel(order.paymentMethod)} /> : null}
                    {order.paymentReference ? <DetailItem label="مرجع الدفع" value={order.paymentReference} /> : null}
                    {order.paymentProofUrl ? <DetailItem label="رابط الإثبات" value={order.paymentProofUrl} /> : null}
                    {order.adminNote ? <DetailItem label="ملاحظة الإدارة" value={order.adminNote} /> : null}
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-sand bg-cream/70 p-5 text-center dark:bg-deep-teal/45">
                  <p className="text-xs font-black text-warm-gray">الإجمالي</p>
                  <p className="mt-2 text-2xl font-black text-petrol latin-numerals dark:text-gold">{formatEGP(order.amount)}</p>
                  {order.discountAmount ? <p className="mt-2 text-xs font-bold text-gold">خصم: {formatEGP(order.discountAmount)}</p> : null}
                </div>
              </div>

              {canSubmitProof ? (
                <form onSubmit={(event) => submitProof(event, order.id)} className="mt-6 rounded-[1.75rem] border border-gold/20 bg-cream/70 p-5 dark:bg-deep-teal/45">
                  <p className="mini-label mb-3">إثبات الدفع</p>
                  <p className="mb-4 text-sm leading-7 text-warm-gray">أرسلي رقم العملية أو رابط صورة الإثبات، وسيتم فتح الوصول بعد مراجعة الإدارة.</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <input
                      className="premium-input"
                      value={draft.paymentReference}
                      onChange={(event) => updateDraft(order.id, { paymentReference: event.target.value })}
                      placeholder="رقم العملية"
                    />
                    <input
                      className="premium-input"
                      value={draft.paymentProofUrl}
                      onChange={(event) => updateDraft(order.id, { paymentProofUrl: event.target.value })}
                      placeholder="رابط صورة الإثبات إن وجد"
                    />
                  </div>
                  <textarea
                    className="premium-input mt-3 min-h-24 resize-y"
                    value={draft.note}
                    onChange={(event) => updateDraft(order.id, { note: event.target.value })}
                    placeholder="ملاحظة قصيرة للإدارة"
                  />
                  {draft.message ? (
                    <p className={`mt-3 rounded-2xl border px-4 py-3 text-sm font-black ${draft.status === 'success' ? 'border-olive/20 bg-olive/10 text-olive' : 'border-burgundy/20 bg-burgundy/10 text-burgundy'}`}>
                      {draft.message}
                    </p>
                  ) : null}
                  <PremiumButton type="submit" className="mt-4" disabled={draft.status === 'loading'}>
                    {draft.status === 'loading' ? 'جارٍ الإرسال...' : 'إرسال إثبات الدفع'}
                  </PremiumButton>
                </form>
              ) : null}
            </article>
          )
        })}
      </div>
    </div>
  )
}

function SummaryPill({ label, value, wide = false }: { label: string; value: number | string; wide?: boolean }) {
  return (
    <div className="rounded-[1.5rem] border border-sand bg-cream/70 p-4 text-center dark:bg-deep-teal/45">
      <strong className={`block font-black text-petrol latin-numerals dark:text-gold ${wide ? 'text-xl' : 'text-3xl'}`}>{value}</strong>
      <span className="mt-1 block text-xs font-black text-warm-gray">{label}</span>
    </div>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-sand bg-cream/70 px-4 py-3 dark:bg-deep-teal/35">
      <p className="text-xs font-black text-warm-gray">{label}</p>
      <p className="mt-1 break-words text-sm font-black text-petrol latin-numerals dark:text-gold">{value}</p>
    </div>
  )
}

function getPaymentLabel(method: string) {
  const labels: Record<string, string> = {
    instapay: 'InstaPay',
    vodafone_cash: 'Vodafone Cash',
    bank_transfer: 'تحويل بنكي',
    manual: 'تأكيد يدوي',
  }
  return labels[method] || method
}

function getMillis(value: Order['createdAt']) {
  if (value instanceof Date) return value.getTime()
  if (value && typeof value === 'object' && 'toDate' in value) return value.toDate().getTime()
  return 0
}
