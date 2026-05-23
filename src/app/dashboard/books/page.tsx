'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import { useAuth } from '@/hooks/useAuth'
import PremiumEmptyState from '@/components/ui/PremiumEmptyState'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'
import type { Book, Order } from '@/types'

export default function DashboardBooksPage() {
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [books, setBooks] = useState<Book[]>([])

  useEffect(() => {
    const userId = user?.uid

    if (!userId) return

    async function loadBooks() {
      setLoading(true)

      const ordersSnap = await getDocs(
        query(collection(db, 'orders'), where('userId', '==', userId)),
      )

      const paidBookOrders = ordersSnap.docs
        .map((docItem) => ({ id: docItem.id, ...docItem.data() }) as Order)
        .filter((order) => order.productType === 'book' && order.status === 'paid')

      const ownedBooks = await Promise.all(
        paidBookOrders.map(async (order) => {
          const bookSnap = await getDoc(doc(db, 'books', order.productId))

          if (!bookSnap.exists()) return null

          return {
            id: bookSnap.id,
            ...bookSnap.data(),
          } as Book
        }),
      )

      setBooks(ownedBooks.filter(Boolean) as Book[])
      setLoading(false)
    }

    loadBooks().catch((error) => {
      console.error('Dashboard books error:', error)
      setLoading(false)
    })
  }, [user?.uid])

  if (loading) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <PremiumSkeleton className="h-96" />
        <PremiumSkeleton className="h-96" />
        <PremiumSkeleton className="h-96" />
      </div>
    )
  }

  if (books.length === 0) {
    return (
      <PremiumEmptyState
        icon="📖"
        title="كتب جديدة تُحضَّر بهدوء"
        description="بعد تأكيد شراء أي كتاب، سيظهر هنا ويمكنك الوصول إليه من لوحة حسابك."
        actionLabel="استكشفي الكتب"
        actionHref="/books"
      />
    )
  }

  return (
    <div>
      <div className="mb-8">
        <p className="mb-2 text-sm font-bold text-gold">كتبي</p>
        <h2 className="text-3xl font-black text-charcoal">الكتب المتاحة لكِ</h2>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {books.map((book) => (
          <Link
            key={book.id}
            href={`/books/${book.slug}/read`}
            className="group overflow-hidden rounded-3xl border border-sand bg-ivory shadow-soft transition hover:-translate-y-1 hover:shadow-premium"
          >
            <div className="relative aspect-[3/4] bg-sand">
              {book.coverImageUrl ? (
                <Image
                  src={book.coverImageUrl}
                  alt={book.title}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm font-bold text-warm-gray">
                  غلاف الكتاب
                </div>
              )}
            </div>

            <div className="p-5">
              <h3 className="text-lg font-black text-charcoal">{book.title}</h3>

              <p className="mt-3 line-clamp-3 text-sm leading-7 text-warm-gray">
                {book.shortDescription}
              </p>

              <span className="mt-5 inline-block text-sm font-bold text-petrol">
                افتحي الكتاب ←
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}