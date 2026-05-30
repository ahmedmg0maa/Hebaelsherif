'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import BrandOrnament from '@/components/brand/BrandOrnament'
import ImageSlot from '@/components/ui/ImageSlot'
import PremiumEmptyState from '@/components/ui/PremiumEmptyState'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'
import { db } from '@/lib/firebase/client'
import { useAuth } from '@/hooks/useAuth'
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

      const ordersSnap = await getDocs(query(collection(db, 'orders'), where('userId', '==', userId)))
      const paidBookOrders = ordersSnap.docs
        .map((docItem) => ({ id: docItem.id, ...docItem.data() }) as Order)
        .filter((order) => order.productType === 'book' && (order.status === 'paid' || order.status === 'access_granted'))

      const ownedBooks = await Promise.all(
        paidBookOrders.map(async (order) => {
          const bookSnap = await getDoc(doc(db, 'books', order.productId))
          if (!bookSnap.exists()) return null
          return { id: bookSnap.id, ...bookSnap.data() } as Book
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
        icon="☾"
        title="مكتبتك الهادئة تنتظر أول كتاب"
        description="بعد تأكيد شراء أي كتاب، سيظهر هنا ويمكنك فتحه من مساحة القراءة الخاصة بك."
        actionLabel="استكشفي الكتب"
        actionHref="/books"
      />
    )
  }

  return (
    <div className="space-y-8">
      <section className="premium-glow-border rounded-[2.5rem] border border-sand bg-ivory/90 p-6 shadow-premium backdrop-blur-sm lg:p-8">
        <BrandOrnament className="mb-5" />
        <p className="mini-label mb-3">كتبي</p>
        <h2 className="text-4xl font-black leading-tight text-petrol md:text-5xl">مكتبة وعي شخصية</h2>
        <p className="mt-4 max-w-2xl text-sm leading-8 text-warm-gray">
          كل كتاب مؤكد يظهر هنا كمساحة قراءة محفوظة يمكنك العودة إليها وقتما أردتِ.
        </p>
      </section>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {books.map((book) => (
          <Link
            key={book.id}
            href={`/books/${book.slug}/read`}
            className="group rounded-[2.25rem] border border-sand bg-ivory/90 p-4 shadow-soft backdrop-blur-sm transition hover:-translate-y-1 hover:shadow-premium"
          >
            <ImageSlot
              src={book.coverImageUrl}
              alt={book.title}
              ratio="book"
              variant="book"
              label="غلاف الكتاب"
              hint="غلاف الكتاب الحقيقي يظهر هنا."
              className="mx-auto max-w-[260px]"
            />
            <div className="p-3 pt-5">
              <span className="rounded-full border border-gold/20 bg-gold/10 px-3 py-1 text-xs font-black text-gold">
                {book.pagesCount ? `${book.pagesCount} صفحة` : book.category || 'كتاب رقمي'}
              </span>
              <h3 className="mt-4 text-xl font-black text-charcoal transition group-hover:text-petrol">{book.title}</h3>
              <p className="mt-3 line-clamp-3 text-sm leading-7 text-warm-gray">{book.shortDescription}</p>
              <span className="mt-5 inline-block text-sm font-black text-petrol">افتحي الكتاب ←</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
