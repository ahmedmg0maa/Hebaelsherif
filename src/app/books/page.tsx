'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useMemo, useState } from 'react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import BookCard from '@/components/books/BookCard'
import BrandDivider from '@/components/brand/BrandDivider'
import BrandMark from '@/components/brand/BrandMark'
import ImageSlot from '@/components/ui/ImageSlot'
import PremiumBadge from '@/components/ui/PremiumBadge'
import PremiumButton from '@/components/ui/PremiumButton'
import PremiumEmptyState from '@/components/ui/PremiumEmptyState'
import PremiumSection from '@/components/ui/PremiumSection'
import { BookCardSkeleton } from '@/components/ui/PremiumSkeleton'
import { getPublishedBooks } from '@/lib/firestore/books'
import type { Book } from '@/types'

const sortOptions = [
  { label: 'الأحدث', value: 'newest' },
  { label: 'الأعلى تقييمًا', value: 'rating' },
  { label: 'الأقل سعرًا', value: 'price' },
] as const

type SortOption = (typeof sortOptions)[number]['value']

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState<SortOption>('newest')

  useEffect(() => {
    async function loadBooks() {
      try {
        setLoading(true)
        setError('')
        const publishedBooks = await getPublishedBooks()
        setBooks(publishedBooks)
      } catch (loadError) {
        console.error('Books page error:', loadError)
        setBooks([])
        setError('')
      } finally {
        setLoading(false)
      }
    }

    loadBooks()
  }, [])

  const categories = useMemo(() => {
    const unique = Array.from(new Set(books.map((book) => book.category).filter(Boolean))) as string[]
    return ['all', ...unique]
  }, [books])

  const featuredBook = books[0]

  const filteredBooks = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    const result = books.filter((book) => {
      const matchesSearch = normalizedSearch
        ? [book.title, book.shortDescription, book.description, book.emotionalPromise, book.category]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(normalizedSearch)
        : true

      const matchesCategory = category === 'all' || book.category === category

      return matchesSearch && matchesCategory
    })

    return [...result].sort((a, b) => {
      if (sort === 'rating') return Number(b.rating || 0) - Number(a.rating || 0)
      if (sort === 'price') return Number(a.price || 0) - Number(b.price || 0)
      return 0
    })
  }, [books, category, search, sort])

  return (
    <>
      <Navbar />

      <main className="min-h-screen pt-20">
        <section className="container-premium relative overflow-hidden py-16 lg:py-20">
          <div className="ambient-orb ambient-orb-gold left-8 top-10 h-56 w-56" />
          <div className="ambient-orb ambient-orb-petrol bottom-8 right-10 h-64 w-64" />

          <div className="relative grid gap-10 lg:grid-cols-[1fr_430px] lg:items-center">
            <div>
              <p className="mini-label mb-4">مكتبة هبة الشريف</p>
              <h1 className="text-balance text-4xl font-black leading-tight text-charcoal md:text-6xl">
                كتب رقمية هادئة تعيدك إلى صوتك الداخلي
              </h1>
              <p className="mt-6 max-w-2xl text-sm leading-8 text-warm-gray md:text-base">
                مكتبة مختارة بعناية لتكون رفيقة هادئة في رحلة الوعي، الحدود، التعافي، وفهم الذات. كل كتاب يفتح داخل حسابك بعد تأكيد الشراء.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <PremiumButton href="/booking">أحتاج ترشيحًا شخصيًا</PremiumButton>
                <PremiumButton href="/articles" variant="outline">اقرئي المقالات</PremiumButton>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[
                  ['قراءة واعية', 'ليست معلومات كثيرة؛ بل أسئلة دقيقة.'],
                  ['وصول محمي', 'يفتح الكتاب بعد تأكيد الطلب.'],
                  ['رحلة متدرجة', 'ابدئي من صفحة واحدة واكملي بهدوء.'],
                ].map(([title, text]) => (
                  <div key={title} className="rounded-3xl border border-sand bg-ivory/75 p-4 shadow-soft backdrop-blur-sm">
                    <p className="text-sm font-black text-petrol">{title}</p>
                    <p className="mt-2 text-xs leading-6 text-warm-gray">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <ImageSlot
                src={featuredBook?.coverImageUrl}
                ratio="book"
                variant="book"
                label="غلاف كتاب مميز"
                hint="تكوين بصري من هوية المكتبة"
                className="mx-auto max-w-[340px]"
                priority
              />
              <div className="absolute -bottom-5 left-4 right-4 rounded-[2rem] border border-gold/20 bg-ivory/90 p-5 text-center shadow-premium backdrop-blur-md">
                <BrandMark className="mx-auto mb-3" />
                <p className="text-sm font-black text-charcoal">مكتبة للقراءة التي لا تستهلكك؛ بل تعيدك إليك.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="container-premium pb-16">
          <div className="mb-8 rounded-[2rem] border border-sand bg-ivory/82 p-5 shadow-soft backdrop-blur-sm">
            <div className="grid gap-4 lg:grid-cols-[1fr_220px_220px]">
              <input
                className="premium-input"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ابحثي باسم الكتاب أو موضوعه..."
              />

              <select className="premium-input" value={category} onChange={(event) => setCategory(event.target.value)}>
                {categories.map((item) => (
                  <option key={item} value={item}>{item === 'all' ? 'كل التصنيفات' : item}</option>
                ))}
              </select>

              <select className="premium-input" value={sort} onChange={(event) => setSort(event.target.value as SortOption)}>
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <BookCardSkeleton />
              <BookCardSkeleton />
              <BookCardSkeleton />
              <BookCardSkeleton />
            </div>
          ) : null}

          {!loading && error ? (
            <PremiumEmptyState icon="❋" title="قريبًا" description="نجهّز إصدارات رقمية مختارة بعناية. يمكنكِ البدء من المقالات أو حجز جلسة ترشيح شخصية." actionLabel="اقرئي المقالات" actionHref="/articles" />
          ) : null}

          {!loading && !error && books.length === 0 ? (
            <PremiumEmptyState
              icon="📖"
              title="مكتبة هبة قيد التحضير"
              description="إصدارات رقمية مختارة بعناية للقراءة والتأمل ستتوفر بتجربة هادئة ومنظمة."
              actionLabel="اقرئي المقالات"
              actionHref="/articles"
            />
          ) : null}

          {!loading && !error && books.length > 0 ? (
            <PremiumSection title="الكتب المتاحة" eyebrow="مكتبة هادئة">
              <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-bold text-warm-gray">تم العثور على {filteredBooks.length} كتاب مناسب.</p>
                <div className="flex flex-wrap gap-2">
                  <PremiumBadge variant="gold">وصول محمي</PremiumBadge>
                  <PremiumBadge variant="olive">قراءة هادئة</PremiumBadge>
                </div>
              </div>

              {filteredBooks.length > 0 ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {filteredBooks.map((book, index) => <BookCard key={book.id} book={book} featured={book.id === featuredBook?.id || index === 0} />)}
                </div>
              ) : (
                <PremiumEmptyState
                  title="لا توجد نتائج بهذا الاختيار"
                  description="جرّبي كلمة بحث أخرى أو اختاري كل التصنيفات."
                  actionLabel="مسح البحث"
                  actionHref="/books"
                />
              )}
            </PremiumSection>
          ) : null}

          <div className="mt-16 rounded-[2rem] border border-sand bg-petrol on-dark p-8 text-cream shadow-premium md:p-10">
            <BrandDivider className="mb-5 text-gold" />
            <div className="grid gap-8 lg:grid-cols-[1fr_320px] lg:items-center">
              <div>
                <p className="mini-label mb-3 text-gold">لا تعرفين من أين تبدأين؟</p>
                <h2 className="text-3xl font-black md:text-4xl">اختاري الكتاب حسب المرحلة، لا حسب العنوان فقط.</h2>
                <p className="mt-4 max-w-2xl text-sm leading-8 text-cream/75">
                  لو كنتِ بين أكثر من اتجاه، ابدئي بجلسة قصيرة أو استخدمي دليل البداية لتحديد المسار الأقرب لكِ.
                </p>
              </div>
              <PremiumButton href="/booking" variant="gold" className="w-full">احجزي جلسة ترشيح</PremiumButton>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
