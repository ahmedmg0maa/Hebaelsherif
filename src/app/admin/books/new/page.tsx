'use client'

export const dynamic = 'force-dynamic'
import { useRouter } from 'next/navigation'
import { addDoc, collection, doc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import BookForm, { BookFormValues } from '../_components/BookForm'

export default function NewBookPage() {
  const router = useRouter()

  async function handleCreateBook(values: BookFormValues) {
    const duplicateSlugSnap = await getDocs(
      query(collection(db, 'books'), where('slug', '==', values.slug)),
    )

    if (!duplicateSlugSnap.empty) {
      throw new Error('Slug already exists')
    }

    const { driveFileUrl, ...bookValues } = values

    const bookRef = await addDoc(collection(db, 'books'), {
      ...bookValues,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    if (driveFileUrl) {
      await setDoc(doc(db, 'protected_content', `book_${bookRef.id}`), {
        productId: bookRef.id,
        productType: 'book',
        contentUrl: driveFileUrl,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    }

    router.push('/admin/books')
    router.refresh()
  }

  return (
    <div>
      <div className="mb-8">
        <p className="mb-2 text-sm font-bold text-gold">إضافة كتاب</p>
        <h2 className="text-3xl font-black text-charcoal">إنشاء كتاب جديد</h2>
        <p className="mt-3 max-w-2xl text-sm leading-8 text-warm-gray">
          أضيفي بيانات الكتاب العامة التي تظهر في صفحات الزوار. رابط ملف الكتاب نفسه سيتم إدارته
          من نظام المحتوى المحمي عند اكتمال الإعداد.
        </p>
      </div>

      <BookForm submitLabel="حفظ الكتاب" onSubmit={handleCreateBook} />
    </div>
  )
}