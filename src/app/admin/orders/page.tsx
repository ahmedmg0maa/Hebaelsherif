'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useMemo, useState } from 'react'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import BrandDivider from '@/components/brand/BrandDivider'
import PremiumBadge from '@/components/ui/PremiumBadge'
import PremiumButton from '@/components/ui/PremiumButton'
import PremiumCard from '@/components/ui/PremiumCard'
import PremiumEmptyState from '@/components/ui/PremiumEmptyState'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'
import {
  formatArabicDate,
  formatEGP,
  getOrderStatusClass,
  getOrderStatusLabel,
} from '@/lib/utils/formatters'
import type { Order, OrderStatus } from '@/types'

interface AdminOrder extends Order {
  productTitle: string
  userEmail: string
  userName: string
}

const statusOptions: { label: string; value: 'all' | OrderStatus }[] = [
  { label: 'كل الطلبات', value: 'all' },
  { label: 'بانتظار المراجعة', value: 'pending' },
  { label: 'بانتظار إثبات الدفع', value: 'awaiting_payment' },
  { label: 'إثبات الدفع قيد المراجعة', value: 'payment_submitted' },
  { label: 'تم تأكيد الدفع', value: 'paid' },
  { label: 'الوصول مفتوح', value: 'access_granted' },
  { label: 'يحتاج مراجعة', value: 'rejected' },
  { label: 'فشل الدفع', value: 'failed' },
  { label: 'مسترد', value: 'refunded' },
  { label: 'ملغي', value: 'cancelled' },
]

const timelineSteps = [
  { key: 'pending', label: 'طلب جديد' },
  { key: 'payment_submitted', label: 'بيانات دفع' },
  { key: 'paid', label: 'فتح الوصول' },
] as const

