'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import PremiumButton from '@/components/ui/PremiumButton'
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
  { label: 'بانتظار التأكيد', value: 'pending' },
  { label: 'مدفوع', value: 'paid' },
  { label: 'ملغي', value: 'cancelled' },
]

export default function AdminOrdersPage() {
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [activeStatus, setActiveStatus] = useState<'all' | OrderStatus>('all')
  const [updatingId, setUpdatingId] = useState<string>('')

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

    hydratedOrders.sort((a, b) => {
      const aDate = 'toDate' in a.createdAt ? a.createdAt.toDate().getTime() : 0
      const bDate = 'toDate' in b.createdAt ? b.createdAt.toDate().getTime() : 0
      return bDate - aDate
    })

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
    if (activeStatus === 'all') return orders
    return orders.filter((order) => order.status === activeStatus)
  }, [activeStatus, orders])

  async function updateOrderStatus(orderId: string, status: OrderStatus) {
    setUpdatingId(orderId)

    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status,
        updatedAt: serverTimestamp(),
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
        <PremiumSkeleton className="h-32" />
        <PremiumSkeleton className="h-32" />
        <PremiumSkeleton className="h-32" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-sm font-bold text-gold">إدارة الطلبات</p>
          <h2 className="text-3xl font-black text-charcoal">طلبات شراء الدورات والكتب</h2>
          <p className="mt-3 max-w-2xl text-sm leading-8 text-warm-gray">
            من هنا يتم تأكيد الطلبات المدفوعة أو إلغاء الطلبات غير المكتملة.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setActiveStatus(option.value)}
              className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                activeStatus === option.value
                  ? 'bg-petrol text-cream'
                  : 'border border-sand bg-ivory text-warm-gray hover:text-petrol'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <PremiumEmptyState
          icon="🧾"
          title="لا توجد طلبات"
          description="عندما يرسل المستخدم طلب شراء، سيظهر هنا."
        />
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <article
              key={order.id}
              className="rounded-3xl border border-sand bg-ivory p-6 shadow-soft"
            >
              <div className="grid gap-6 xl:grid-cols-[1fr_260px] xl:items-center">
                <div>
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getOrderStatusClass(
                      order.status,
                    )}`}
                  >
                    {getOrderStatusLabel(order.status)}
                  </span>

                  <h3 className="mt-4 text-xl font-black text-charcoal">{order.productTitle}</h3>

                  <div className="mt-3 grid gap-2 text-sm leading-7 text-warm-gray md:grid-cols-2">
                    <p>
                      النوع:{' '}
                      <strong className="text-charcoal">
                        {order.productType === 'course' ? 'دورة' : 'كتاب'}
                      </strong>
                    </p>

                    <p>
                      السعر: <strong className="text-petrol">{formatEGP(order.amount)}</strong>
                    </p>

                    <p>
                      العميل: <strong className="text-charcoal">{order.userName}</strong>
                    </p>

                    <p>
                      البريد: <strong className="text-charcoal">{order.userEmail || 'غير متاح'}</strong>
                    </p>

                    <p>
                      طريقة الدفع: <strong className="text-charcoal">{order.paymentMethod || 'manual'}</strong>
                    </p>

                    <p>
                      مرجع الدفع: <strong className="text-charcoal">{order.paymentReference || 'غير مضاف'}</strong>
                    </p>

                    <p>
                      تاريخ الطلب:{' '}
                      <strong className="text-charcoal">{formatArabicDate(order.createdAt)}</strong>
                    </p>
                  </div>
                </div>

                <div className="grid gap-2">
                  <PremiumButton
                    type="button"
                    size="sm"
                    className="w-full"
                    disabled={updatingId === order.id || order.status === 'paid'}
                    onClick={() => updateOrderStatus(order.id, 'paid')}
                  >
                    تأكيد الدفع
                  </PremiumButton>

                  <PremiumButton
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full"
                    disabled={updatingId === order.id || order.status === 'pending'}
                    onClick={() => updateOrderStatus(order.id, 'pending')}
                  >
                    إرجاع لانتظار التأكيد
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
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}