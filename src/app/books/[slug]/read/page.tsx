'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { collection, getDocs, limit, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import { useAuth } from '@/hooks/useAuth'
import type { Book } from '@/types'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import PremiumEmptyState from '@/components/ui/PremiumEmptyState'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'
import PremiumButton from '@/components/ui/PremiumButton'
import PremiumBadge from '@/components/ui/PremiumBadge'
import BrandMark from '@/components/brand/BrandMark'
import { trackConversionEvent } from '@/lib/marketing/events'

export default function BookReaderPage() {
  const params = useParams<{ slug: string }>()
  const slug = decodeURIComponent(params.slug || '')
  const { firebaseUser, loading: authLoading } = useAuth()
  const [book, setBook] = useState<Book | null>(null)
  const [contentUrl, setContentUrl] = useState('')
  const [resourceUrl, setResourceUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    async function load() {
      if (authLoading) return
      setLoading(true)
      setError('')
      try {
        const bookSnap = await getDocs(query(collection(db, 'books'), where('slug', '==', slug), limit(1)))
        if (bookSnap.empty) {
          if (mounted) setBook(null)
          return
        }
        const nextBook = { id: bookSnap.docs[0].id, ...(bookSnap.docs[0].data() as Record<string, unknown>) } as Book
        if (mounted) setBook(nextBook)

        if (!firebaseUser) {
          if (mounted) setError('يجب تسجيل الدخول لفتح الكتاب.')
          return
        }
        const token = await firebaseUser.getIdToken()
        const response = await fetch('/api/verify-access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ productId: nextBook.id, productType: 'book' }),
        })
        const data = (await response.json()) as { hasAccess?: boolean; contentUrl?: string; resourceUrl?: string; error?: string }
        if (!response.ok || !data.hasAccess) {
          if (mounted) setError(data.error || 'لا يوجد وصول لهذا الكتاب.')
          return
        }
        if (mounted) {
          setContentUrl(data.contentUrl || '')
          setResourceUrl(data.resourceUrl || '')
          trackConversionEvent({ name: 'access_content', source: 'book_reader', metadata: { productId: nextBook.id, slug } })
        }
      } catch (loadError) {
        console.error('Book reader load error:', loadError)
        if (mounted) setError('مساحة القراءة غير متاحة الآن. أعيدي المحاولة بعد قليل أو راجعي حالة الطلب من لوحة حسابك.')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [authLoading, firebaseUser, slug])

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20">
        {loading ? <section className="container-premium py-12"><PremiumSkeleton className="h-[30rem]" /></section> : null}

        {!loading && (!book || error) ? (
          <section className="container-premium py-12">
            <PremiumEmptyState
              icon="◇"
              title={book ? 'مساحة القراءة غير متاحة الآن' : 'الكتاب غير موجود'}
              description={error || 'قد يكون الكتاب غير منشور أو تم تغيير الرابط.'}
              actionLabel={firebaseUser ? 'العودة لكتبي' : 'تسجيل الدخول'}
              actionHref={firebaseUser ? '/dashboard/books' : `/auth/login?next=${encodeURIComponent(`/books/${slug}/read`)}`}
            />
          </section>
        ) : null}

        {!loading && book && !error ? (
          <section className="container-premium py-10">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="mini-label">مكتبة محمية</p>
                <h1 className="brand-title mt-2 text-3xl font-black text-petrol md:text-5xl">{book.title}</h1>
                <p className="mt-3 max-w-2xl text-sm font-bold leading-7 text-warm-gray">تجربة قراءة خاصة داخل حسابك. لا تشاركي روابط الوصول المدفوع.</p>
              </div>
              <PremiumButton href="/dashboard/books" variant="outline">كتبي</PremiumButton>
            </div>

            <article className="rounded-[2rem] border border-sand bg-ivory p-6 shadow-premium dark:border-gold/25 dark:bg-white/10">
              <div className="flex flex-wrap items-center gap-2">
                <PremiumBadge variant="gold">كتاب مدفوع</PremiumBadge>
                <PremiumBadge variant="petrol">وصول محمي</PremiumBadge>
              </div>
              <div className="mt-8 grid gap-8 lg:grid-cols-[300px_1fr]">
                <div className="rounded-[2rem] border border-gold/20 bg-gold/10 p-6 text-center">
                  <BrandMark className="mx-auto" />
                  <h2 className="mt-5 text-xl font-black text-charcoal dark:text-ivory">مساحة القراءة</h2>
                  <p className="mt-3 text-sm font-bold leading-7 text-warm-gray dark:text-cream">يمكنك فتح الكتاب أو ملف القراءة من الرابط المحمي بعد التحقق من الطلب.</p>
                </div>
                <div>
                  <h2 className="text-2xl font-black text-charcoal dark:text-ivory">ابدئي القراءة بهدوء</h2>
                  <p className="mt-4 text-sm font-bold leading-8 text-warm-gray dark:text-cream">احتفظي بوقت خاص للقراءة، واكتبي الملاحظات المهمة بعيدًا عن مشاركة أو إعادة نشر المحتوى.</p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    {contentUrl ? <PremiumButton href={contentUrl} variant="primary" target="_blank">فتح الكتاب</PremiumButton> : null}
                    {resourceUrl ? <PremiumButton href={resourceUrl} variant="outline" target="_blank">مرفقات إضافية</PremiumButton> : null}
                  </div>
                </div>
              </div>
            </article>
          </section>
        ) : null}
      </main>
      <Footer />
    </>
  )
}
