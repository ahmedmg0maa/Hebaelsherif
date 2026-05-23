'use client'

import { useEffect, useState } from 'react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import BookCard from '@/components/books/BookCard'
import PremiumEmptyState from '@/components/ui/PremiumEmptyState'
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
        <section className="border-b border-sand bg-ivory/60">
          <div className="container-premium py-16">
            <p className="mb-3 text-sm font-bold tracking-[0.25em] text-gold">
              الكتب
            </p>

            <h1 className="max-w-3xl text-4xl font-black leading-tight text-petrol md:text-6xl">
              كتب رقمية عميقة ترافقك في رحلتك
            </h1>

            <p className="mt-6 max-w-2xl text-sm leading-8 text-warm-gray">
              كتب مصممة لتكون مساحة تأمل وفهم، تساعدك على قراءة مشاعرك وعلاقاتك
              بطريقة أكثر وعيًا وهدوءًا.
            </p>
          </div>
        </section>

        <section className="container-premium py-12">
          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <BookCardSkeleton />
              <BookCardSkeleton />
              <BookCardSkeleton />
              <BookCardSkeleton />
            </div>
          ) : null}

          {!loading && error ? (
            <PremiumEmptyState
              icon="!"
              title="حدث خطأ"
              description={error}
              actionLabel="العودة للرئيسية"
              actionHref="/"
            />
          ) : null}

          {!loading && !error && books.length === 0 ? (
            <PremiumEmptyState
              icon="📖"
              title="لا توجد كتب منشورة حاليًا"
              description="عند نشر أول كتاب من لوحة الإدارة سيظهر هنا تلقائيًا."
              actionLabel="احجزي جلسة خاصة"
              actionHref="/booking"
            />
          ) : null}

          {!loading && !error && books.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {books.map((book, index) => (
                <BookCard
                  key={book.id}
                  book={book}
                  featured={index === 0}
                />
              ))}
            </div>
          ) : null}
        </section>
      </main>

      <Footer />
    </>
  )
}