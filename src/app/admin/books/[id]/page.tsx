'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  setDoc,
  where,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import PremiumEmptyState from '@/components/ui/PremiumEmptyState'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'
import type { Book } from '@/types'
import BookForm, { BookFormValues } from '../_components/BookForm'

export default function EditBookPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const bookId = params.id

  const [loading, setLoading] = useState(true)
  const [book, setBook] = useState<Book | null>(null)
  const [protectedContentUrl, setProtectedContentUrl] = useState('')

  useEffect(() => {
    if (!bookId) return

    async function loadBook() {
      setLoading(true)

      const [bookSnap, protectedSnap] = await Promise.all([
        getDoc(doc(db, 'books', bookId)),
        getDoc(doc(db, 'protected_content', `book_${bookId}`)),
      ])

      if (!bookSnap.exists()) {
        setBook(null)
        setLoading(false)
        return
      }

      setBook({
        id: bookSnap.id,
        ...bookSnap.data(),
      } as Book)
      setProtectedContentUrl(protectedSnap.exists() ? String(protectedSnap.data().contentUrl || '') : '')

      setLoading(false)
    }

    loadBook().catch((error) => {
      console.error('Edit book load error:', error)
      setLoading(false)
    })
  }, [bookId])

  async function handleUpdateBook(values: BookFormValues) {
    const duplicateSlugSnap = await getDocs(
      query(collection(db, 'books'), where('slug', '==', values.slug)),
    )

    const duplicateDoc = duplicateSlugSnap.docs.find((docItem) => docItem.id !== bookId)

    if (duplicateDoc) {
      throw new Error('Slug already exists')
    }

    const { driveFileUrl, ...bookValues } = values

    await updateDoc(doc(db, 'books', bookId), {
      ...bookValues,
      updatedAt: serverTimestamp(),
    })

    if (driveFileUrl) {
      await setDoc(doc(db, 'protected_content', `book_${bookId}`), {
        productId: bookId,
        productType: 'book',
        contentUrl: driveFileUrl,
        updatedAt: serverTimestamp(),
      }, { merge: true })
    }

    router.push('/admin/books')
    router.refresh()
  }

  if (loading) {
    return (
      <div>
        <PremiumSkeleton className="mb-8 h-10 w-72" />
        <PremiumSkeleton className="h-[640px]" />
      </div>
    )
  }

  if (!book) {
    return (
      <PremiumEmptyState
        icon="📖"
        title="الكتاب غير موجود"
        description="قد يكون الكتاب حُذف أو أن الرابط غير صحيح."
        actionLabel="العودة للكتب"
        actionHref="/admin/books"
      />
    )
  }

  return (
    <div>
      <div className="mb-8">
        <p className="mb-2 text-sm font-bold text-gold">تعديل كتاب</p>
        <h2 className="text-3xl font-black text-charcoal">{book.title}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-8 text-warm-gray">
          عدل بيانات الكتاب العامة التي تظهر في صفحة الكتاب وقائمة الكتب.
        </p>
      </div>

      <BookForm
        submitLabel="حفظ التعديلات"
        initialValues={{
          title: book.title,
          slug: book.slug,
          description: book.description,
          shortDescription: book.shortDescription,
          emotionalPromise: book.emotionalPromise,
          price: book.price,
          status: book.status,
          coverImageUrl: book.coverImageUrl,
          driveFileUrl: protectedContentUrl,
          pagesCount: book.pagesCount,
        }}
        onSubmit={handleUpdateBook}
      />
    </div>
  )
}