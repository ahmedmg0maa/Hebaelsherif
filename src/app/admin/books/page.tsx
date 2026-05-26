'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { addDoc, collection, doc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import type { Book } from '@/types'
import { formatArabicDateTime, formatEGP, formatNumber } from '@/lib/utils/formatters'
import { getReadiness, hasPrivateContentLeak, isPublishedProduct, productStatusMeta, toMillis } from '@/lib/admin/operations'
import { AdminActionButton, AdminPageHeader, AdminPanel, EmptyState, Field, inputClass, MetricCard, ProgressBar, StatusBadge, ToneBadge } from '@/components/admin/OperationsUI'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'

interface BookItem extends Book {
  isPublished?: boolean
  seoTitle?: string
  seoDescription?: string
}

function mapDocs<T>(snapshot: Awaited<ReturnType<typeof getDocs>>) {
  return snapshot.docs.map((docItem) => ({ id: docItem.id, ...(docItem.data() as Record<string, unknown>) })) as T[]
}

export default function AdminBooksPage() {
  const [books, setBooks] = useState<BookItem[]>([])
  const [protectedItems, setProtectedItems] = useState<Array<Record<string, unknown>>>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [booksSnap, protectedSnap] = await Promise.all([
        getDocs(collection(db, 'books')),
        getDocs(collection(db, 'protected_content')),
      ])
      setBooks(mapDocs<BookItem>(booksSnap).sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt)))
      setProtectedItems(mapDocs<Record<string, unknown>>(protectedSnap))
    } catch (loadError) {
      console.error('Admin books load error:', loadError)
      setError('تعذر تحميل الكتب. راجع صلاحيات الأدمن واتصال Firebase.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function writeLog(action: string, book: BookItem, after: Record<string, unknown>) {
    try {
      await addDoc(collection(db, 'admin_logs'), {
        action,
        targetType: 'books',
        targetId: book.id,
        before: { status: book.status },
        after,
        message: `${action} - ${book.title || book.slug}`,
        createdAt: serverTimestamp(),
      })
    } catch (logError) {
      console.warn('Book log failed:', logError)
    }
  }

  async function updateBook(book: BookItem, action: string, values: Record<string, unknown>, confirmMessage: string) {
    if (!window.confirm(confirmMessage)) return
    setSavingId(book.id)
    setMessage('')
    setError('')
    try {
      const nextValues = { ...values, updatedAt: serverTimestamp() }
      await updateDoc(doc(db, 'books', book.id), nextValues)
      await writeLog(action, book, nextValues)
      setBooks((current) => current.map((item) => (item.id === book.id ? ({ ...item, ...values } as BookItem) : item)))
      setMessage('تم تحديث الكتاب بنجاح.')
    } catch (updateError) {
      console.error('Book update error:', updateError)
      setError('تعذر تحديث الكتاب. تأكد من الصلاحيات وحاول مرة أخرى.')
    } finally {
      setSavingId('')
    }
  }

  function publishBook(book: BookItem) {
    const readiness = getReadiness('book', book, protectedItems)
    if (readiness.score < 100) {
      const ok = window.confirm(`جاهزية النشر ${readiness.score}%. الناقص: ${readiness.missing.join('، ')}. هل تريد المتابعة رغم ذلك؟`)
      if (!ok) return
    }
    updateBook(book, 'book_published', { status: 'published', isPublished: true, publishedAt: serverTimestamp() }, 'نشر هذا الكتاب؟')
  }

  const filteredBooks = useMemo(() => {
    const queryText = search.trim().toLowerCase()
    return books.filter((book) => {
      const matchesStatus = statusFilter === 'all' || book.status === statusFilter
      const haystack = [book.title, book.slug, book.description, book.category].filter(Boolean).join(' ').toLowerCase()
      return matchesStatus && (!queryText || haystack.includes(queryText))
    })
  }, [books, search, statusFilter])

  const stats = useMemo(() => ({
    total: books.length,
    published: books.filter(isPublishedProduct).length,
    draft: books.filter((book) => book.status === 'draft').length,
    comingSoon: books.filter((book) => book.status === 'coming_soon').length,
    leaked: books.filter((book) => hasPrivateContentLeak(book as unknown as Record<string, unknown>)).length,
    needsContent: books.filter((book) => isPublishedProduct(book) && getReadiness('book', book, protectedItems).missing.includes('محتوى محمي مربوط')).length,
  }), [books, protectedItems])

  if (loading) return <PremiumSkeleton className="h-[32rem]" />

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="محرك نشر الكتب"
        description="إدارة الكتب كمنتجات حقيقية: مسودات، قريبًا، نشر آمن، جاهزية، وربط ملف محمي بدون روابط خاصة عامة."
        actions={<Link href="/admin/books/new" className="rounded-full bg-gold px-5 py-3 text-xs font-black text-deepTeal shadow-soft">إضافة كتاب</Link>}
      />

      {message ? <div className="rounded-2xl border border-olive/25 bg-olive/10 p-4 text-sm font-black text-olive dark:text-ivory">{message}</div> : null}
      {error ? <div className="rounded-2xl border border-burgundy/25 bg-burgundy/10 p-4 text-sm font-black text-burgundy dark:text-ivory">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard label="كل الكتب" value={formatNumber(stats.total)} tone="muted" />
        <MetricCard label="منشورة" value={formatNumber(stats.published)} tone="success" />
        <MetricCard label="مسودات" value={formatNumber(stats.draft)} tone="muted" />
        <MetricCard label="قريبًا" value={formatNumber(stats.comingSoon)} tone="gold" />
        <MetricCard label="تحتاج محتوى محمي" value={formatNumber(stats.needsContent)} tone={stats.needsContent ? 'danger' : 'success'} />
        <MetricCard label="روابط خاصة عامة" value={formatNumber(stats.leaked)} tone={stats.leaked ? 'danger' : 'success'} />
      </div>

      <AdminPanel title="فلترة الكتب" description="تابع حالة النشر والجاهزية قبل الظهور للزائرات.">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="الحالة">
            <select className={inputClass} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">كل الحالات</option>
              <option value="draft">مسودة</option>
              <option value="review">مراجعة</option>
              <option value="coming_soon">قريبًا</option>
              <option value="published">منشور</option>
              <option value="hidden">مخفي</option>
              <option value="archived">مؤرشف</option>
            </select>
          </Field>
          <div className="md:col-span-2">
            <Field label="بحث">
              <input className={inputClass} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="اسم الكتاب، slug، التصنيف..." />
            </Field>
          </div>
        </div>
      </AdminPanel>

      <AdminPanel title="قائمة الكتب" description="كل كتاب له جاهزية نشر واضحة قبل أن يصبح ظاهرًا ومتاحًا للبيع.">
        {filteredBooks.length === 0 ? (
          <EmptyState title="لا توجد كتب مطابقة" description="أضيفي كتاب كمسودة، ثم راجعي جاهزيته واربطى المحتوى المحمي قبل النشر." action={<Link href="/admin/books/new" className="rounded-full bg-gold px-5 py-3 text-xs font-black text-deepTeal">إضافة كتاب</Link>} />
        ) : (
          <div className="grid gap-5 xl:grid-cols-2">
            {filteredBooks.map((book) => {
              const readiness = getReadiness('book', book, protectedItems)
              const leaked = hasPrivateContentLeak(book as unknown as Record<string, unknown>)
              return (
                <article key={book.id} className="rounded-[1.75rem] border border-sand bg-cream/80 p-5 shadow-soft dark:border-gold/25 dark:bg-white/10">
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-black text-charcoal dark:text-ivory">{book.title || 'كتاب بدون عنوان'}</h3>
                    <StatusBadge meta={productStatusMeta[String(book.status || 'draft')]} fallback={String(book.status || 'draft')} />
                    {leaked ? <ToneBadge tone="danger">روابط خاصة عامة</ToneBadge> : <ToneBadge tone="success">لا روابط خاصة عامة</ToneBadge>}
                  </div>
                  <p className="line-clamp-2 text-sm font-bold leading-7 text-warm-gray dark:text-cream">{book.description || 'لا يوجد وصف بعد.'}</p>
                  <div className="mt-4 grid gap-3 text-sm font-bold text-warm-gray dark:text-cream md:grid-cols-2">
                    <p>السعر: <span className="text-charcoal dark:text-ivory">{book.price ? formatEGP(book.price) : 'غير محدد'}</span></p>
                    <p>slug: <span className="text-charcoal dark:text-ivory">{book.slug || 'غير محدد'}</span></p>
                    <p>آخر تحديث: <span className="text-charcoal dark:text-ivory">{formatArabicDateTime(book.updatedAt || book.createdAt)}</span></p>
                    <p>الصفحات: <span className="text-charcoal dark:text-ivory">{book.pagesCount || 0}</span></p>
                  </div>
                  <div className="mt-5 rounded-2xl border border-sand bg-ivory/80 p-4 dark:border-gold/25 dark:bg-deepTeal/60">
                    <div className="mb-2 flex items-center justify-between text-xs font-black text-petrol dark:text-gold">
                      <span>جاهزية النشر</span>
                      <span>{readiness.score}%</span>
                    </div>
                    <ProgressBar value={readiness.score} />
                    {readiness.missing.length ? <p className="mt-3 text-xs font-bold text-burgundy dark:text-gold">الناقص: {readiness.missing.join('، ')}</p> : <p className="mt-3 text-xs font-bold text-olive dark:text-ivory">جاهز تشغيليًا.</p>}
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link href={`/admin/books/${book.id}`} className="rounded-full border border-gold/35 px-4 py-2 text-xs font-black text-petrol dark:text-gold">تعديل</Link>
                    <AdminActionButton disabled={savingId === book.id} tone="success" onClick={() => publishBook(book)}>نشر</AdminActionButton>
                    <AdminActionButton disabled={savingId === book.id} tone="gold" onClick={() => updateBook(book, 'book_coming_soon', { status: 'coming_soon', isPublished: false }, 'تحويل الكتاب إلى قريبًا؟')}>قريبًا</AdminActionButton>
                    <AdminActionButton disabled={savingId === book.id} tone="muted" onClick={() => updateBook(book, 'book_hidden', { status: 'hidden', isPublished: false }, 'إخفاء الكتاب؟')}>إخفاء</AdminActionButton>
                    <AdminActionButton disabled={savingId === book.id} tone="danger" onClick={() => updateBook(book, 'book_archived', { status: 'archived', isPublished: false }, 'أرشفة الكتاب؟')}>أرشفة</AdminActionButton>
                    <Link href="/admin/content" className="rounded-full bg-petrol px-4 py-2 text-xs font-black text-ivory">ربط محتوى</Link>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </AdminPanel>
    </div>
  )
}
