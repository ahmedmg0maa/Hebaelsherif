'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import PremiumButton from '@/components/ui/PremiumButton'
import PremiumEmptyState from '@/components/ui/PremiumEmptyState'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'
import ProtectedContentNotice from '@/components/ui/ProtectedContentNotice'
import ContentProtection from '@/components/security/ContentProtection'
import { useAuth } from '@/hooks/useAuth'
import { getBookBySlug } from '@/lib/firestore/books'
import type { Book } from '@/types'
import type { User as FirebaseUser } from 'firebase/auth'

interface VerifyAccessResponse {
  hasAccess: boolean
  contentUrl?: string
  resourceUrl?: string
  error?: string
}

export default function BookReadPage() {
  const params = useParams<{ slug: string }>()
  const slug = params.slug
  const router = useRouter()

  const { user, firebaseUser, loading: authLoading } = useAuth()

  const [book, setBook] = useState<Book | null>(null)
  const [contentUrl, setContentUrl] = useState('')
  const [resourceUrl, setResourceUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (authLoading) return

    if (!user || !firebaseUser) {
      router.push(`/auth/login?next=${encodeURIComponent(`/books/${slug}/read`)}`)
      return
    }

    async function loadProtectedBook(authUser: FirebaseUser) {
      try {
        setLoading(true)
        setAccessDenied(false)
        setError('')

        const bookData = await getBookBySlug(slug)

        if (!bookData) {
          setBook(null)
          return
        }

        const token = await authUser.getIdToken()

        const accessResponse = await fetch('/api/verify-access', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            productId: bookData.id,
            productType: 'book',
          }),
        })

        const accessData = (await accessResponse.json()) as VerifyAccessResponse

        if (!accessResponse.ok || !accessData.hasAccess) {
          setBook(bookData)
          setAccessDenied(true)
          setError(accessData.error || 'لا يوجد وصول لهذا المحتوى.')
          return
        }

        setBook(bookData)
        setContentUrl(accessData.contentUrl || '')
        setResourceUrl(accessData.resourceUrl || '')
      } catch (loadError) {
        console.error('Book read load error:', loadError)
        setError('تعذر تحميل محتوى الكتاب الآن.')
      } finally {
        setLoading(false)
      }
    }

    loadProtectedBook(firebaseUser)
  }, [authLoading, firebaseUser, router, slug, user])

  if (authLoading || loading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-20">
          <section className="container-premium py-12">
            <PremiumSkeleton className="mb-6 h-10 w-72" />
            <PremiumSkeleton className="h-[620px]" />
          </section>
        </main>
        <Footer />
      </>
    )
  }

  if (!book) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-20">
          <section className="container-premium py-12">
            <PremiumEmptyState
              icon="📖"
              title="الكتاب غير موجود"
              description="قد يكون الكتاب غير منشور أو تم تغيير الرابط."
              actionLabel="عرض الكتب"
              actionHref="/books"
            />
          </section>
        </main>
        <Footer />
      </>
    )
  }

  if (accessDenied) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen pt-20">
          <ProtectedContentNotice
            productTitle={book.title}
            productType="book"
            description={error}
            purchaseHref={`/books/${book.slug}`}
            backHref="/dashboard/books"
          />
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen pt-20">
        <section className="border-b border-sand bg-ivory/60">
          <div className="container-premium py-10">
            <Link
              href="/dashboard/books"
              className="mb-4 inline-block text-sm font-bold text-warm-gray transition hover:text-petrol"
            >
              ← العودة لكتبي
            </Link>

            <h1 className="text-4xl font-black leading-tight text-petrol">{book.title}</h1>

            <p className="mt-4 max-w-2xl text-sm leading-8 text-warm-gray">
              الكتاب متاح لكِ الآن بعد تأكيد الوصول.
            </p>
          </div>
        </section>

        <section className="container-premium py-10">
          <div className="rounded-[2rem] border border-sand bg-ivory p-5 shadow-soft">
            <ContentProtection userLabel={user?.email || user?.uid || 'حساب خاص'} productTitle={book.title} className="border border-sand bg-cream">
              {contentUrl ? (
                <iframe
                  src={contentUrl}
                  title={book.title}
                  className="h-[720px] w-full rounded-[2rem]"
                  allow="fullscreen"
                />
              ) : (
                <div className="flex h-[520px] items-center justify-center text-sm font-bold text-warm-gray">
                  رابط الكتاب غير متاح حاليًا.
                </div>
              )}
            </ContentProtection>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              {resourceUrl ? (
                <PremiumButton href={resourceUrl} variant="outline">
                  فتح المرفقات
                </PremiumButton>
              ) : null}
              <p className="rounded-2xl border border-sand bg-cream px-4 py-3 text-xs font-bold leading-6 text-warm-gray">
                الوصول لهذا المحتوى شخصي ومحمي، ولا يتم عرض الرابط المباشر حفاظًا على حقوق الملكية.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}