'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import PremiumBadge from '@/components/ui/PremiumBadge'
import PremiumButton from '@/components/ui/PremiumButton'
import PremiumEmptyState from '@/components/ui/PremiumEmptyState'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'
import { formatArabicDate, formatEGP } from '@/lib/utils/formatters'
import type { Book, PublishStatus } from '@/types'

const statusFilters: { label: string; value: 'all' | PublishStatus }[] = [
  { label: 'كل الكتب', value: 'all' },
  { label: 'منشور', value: 'published' },
  { label: 'مسودة', value: 'draft' },
]

function getCreatedAtTime(book: Book) {
  if (!book.createdAt) return 0
  if (book.createdAt instanceof Date) return book.createdAt.getTime()
  if ('toDate' in book.createdAt) return book.createdAt.toDate().getTime()
  return 0
}

export default function AdminBooksPage() {
  const [loading, setLoading] = useState(true)
  const [books, setBooks] = useState<Book[]>([])
  const [activeStatus, setActiveStatus] = useState<'all' | PublishStatus>('all')
  const [updatingId, setUpdatingId] = useState('')
  const [deletingId, setDeletingId] = useState('')

  async function loadBooks() {
    setLoading(true)

    const booksSnap = await getDocs(collection(db, 'books'))

    const loadedBooks = booksSnap.docs.map((docItem) => ({
      id: docItem.id,
      ...docItem.data(),
    })) as Book[]

    loadedBooks.sort((a, b) => getCreatedAtTime(b) - getCreatedAtTime(a))

    setBooks(loadedBooks)
    setLoading(false)
  }

  useEffect(() => {
    loadBooks().catch((error) => {
      console.error('Admin books load error:', error)
      setLoading(false)
    })
  }, [])

  const filteredBooks = useMemo(() => {
    if (activeStatus === 'all') return books
    return books.filter((book) => book.status === activeStatus)
  }, [activeStatus, books])

  async function updateBookStatus(bookId: string, status: PublishStatus) {
    setUpdatingId(bookId)

    try {
      await updateDoc(doc(db, 'books', bookId), {
        status,
        updatedAt: serverTimestamp(),
      })

      setBooks((current) =>
        current.map((book) =>
          book.id === bookId
            ? {
                ...book,
                status,
              }
            : book,
        ),
      )
    } catch (error) {
      console.error('Update book status error:', error)
    } finally {
      setUpdatingId('')
    }
  }

  async function deleteBook(book: Book) {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف الكتاب "${book.title}"؟ هذا الحذف نهائي وقد يؤثر على طلبات مرتبطة به.`,
    )

    if (!confirmed) return

    setDeletingId(book.id)

    try {
      await deleteDoc(doc(db, 'books', book.id))
      setBooks((current) => current.filter((item) => item.id !== book.id))
    } catch (error) {
      console.error('Delete book error:', error)
    } finally {
      setDeletingId('')
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <PremiumSkeleton className="h-36" />
        <PremiumSkeleton className="h-36" />
        <PremiumSkeleton className="h-36" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-sm font-bold text-gold">إدارة الكتب</p>
          <h2 className="text-3xl font-black text-charcoal">الكتب الرقمية</h2>
          <p className="mt-3 max-w-2xl text-sm leading-8 text-warm-gray">
            من هنا يمكنك إضافة الكتب، تعديل بياناتها العامة، ونشرها أو تحويلها لمسودة.
          </p>
        </div>

        <PremiumButton href="/admin/books/new">إضافة كتاب جديد</PremiumButton>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {statusFilters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setActiveStatus(filter.value)}
            className={`rounded-full px-4 py-2 text-xs font-bold transition ${
              activeStatus === filter.value
                ? 'bg-petrol text-cream'
                : 'border border-sand bg-ivory text-warm-gray hover:text-petrol'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {filteredBooks.length === 0 ? (
        <PremiumEmptyState
          icon="📖"
          title="لا توجد كتب"
          description="ابدأ بإضافة أول كتاب من زر إضافة كتاب جديد."
          actionLabel="إضافة كتاب"
          actionHref="/admin/books/new"
        />
      ) : (
        <div className="space-y-4">
          {filteredBooks.map((book) => (
            <article
              key={book.id}
              className="rounded-3xl border border-sand bg-ivory p-5 shadow-soft"
            >
              <div className="grid gap-5 lg:grid-cols-[160px_1fr_220px] lg:items-center">
                <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-sand">
                  {book.coverImageUrl ? (
                    <Image
                      src={book.coverImageUrl}
                      alt={book.title}
                      fill
                      className="object-cover"
                      sizes="160px"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm font-bold text-warm-gray">
                      غلاف الكتاب
                    </div>
                  )}
                </div>

                <div>
                  <PremiumBadge variant={book.status === 'published' ? 'olive' : 'neutral'}>
                    {book.status === 'published' ? 'منشور' : 'مسودة'}
                  </PremiumBadge>

                  <h3 className="mt-4 text-xl font-black text-charcoal">{book.title}</h3>

                  <p className="mt-2 line-clamp-2 text-sm leading-7 text-warm-gray">
                    {book.shortDescription || book.description}
                  </p>

                  <div className="mt-4 grid gap-2 text-sm text-warm-gray sm:grid-cols-2">
                    <p>
                      السعر: <strong className="text-petrol">{formatEGP(book.price)}</strong>
                    </p>

                    <p>
                      الإنشاء:{' '}
                      <strong className="text-charcoal">{formatArabicDate(book.createdAt)}</strong>
                    </p>
                  </div>

                  <p className="mt-3 text-xs text-warm-gray" dir="ltr">
                    /books/{book.slug}
                  </p>
                </div>

                <div className="grid gap-2">
                  <PremiumButton href={`/admin/books/${book.id}`} size="sm" className="w-full">
                    تعديل
                  </PremiumButton>

                  <PremiumButton href={`/books/${book.slug}`} size="sm" variant="outline" className="w-full">
                    عرض
                  </PremiumButton>

                  {book.status === 'published' ? (
                    <PremiumButton
                      type="button"
                      size="sm"
                      variant="gold"
                      className="w-full"
                      disabled={updatingId === book.id}
                      onClick={() => updateBookStatus(book.id, 'draft')}
                    >
                      تحويل لمسودة
                    </PremiumButton>
                  ) : (
                    <PremiumButton
                      type="button"
                      size="sm"
                      variant="gold"
                      className="w-full"
                      disabled={updatingId === book.id}
                      onClick={() => updateBookStatus(book.id, 'published')}
                    >
                      نشر
                    </PremiumButton>
                  )}

                  <PremiumButton
                    type="button"
                    size="sm"
                    variant="danger"
                    className="w-full"
                    disabled={deletingId === book.id}
                    onClick={() => deleteBook(book)}
                  >
                    حذف
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