'use client'

import { useEffect, useState } from 'react'
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import { useAuth } from '@/hooks/useAuth'
import PremiumEmptyState from '@/components/ui/PremiumEmptyState'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'
import {
  formatArabicDate,
  formatEGP,
  getOrderStatusClass,
  getOrderStatusLabel,
} from '@/lib/utils/formatters'
import type { Order } from '@/types'

interface OrderWithProductTitle extends Order {
  productTitle: string
}

export default function DashboardOrdersPage() {
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<OrderWithProductTitle[]>([])

  useEffect(() => {
    const userId = user?.uid

    if (!userId) return

    async function loadOrders() {
      setLoading(true)

      const ordersSnap = await getDocs(
        query(collection(db, 'orders'), where('userId', '==', userId)),
      )

      const userOrders = ordersSnap.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data(),
      })) as Order[]

      const ordersWithTitles = await Promise.all(
        userOrders.map(async (order) => {
          const collectionName = order.productType === 'course' ? 'courses' : 'books'
          const productSnap = await getDoc(doc(db, collectionName, order.productId))

          return {
            ...order,
            productTitle: productSnap.exists()
              ? String(productSnap.data().title || 'منتج غير محدد')
              : 'منتج غير متاح',
          }
        }),
      )

      ordersWithTitles.sort((a, b) => {
        const aTime = 'toDate' in a.createdAt ? a.createdAt.toDate().getTime() : 0
        const bTime = 'toDate' in b.createdAt ? b.createdAt.toDate().getTime() : 0
        return bTime - aTime
      })

      setOrders(ordersWithTitles)
      setLoading(false)
    }

    loadOrders().catch((error) => {
      console.error('Dashboard orders error:', error)
      setLoading(false)
    })
  }, [user?.uid])

  if (loading) {
    return (
      <div className="space-y-4">
        <PremiumSkeleton className="h-28" />
        <PremiumSkeleton className="h-28" />
        <PremiumSkeleton className="h-28" />
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <PremiumEmptyState
        icon="🧾"
        title="لا توجد طلبات بعد"
        description="أي طلب شراء كورس أو كتاب سيظهر هنا مع حالته."
        actionLabel="استكشفي المنتجات"
        actionHref="/courses"
      />
    )
  }

  return (
    <div>
      <div className="mb-8">
        <p className="mb-2 text-sm font-bold text-gold">طلباتي</p>
        <h2 className="text-3xl font-black text-charcoal">سجل الطلبات</h2>
      </div>

      <div className="space-y-4">
        {orders.map((order) => (
          <article
            key={order.id}
            className="rounded-3xl border border-sand bg-ivory p-6 shadow-soft"
          >
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getOrderStatusClass(
                    order.status,
                  )}`}
                >
                  {getOrderStatusLabel(order.status)}
                </span>

                <h3 className="mt-4 text-xl font-black text-charcoal">{order.productTitle}</h3>

                <p className="mt-2 text-sm leading-7 text-warm-gray">
                  النوع: {order.productType === 'course' ? 'كورس' : 'كتاب'} · تاريخ الطلب:{' '}
                  {formatArabicDate(order.createdAt)}
                </p>
              </div>

              <div className="rounded-2xl border border-sand bg-cream px-5 py-4 text-center">
                <p className="text-xs font-bold text-warm-gray">الإجمالي</p>
                <p className="mt-2 text-lg font-black text-petrol">{formatEGP(order.amount)}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}