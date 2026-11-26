'use client'

import { useMemo, useState } from 'react'
import type { CatalogBook } from '@/lib/data/catalog'
import { ProductCard } from './ProductCard'
import { normalizeArabicSearch } from '@/lib/search/normalize'

export function BookLibrary({ books }: { books: CatalogBook[] }) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('featured')

  const filtered = useMemo(() => {
    const normalized = normalizeArabicSearch(query)
    const result = books.filter((book) => !normalized || normalizeArabicSearch(`${book.title} ${book.subtitle} ${book.description}`).includes(normalized))
    return [...result].sort((a, b) => {
      if (sort === 'price-low') return a.price - b.price
      if (sort === 'price-high') return b.price - a.price
      if (sort === 'pages') return (b.pagesCount ?? 0) - (a.pagesCount ?? 0)
      return 0
    })
  }, [books, query, sort])

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 grid gap-3 rounded-2xl border border-line bg-surface-raised p-4 shadow-card sm:grid-cols-[1fr_220px]">
        <label>
          <span className="sr-only">البحث في الكتب</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحثي باسم الكتاب أو موضوعه…" className="min-h-12 w-full rounded-xl border border-line bg-ivory px-4 text-base text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt" />
        </label>
        <label>
          <span className="sr-only">ترتيب الكتب</span>
          <select value={sort} onChange={(event) => setSort(event.target.value)} className="min-h-12 w-full rounded-xl border border-line bg-ivory px-4 text-base text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt">
            <option value="featured">الترتيب المقترح</option>
            <option value="price-low">السعر: الأقل أولًا</option>
            <option value="price-high">السعر: الأعلى أولًا</option>
            <option value="pages">الأكثر صفحات</option>
          </select>
        </label>
      </div>
      <p role="status" className="mb-4 text-sm text-text-soft">{filtered.length.toLocaleString('ar-EG')} نتيجة</p>
    {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface-raised p-10 text-center text-text-soft">لا توجد كتب مطابقة لهذا البحث.<button type="button" className="mx-auto mt-4 block min-h-12 font-bold text-deep-teal underline" onClick={() => { setQuery(''); setSort('featured') }}>إعادة ضبط البحث والتصفية</button></div>
      ) : (
        <div className="grid gap-8 md:grid-cols-2">
          {filtered.map((book) => (
            <ProductCard
              key={book.slug}
              href={`/books/${book.slug}`}
              title={book.title}
              subtitle={book.subtitle}
              description={book.description}
              price={book.price}
              compareAtPrice={book.compareAtPrice}
              coverKind="book"
              coverUrl={book.coverUrl}
              badge={book.isPreviewExperience ? { label: 'كتاب تجربة', tone: 'cobalt' } : book.compareAtPrice ? { label: 'سعر مخفّض', tone: 'burgundy' } : undefined}
              meta={[book.pagesCount ? `${book.pagesCount.toLocaleString('ar-EG')} صفحة` : 'كتاب رقمي', book.isPreviewExperience ? 'خمسة فصول قابلة للقراءة' : 'يظهر بعد تأكيد الدفع', book.isPreviewExperience ? 'لا ينشئ شراءً' : 'محفوظ داخل حسابك']}
              priceLabel={book.isPreviewExperience ? 'قراءة مجانية' : undefined}
              ctaLabel={book.isPreviewExperience ? 'افتحي الكتاب' : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}
