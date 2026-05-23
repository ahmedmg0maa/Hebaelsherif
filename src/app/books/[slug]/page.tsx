'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import PremiumBadge from '@/components/ui/PremiumBadge'
import PremiumEmptyState from '@/components/ui/PremiumEmptyState'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'
import PurchaseRequestButton from '@/components/products/PurchaseRequestButton'
import { getBookBySlug } from '@/lib/firestore/books'
import { formatEGP } from '@/lib/utils/formatters'
import type { Book } from '@/types'

export default function BookDetailsPage() {
  const params = useParams<{ slug: string }>()
  const slug = params.slug

  const [book, setBook] = useState<Book | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!slug) return

    async function loadBook() {
      try {
        setLoading(true)
        setError('')

        const bookData = await getBookBySlug(slug)
        setBook(bookData)
      } catch (loadError) {
        console.error('Book details error:', loadError)
        setError('تعذر تحميل بيانات الكتاب الآن. حاولي مرة أخرى لاحقًا.')
      } finally {
        setLoading(false)
      }
    }

    loadBook()
  }, [slug])

  return (
    <>
      <Navbar />

      <main className="min-h-screen pt-20">
        {loading ? (
          <section className="container-premium py-12">
            <PremiumSkeleton className="mb-8 h-96" />
            <PremiumSkeleton className="mb-4 h-10 w-72" />
            <PremiumSkeleton className="h-5 w-full max-w-2xl" />
          </section>
        ) : null}

        {!loading && error ? (
          <section className="container-premium py-12">
            <PremiumEmptyState
              icon="!"
              title="حدث خطأ"
              description={error}
              actionLabel="العودة للكتب"
              actionHref="/books"
            />
          </section>
        ) : null}

        {!loading && !error && !book ? (
          <section className="container-premium py-12">
            <PremiumEmptyState
              icon="📖"
              title="الكتاب غير موجود"
              description="قد يكون الكتاب غير منشور أو تم تغيير الرابط."
              actionLabel="عرض كل الكتب"
              actionHref="/books"
            />
          </section>
        ) : null}

        {!loading && !error && book ? (
          <>
            <section className="border-b border-sand bg-ivory/60">
              <div className="container-premium grid gap-10 py-12 lg:grid-cols-[1fr_420px] lg:items-center">
                <div>
                  <PremiumBadge variant="olive">كتاب رقمي</PremiumBadge>

                  <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight text-petrol md:text-6xl">
                    {book.title}
                  </h1>

                  <p className="mt-6 max-w-2xl text-base leading-9 text-warm-gray">
                    {book.emotionalPromise || book.shortDescription || book.description}
                  </p>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <span className="rounded-full border border-sand bg-cream px-5 py-2 text-sm font-bold text-charcoal">
                      كتاب رقمي
                    </span>

                    <span className="rounded-full border border-gold/20 bg-gold/10 px-5 py-2 text-sm font-bold text-gold">
                      {formatEGP(book.price)}
                    </span>
                  </div>
                </div>

                <div className="mx-auto w-full max-w-sm overflow-hidden rounded-[2rem] border border-sand bg-sand shadow-premium">
                  <div className="relative aspect-[3/4]">
                    {book.coverImageUrl ? (
                      <Image
                        src={book.coverImageUrl}
                        alt={book.title}
                        fill
                        priority
                        className="object-cover"
                        sizes="(max-width: 1024px) 100vw, 380px"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-cream text-warm-gray">
                        غلاف الكتاب
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="container-premium grid gap-8 py-12 lg:grid-cols-[1fr_380px]">
              <div className="space-y-8">
                <article className="rounded-3xl border border-sand bg-ivory p-7 shadow-soft">
                  <h2 className="text-2xl font-black text-charcoal">عن هذا الكتاب</h2>

                  <p className="mt-5 whitespace-pre-line text-sm leading-8 text-warm-gray">
                    {book.description}
                  </p>
                </article>

                {book.emotionalPromise ? (
                  <article className="rounded-3xl border border-sand bg-ivory p-7 shadow-soft">
                    <h2 className="text-2xl font-black text-charcoal">وعد الكتاب</h2>

                    <p className="mt-5 text-sm leading-8 text-warm-gray">
                      {book.emotionalPromise}
                    </p>
                  </article>
                ) : null}

                <article className="rounded-3xl border border-sand bg-ivory p-7 shadow-soft">
                  <h2 className="text-2xl font-black text-charcoal">ماذا يحدث بعد الشراء؟</h2>

                  <div className="mt-5 grid gap-3">
                    <div className="rounded-2xl border border-sand bg-cream px-5 py-4">
                      <strong className="block text-sm text-charcoal">1. إرسال طلب الشراء</strong>
                      <p className="mt-2 text-sm leading-7 text-warm-gray">
                        يتم إنشاء طلب داخل حسابك بحالة بانتظار التأكيد.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-sand bg-cream px-5 py-4">
                      <strong className="block text-sm text-charcoal">2. تأكيد الإدارة</strong>
                      <p className="mt-2 text-sm leading-7 text-warm-gray">
                        بعد تأكيد الدفع من لوحة الإدارة، يتحول الطلب إلى مدفوع.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-sand bg-cream px-5 py-4">
                      <strong className="block text-sm text-charcoal">3. فتح الوصول</strong>
                      <p className="mt-2 text-sm leading-7 text-warm-gray">
                        يظهر الكتاب داخل لوحة حسابك ويمكنك فتحه من صفحة الكتب الخاصة بك.
                      </p>
                    </div>
                  </div>
                </article>
              </div>

              <aside className="h-fit rounded-3xl border border-sand bg-ivory p-6 shadow-premium lg:sticky lg:top-28">
                <p className="text-sm font-bold text-gold">سعر الكتاب</p>

                <strong className="mt-3 block text-4xl font-black text-petrol">
                  {formatEGP(book.price)}
                </strong>

                <p className="mt-4 text-sm leading-7 text-warm-gray">
                  بعد إرسال طلب الشراء، ستظهر حالته داخل لوحة المستخدم. عند تأكيد الدفع من الإدارة
                  يتم فتح الكتاب تلقائيًا.
                </p>

                <PurchaseRequestButton
                  productId={book.id}
                  productType="book"
                  currentPath={`/books/${book.slug}`}
                  paidRedirectHref={`/books/${book.slug}/read`}
                  className="mt-6"
                />
              </aside>
            </section>
          </>
        ) : null}
      </main>

      <Footer />
    </>
  )
}