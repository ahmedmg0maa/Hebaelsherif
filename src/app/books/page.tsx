'use client'

import { useEffect, useState } from 'react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import BookCard from '@/components/books/BookCard'
import PremiumEmptyState from '@/components/ui/PremiumEmptyState'
import PremiumSection from '@/components/ui/PremiumSection'
import { BookCardSkeleton } from '@/components/ui/PremiumSkeleton'
import { getPublishedBooks } from '@/lib/firestore/books'
import type { Book } from '@/types'

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadBooks() {
      try {
        setLoading(true)
        setError('')
        const publishedBooks = await getPublishedBooks()
        setBooks(publishedBooks)
      } catch (loadError) {
        console.error('Books page error:', loadError)
        setError('تعذر تحميل الكتب الآن. حاولي مرة أخرى لاحقًا.')
      } finally {
        setLoading(false)
      }
    }

    loadBooks()
  }, [])

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20">
        <section className="container-premium relative overflow-hidden py-16 text-center">
          <div className="ambient-orb ambient-orb-gold left-8 top-10 h-56 w-56" />
          <div className="relative mx-auto max-w-3xl">
            <p className="mini-label mb-3">الكتب</p>
            <h1 className="text-balance text-4xl font-black leading-tight text-charcoal md:text-6xl">
              كتب رقمية هادئة تعيدك إلى صوتك الداخلي
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-sm leading-8 text-warm-gray md:text-base">
              قراءة عميقة، عملية، ورفيقة لرحلتك. كل كتاب يفتح داخل حسابك بعد تأكيد الشراء.
            </p>
          </div>
        </section>

        <section className="container-premium pb-16">
          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <BookCardSkeleton /><BookCardSkeleton /><BookCardSkeleton /><BookCardSkeleton />
            </div>
          ) : null}

          {!loading && error ? <PremiumEmptyState icon="!" title="حدث خطأ" description={error} actionLabel="العودة للرئيسية" actionHref="/" /> : null}

          {!loading && !error && books.length === 0 ? (
            <PremiumEmptyState icon="📖" title="لا توجد كتب منشورة حاليًا" description="عند نشر أول كتاب من لوحة الإدارة سيظهر هنا تلقائيًا." actionLabel="احجزي جلسة خاصة" actionHref="/booking" />
          ) : null}

          {!loading && !error && books.length > 0 ? (
            <PremiumSection title="الكتب المتاحة" eyebrow="مكتبة هادئة">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {books.map((book, index) => <BookCard key={book.id} book={book} featured={index === 0} />)}
              </div>
            </PremiumSection>
          ) : null}
        </section>
      </main>
      <Footer />
    </>
  )
}