export default function AdminOrdersPage() {
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [activeStatus, setActiveStatus] = useState<'all' | OrderStatus>('all')
  const [updatingId, setUpdatingId] = useState<string>('')
  const [search, setSearch] = useState('')

  async function loadOrders() {
    setLoading(true)

    const ordersSnap = await getDocs(collection(db, 'orders'))

    const baseOrders = ordersSnap.docs.map((docItem) => ({
      id: docItem.id,
      ...docItem.data(),
    })) as Order[]

    const hydratedOrders = await Promise.all(
      baseOrders.map(async (order) => {
        const productCollection = order.productType === 'course' ? 'courses' : 'books'

        const [productSnap, userSnap] = await Promise.all([
          getDoc(doc(db, productCollection, order.productId)),
          getDoc(doc(db, 'users', order.userId)),
        ])

        const userData = userSnap.exists() ? userSnap.data() : null

        return {
          ...order,
          productTitle: productSnap.exists()
            ? String(productSnap.data().title || 'منتج بدون عنوان')
            : 'منتج غير موجود',
          userName: userData ? String(userData.name || 'مستخدم بدون اسم') : 'مستخدم غير موجود',
          userEmail: userData ? String(userData.email || '') : '',
        } satisfies AdminOrder
      }),
    )

    hydratedOrders.sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt))

    setOrders(hydratedOrders)
    setLoading(false)
  }

  useEffect(() => {
    loadOrders().catch((error) => {
      console.error('Admin orders load error:', error)
      setLoading(false)
    })
  }, [])

  const filteredOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return orders.filter((order) => {
      const statusMatches = activeStatus === 'all' || order.status === activeStatus
      const searchMatches =
        !normalizedSearch ||
        order.productTitle.toLowerCase().includes(normalizedSearch) ||
        order.userName.toLowerCase().includes(normalizedSearch) ||
        order.userEmail.toLowerCase().includes(normalizedSearch) ||
        String(order.paymentReference || '').toLowerCase().includes(normalizedSearch)

      return statusMatches && searchMatches
    })
  }, [activeStatus, orders, search])

  const stats = useMemo(() => {
    const paid = orders.filter((order) => order.status === 'paid' || order.status === 'access_granted')
    const submitted = orders.filter((order) => order.status === 'payment_submitted')
    const pending = orders.filter((order) => order.status === 'pending' || order.status === 'awaiting_payment')

    return {
      revenue: paid.reduce((sum, order) => sum + Number(order.amount || 0), 0),
      paid: paid.length,
      submitted: submitted.length,
      pending: pending.length,
    }
  }, [orders])

  async function updateOrderStatus(orderId: string, status: OrderStatus) {
    setUpdatingId(orderId)

    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status,
        paymentStatus: status === 'paid' || status === 'access_granted' ? 'confirmed' : status === 'rejected' ? 'rejected' : status === 'payment_submitted' ? 'submitted' : 'pending',
        updatedAt: serverTimestamp(),
      })

      await addDoc(collection(db, 'admin_logs'), {
        action: 'order_status_updated',
        targetType: 'order',
        targetId: orderId,
        status,
        createdAt: serverTimestamp(),
      })

      setOrders((current) =>
        current.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status,
              }
            : order,
        ),
      )
    } catch (error) {
      console.error('Update order status error:', error)
    } finally {
      setUpdatingId('')
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <PremiumSkeleton className="h-44" />
        <PremiumSkeleton className="h-32" />
        <PremiumSkeleton className="h-32" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <section className="paper-texture relative overflow-hidden rounded-[2.5rem] border border-gold/18 bg-petrol p-7 text-ivory shadow-botanical md:p-9">
        <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-gold/18 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-aqua/10 blur-3xl" />
        <div className="relative grid gap-8 xl:grid-cols-[1fr_390px] xl:items-end">
          <div>
            <PremiumBadge variant="gold">Orders Command</PremiumBadge>
            <h2 className="mt-5 max-w-3xl text-4xl font-black leading-tight md:text-5xl">
              تأكيد المدفوعات وفتح الوصول بدون ارتباك.
            </h2>
            <p className="mt-5 max-w-2xl text-sm font-bold leading-8 text-ivory/72">
              كل طلب يظهر بسياق العميلة، المنتج، طريقة الدفع، والمرحلة الحالية حتى يصبح قرار التأكيد واضحًا وآمنًا.
            </p>
          </div>

          <div className="grid gap-3 rounded-[2rem] border border-white/10 bg-white/8 p-5 backdrop-blur-sm sm:grid-cols-2">
            <Metric label="إيرادات مؤكدة" value={formatEGP(stats.revenue)} />
            <Metric label="طلبات مدفوعة" value={stats.paid} />
            <Metric label="بيانات دفع" value={stats.submitted} />
            <Metric label="بانتظار" value={stats.pending} />
          </div>
        </div>
      </section>

      <PremiumCard className="p-5 md:p-6">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="mini-label">فلترة ومراجعة</p>
            <h3 className="brand-title mt-2 text-2xl font-black text-charcoal">طلبات شراء الكورسات والكتب</h3>
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="premium-input min-w-0 lg:w-80"
            placeholder="ابحثي بالمنتج، العميلة، البريد، أو مرجع الدفع"
          />
        </div>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setActiveStatus(option.value)}
              className={`min-w-max rounded-full px-4 py-2 text-xs font-bold transition ${
                activeStatus === option.value
                  ? 'bg-petrol text-cream shadow-soft'
                  : 'border border-sand bg-cream/80 text-warm-gray hover:text-petrol'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </PremiumCard>

      {filteredOrders.length === 0 ? (
        <PremiumEmptyState
          icon="🧾"
          title="لا توجد طلبات"
          description="عندما ترسل العميلة طلب شراء أو بيانات دفع، سيظهر هنا فورًا."
        />
      ) : (
        <div className="space-y-5">
          {filteredOrders.map((order) => (
            <article key={order.id} className="brand-rich-card overflow-hidden rounded-[2rem] p-0 shadow-soft">
              <div className="grid gap-0 xl:grid-cols-[1fr_340px]">
                <div className="p-6 md:p-7">
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getOrderStatusClass(
                        order.status,
                      )}`}
                    >
                      {getOrderStatusLabel(order.status)}
                    </span>
                    <PremiumBadge variant={order.productType === 'course' ? 'petrol' : 'olive'}>
                      {order.productType === 'course' ? 'كورس' : 'كتاب'}
                    </PremiumBadge>
                  </div>

                  <h3 className="mt-5 text-2xl font-black leading-tight text-charcoal">{order.productTitle}</h3>
                  <p className="mt-2 text-sm font-bold text-warm-gray">
                    {order.userName} · {order.userEmail || 'لا يوجد بريد محفوظ'}
                  </p>

                  <div className="mt-6 grid gap-3 md:grid-cols-2">
                    <Info label="الإجمالي" value={formatEGP(order.amount)} strong />
                    <Info label="تاريخ الطلب" value={formatArabicDate(order.createdAt)} />
                    <Info label="طريقة الدفع" value={getPaymentMethodLabel(order.paymentMethod)} />
                    <Info label="مرجع الدفع" value={order.paymentReference || 'لم يتم إرساله'} />
                    <Info label="الكوبون" value={order.couponCode || 'لا يوجد'} />
                    <Info label="الخصم" value={order.discountAmount ? formatEGP(order.discountAmount) : 'لا يوجد'} />
                  </div>

                  <div className="mt-7">
                    <p className="mini-label mb-3">مسار الطلب</p>
                    <div className="grid gap-3 md:grid-cols-3">
                      {timelineSteps.map((step, index) => {
                        const active = isTimelineActive(order.status, step.key)
                        return (
                          <div
                            key={step.key}
                            className={`rounded-2xl border px-4 py-3 ${
                              active
                                ? 'border-gold/30 bg-gold/10 text-petrol'
                                : 'border-sand bg-cream/70 text-warm-gray'
                            }`}
                          >
                            <p className="text-[11px] font-black">0{index + 1}</p>
                            <p className="mt-1 text-xs font-black">{step.label}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <aside className="border-t border-sand bg-cream/70 p-6 xl:border-r xl:border-t-0">
                  <p className="mini-label">إجراء سريع</p>
                  <h4 className="brand-title mt-2 text-xl font-black text-charcoal">قرار الطلب</h4>
                  <BrandDivider className="my-5" />

                  <div className="grid gap-2">
                    <PremiumButton
                      type="button"
                      size="sm"
                      className="w-full"
                      disabled={updatingId === order.id || order.status === 'paid' || order.status === 'access_granted'}
                      onClick={() => updateOrderStatus(order.id, 'paid')}
                    >
                      تأكيد الدفع
                    </PremiumButton>

                    <PremiumButton
                      type="button"
                      size="sm"
                      variant="outline"
                      className="w-full"
                      disabled={updatingId === order.id || order.status === 'access_granted'}
                      onClick={() => updateOrderStatus(order.id, 'access_granted')}
                    >
                      تأكيد فتح الوصول
                    </PremiumButton>

                    <PremiumButton
                      type="button"
                      size="sm"
                      variant="outline"
                      className="w-full"
                      disabled={updatingId === order.id || order.status === 'payment_submitted'}
                      onClick={() => updateOrderStatus(order.id, 'payment_submitted')}
                    >
                      إثبات الدفع قيد المراجعة
                    </PremiumButton>

                    <PremiumButton
                      type="button"
                      size="sm"
                      variant="outline"
                      className="w-full"
                      disabled={updatingId === order.id || order.status === 'awaiting_payment'}
                      onClick={() => updateOrderStatus(order.id, 'awaiting_payment')}
                    >
                      انتظار إثبات الدفع
                    </PremiumButton>

                    <PremiumButton
                      type="button"
                      size="sm"
                      variant="outline"
                      className="w-full"
                      disabled={updatingId === order.id || order.status === 'rejected'}
                      onClick={() => updateOrderStatus(order.id, 'rejected')}
                    >
                      يحتاج مراجعة من العميلة
                    </PremiumButton>

                    <PremiumButton
                      type="button"
                      size="sm"
                      variant="danger"
                      className="w-full"
                      disabled={updatingId === order.id || order.status === 'cancelled'}
                      onClick={() => updateOrderStatus(order.id, 'cancelled')}
                    >
                      إلغاء الطلب
                    </PremiumButton>
                  </div>

                  <p className="mt-5 rounded-2xl border border-sand bg-ivory/80 px-4 py-3 text-xs font-bold leading-6 text-warm-gray">
                    عند تحويل الطلب إلى مدفوع، يتم فتح الوصول للمحتوى المحمي تلقائيًا من خلال صفحة الكورس أو الكتاب.
                  </p>
                </aside>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

function getTime(value: { toDate: () => Date } | Date) {
  if (value instanceof Date) return value.getTime()
  return value.toDate().getTime()
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/7 px-4 py-3">
      <p className="text-[11px] font-bold text-ivory/58">{label}</p>
      <p className="mt-1 text-2xl font-black text-gold">{value}</p>
    </div>
  )
}

function Info({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-2xl border border-sand bg-cream/65 px-4 py-3">
      <p className="text-[11px] font-bold text-warm-gray">{label}</p>
      <p className={`mt-1 text-sm font-black ${strong ? 'text-petrol' : 'text-charcoal'}`}>{value}</p>
    </div>
  )
}

function getPaymentMethodLabel(method: string | undefined) {
  const labels: Record<string, string> = {
    instapay: 'InstaPay',
    vodafone_cash: 'محفظة إلكترونية',
    bank_transfer: 'تحويل بنكي',
    manual: 'تأكيد يدوي',
  }

  return method ? labels[method] || method : 'لم يتم التحديد'
}

function isTimelineActive(status: string, step: string) {
  const rank: Record<string, number> = {
    pending: 1,
    awaiting_payment: 1,
    rejected: 1,
    payment_submitted: 2,
    paid: 3,
    access_granted: 3,
    failed: 1,
    refunded: 3,
    cancelled: 1,
  }

  const stepRank: Record<string, number> = {
    pending: 1,
    payment_submitted: 2,
    paid: 3,
  }

  return (rank[status] || 0) >= (stepRank[step] || 0)
}
