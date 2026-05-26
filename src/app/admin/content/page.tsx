'use client'

export const dynamic = 'force-dynamic'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { addDoc, collection, doc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import type { Book, Course, ProductType } from '@/types'
import { formatArabicDateTime, formatNumber } from '@/lib/utils/formatters'
import { hasPrivateContentLeak, hasProtectedContentFor, isPublishedProduct, toMillis } from '@/lib/admin/operations'
import { AdminActionButton, AdminPageHeader, AdminPanel, EmptyState, Field, inputClass, MetricCard, StatusBadge, ToneBadge } from '@/components/admin/OperationsUI'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'

interface ProtectedItem {
  id: string
  productId?: string
  productSlug?: string
  productType?: ProductType
  title?: string
  contentUrl?: string
  resourceUrl?: string
  accessType?: string
  isActive?: boolean
  status?: string
  createdAt?: unknown
  updatedAt?: unknown
}

interface FormState {
  productType: ProductType
  productId: string
  productSlug: string
  title: string
  contentUrl: string
  resourceUrl: string
  accessType: string
  isActive: boolean
}

const emptyForm: FormState = {
  productType: 'course',
  productId: '',
  productSlug: '',
  title: '',
  contentUrl: '',
  resourceUrl: '',
  accessType: 'paid',
  isActive: true,
}

function mapDocs<T>(snapshot: Awaited<ReturnType<typeof getDocs>>) {
  return snapshot.docs.map((docItem) => ({ id: docItem.id, ...(docItem.data() as Record<string, unknown>) })) as T[]
}

export default function AdminContentPage() {
  const [items, setItems] = useState<ProtectedItem[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [form, setForm] = useState<FormState>(emptyForm)
  const [filter, setFilter] = useState('all')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [contentSnap, coursesSnap, booksSnap] = await Promise.all([
        getDocs(collection(db, 'protected_content')),
        getDocs(collection(db, 'courses')),
        getDocs(collection(db, 'books')),
      ])
      setItems(mapDocs<ProtectedItem>(contentSnap).sort((a, b) => toMillis(b.createdAt as never) - toMillis(a.createdAt as never)))
      setCourses(mapDocs<Course>(coursesSnap))
      setBooks(mapDocs<Book>(booksSnap))
    } catch (loadError) {
      console.error('Protected content load error:', loadError)
      setError('تعذر تحميل المحتوى المحمي. راجع صلاحيات الأدمن واتصال Firebase.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function updateForm(key: keyof FormState, value: string | boolean) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function editItem(item: ProtectedItem) {
    setEditingId(item.id)
    setForm({
      productType: item.productType || 'course',
      productId: item.productId || '',
      productSlug: item.productSlug || '',
      title: item.title || '',
      contentUrl: item.contentUrl || '',
      resourceUrl: item.resourceUrl || '',
      accessType: item.accessType || 'paid',
      isActive: item.isActive !== false,
    })
  }

  async function writeLog(action: string, targetId: string, after: Record<string, unknown>) {
    try {
      await addDoc(collection(db, 'admin_logs'), {
        action,
        targetType: 'protected_content',
        targetId,
        after,
        message: `${action} - ${after.title || targetId}`,
        createdAt: serverTimestamp(),
      })
    } catch (logError) {
      console.warn('Protected content log failed:', logError)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')

    try {
      if (!form.title.trim() || !form.contentUrl.trim()) {
        setError('العنوان ورابط المحتوى مطلوبان.')
        return
      }

      const values = {
        productType: form.productType,
        productId: form.productId.trim(),
        productSlug: form.productSlug.trim(),
        title: form.title.trim(),
        contentUrl: form.contentUrl.trim(),
        resourceUrl: form.resourceUrl.trim(),
        accessType: form.accessType,
        isActive: form.isActive,
        updatedAt: serverTimestamp(),
      }

      if (editingId) {
        await updateDoc(doc(db, 'protected_content', editingId), values)
        await writeLog('protected_content_updated', editingId, values)
        setItems((current) => current.map((item) => (item.id === editingId ? { ...item, ...values } as ProtectedItem : item)))
      } else {
        const ref = await addDoc(collection(db, 'protected_content'), { ...values, createdAt: serverTimestamp() })
        await writeLog('protected_content_created', ref.id, values)
        setItems((current) => [{ id: ref.id, ...values } as ProtectedItem, ...current])
      }

      setForm(emptyForm)
      setEditingId('')
      setMessage('تم حفظ المحتوى المحمي بنجاح.')
    } catch (saveError) {
      console.error('Protected content save error:', saveError)
      setError('تعذر حفظ المحتوى المحمي. تأكد من الصلاحيات وحاول مرة أخرى.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(item: ProtectedItem) {
    const nextActive = item.isActive === false
    if (!window.confirm(nextActive ? 'تفعيل هذا الرابط؟' : 'تعطيل هذا الرابط؟')) return
    setSaving(true)
    try {
      const values = { isActive: nextActive, updatedAt: serverTimestamp() }
      await updateDoc(doc(db, 'protected_content', item.id), values)
      await writeLog(nextActive ? 'protected_content_enabled' : 'protected_content_disabled', item.id, values)
      setItems((current) => current.map((currentItem) => (currentItem.id === item.id ? { ...currentItem, isActive: nextActive } : currentItem)))
    } catch (toggleError) {
      console.error('Toggle protected content error:', toggleError)
      setError('تعذر تحديث حالة المحتوى المحمي.')
    } finally {
      setSaving(false)
    }
  }

  const products = useMemo(() => [...courses.map((course) => ({ ...course, productType: 'course' as ProductType })), ...books.map((book) => ({ ...book, productType: 'book' as ProductType }))], [books, courses])

  const filteredItems = useMemo(() => items.filter((item) => filter === 'all' || item.productType === filter || (filter === 'inactive' && item.isActive === false)), [filter, items])

  const stats = useMemo(() => {
    const publishedCoursesWithoutContent = courses.filter((course) => isPublishedProduct(course) && !hasProtectedContentFor('course', course, items as unknown as Array<Record<string, unknown>>)).length
    const publishedBooksWithoutContent = books.filter((book) => isPublishedProduct(book) && !hasProtectedContentFor('book', book, items as unknown as Array<Record<string, unknown>>)).length
    const leaks = products.filter((product) => hasPrivateContentLeak(product as unknown as Record<string, unknown>)).length
    return {
      total: items.length,
      active: items.filter((item) => item.isActive !== false).length,
      inactive: items.filter((item) => item.isActive === false).length,
      courses: items.filter((item) => item.productType === 'course').length,
      books: items.filter((item) => item.productType === 'book').length,
      missing: publishedCoursesWithoutContent + publishedBooksWithoutContent,
      leaks,
    }
  }, [books, courses, items, products])

  if (loading) return <PremiumSkeleton className="h-[32rem]" />

  return (
    <div className="space-y-8">
      <AdminPageHeader title="مركز المحتوى المحمي" description="الصفحة الحساسة لحماية روابط المحتوى المدفوع وربطها بالكورسات والكتب بدون كشفها في البيانات العامة." />

      {message ? <div className="rounded-2xl border border-olive/25 bg-olive/10 p-4 text-sm font-black text-olive dark:text-ivory">{message}</div> : null}
      {error ? <div className="rounded-2xl border border-burgundy/25 bg-burgundy/10 p-4 text-sm font-black text-burgundy dark:text-ivory">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
        <MetricCard label="كل الروابط" value={formatNumber(stats.total)} tone="muted" />
        <MetricCard label="نشطة" value={formatNumber(stats.active)} tone="success" />
        <MetricCard label="معطلة" value={formatNumber(stats.inactive)} tone="warning" />
        <MetricCard label="للكورسات" value={formatNumber(stats.courses)} tone="petrol" />
        <MetricCard label="للكتب" value={formatNumber(stats.books)} tone="gold" />
        <MetricCard label="منتجات منشورة بلا محتوى" value={formatNumber(stats.missing)} tone={stats.missing ? 'danger' : 'success'} />
        <MetricCard label="تسريب روابط عامة" value={formatNumber(stats.leaks)} tone={stats.leaks ? 'danger' : 'success'} />
      </div>

      <AdminPanel title={editingId ? 'تعديل محتوى محمي' : 'إضافة محتوى محمي'} description="احتفظ بروابط Drive/التحميل هنا فقط. لا تضعي روابط مدفوعة داخل courses أو books.">
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <Field label="نوع المنتج">
            <select className={inputClass} value={form.productType} onChange={(event) => updateForm('productType', event.target.value as ProductType)}>
              <option value="course">كورس</option>
              <option value="book">كتاب</option>
            </select>
          </Field>
          <Field label="المنتج المرتبط">
            <select
              className={inputClass}
              value={`${form.productType}:${form.productId || form.productSlug}`}
              onChange={(event) => {
                const [productType, key] = event.target.value.split(':')
                const selected = products.find((product) => product.productType === productType && (product.id === key || product.slug === key))
                updateForm('productType', productType as ProductType)
                updateForm('productId', selected?.id || '')
                updateForm('productSlug', selected?.slug || '')
                updateForm('title', form.title || selected?.title || '')
              }}
            >
              <option value={`${form.productType}:`}>اختيار يدوي</option>
              {products.map((product) => (
                <option key={`${product.productType}-${product.id}`} value={`${product.productType}:${product.id || product.slug}`}>
                  {product.productType === 'course' ? 'كورس' : 'كتاب'} - {product.title || product.slug}
                </option>
              ))}
            </select>
          </Field>
          <Field label="العنوان">
            <input className={inputClass} value={form.title} onChange={(event) => updateForm('title', event.target.value)} placeholder="عنوان المحتوى المحمي" />
          </Field>
          <Field label="Product ID">
            <input className={inputClass} value={form.productId} onChange={(event) => updateForm('productId', event.target.value)} placeholder="معرف المنتج" />
          </Field>
          <Field label="Product Slug">
            <input className={inputClass} value={form.productSlug} onChange={(event) => updateForm('productSlug', event.target.value)} placeholder="slug المنتج" />
          </Field>
          <Field label="نوع الوصول">
            <select className={inputClass} value={form.accessType} onChange={(event) => updateForm('accessType', event.target.value)}>
              <option value="paid">مدفوع</option>
              <option value="bonus">هدية</option>
              <option value="manual">يدوي</option>
            </select>
          </Field>
          <div className="md:col-span-2">
            <Field label="رابط المحتوى الأساسي">
              <input className={inputClass} value={form.contentUrl} onChange={(event) => updateForm('contentUrl', event.target.value)} placeholder="Google Drive / PDF / Video private link" />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="رابط موارد إضافية">
              <input className={inputClass} value={form.resourceUrl} onChange={(event) => updateForm('resourceUrl', event.target.value)} placeholder="اختياري" />
            </Field>
          </div>
          <label className="flex items-center justify-between rounded-2xl border border-sand bg-cream/80 px-4 py-3 md:col-span-2 dark:border-gold/25 dark:bg-white/10">
            <span className="text-sm font-black text-charcoal dark:text-ivory">الرابط نشط</span>
            <input type="checkbox" checked={form.isActive} onChange={(event) => updateForm('isActive', event.target.checked)} className="h-5 w-5 accent-gold" />
          </label>
          <div className="flex flex-wrap gap-3 md:col-span-2">
            <AdminActionButton type="submit" disabled={saving} tone="gold">{saving ? 'جاري الحفظ...' : editingId ? 'حفظ التعديل' : 'إضافة المحتوى'}</AdminActionButton>
            {editingId ? <AdminActionButton tone="muted" onClick={() => { setEditingId(''); setForm(emptyForm) }}>إلغاء التعديل</AdminActionButton> : null}
          </div>
        </form>
      </AdminPanel>

      <AdminPanel title="فحص حماية المحتوى" description="تنبيهات تشغيلية تمنع تسريب الروابط أو نشر منتجات بدون محتوى محمي.">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-sand bg-cream/70 p-4 dark:border-gold/25 dark:bg-white/10">
            <ToneBadge tone={stats.leaks ? 'danger' : 'success'}>{stats.leaks ? 'يحتاج إصلاح' : 'سليم'}</ToneBadge>
            <p className="mt-3 text-sm font-black text-charcoal dark:text-ivory">لا روابط خاصة في بيانات عامة</p>
          </div>
          <div className="rounded-2xl border border-sand bg-cream/70 p-4 dark:border-gold/25 dark:bg-white/10">
            <ToneBadge tone={stats.missing ? 'danger' : 'success'}>{stats.missing ? 'يحتاج ربط' : 'سليم'}</ToneBadge>
            <p className="mt-3 text-sm font-black text-charcoal dark:text-ivory">كل المنشور له محتوى محمي</p>
          </div>
          <div className="rounded-2xl border border-sand bg-cream/70 p-4 dark:border-gold/25 dark:bg-white/10">
            <ToneBadge tone={stats.inactive ? 'warning' : 'success'}>{stats.inactive ? 'مراجعة' : 'نشط'}</ToneBadge>
            <p className="mt-3 text-sm font-black text-charcoal dark:text-ivory">الروابط المعطلة واضحة</p>
          </div>
        </div>
      </AdminPanel>

      <AdminPanel title="روابط المحتوى المحمي" description="هذه الروابط للأدمن فقط، والمستخدم يحصل عليها بعد التحقق من الدفع عبر API.">
        <div className="mb-5 flex flex-wrap gap-2">
          <AdminActionButton tone={filter === 'all' ? 'gold' : 'muted'} onClick={() => setFilter('all')}>الكل</AdminActionButton>
          <AdminActionButton tone={filter === 'course' ? 'gold' : 'muted'} onClick={() => setFilter('course')}>كورسات</AdminActionButton>
          <AdminActionButton tone={filter === 'book' ? 'gold' : 'muted'} onClick={() => setFilter('book')}>كتب</AdminActionButton>
          <AdminActionButton tone={filter === 'inactive' ? 'gold' : 'muted'} onClick={() => setFilter('inactive')}>معطلة</AdminActionButton>
        </div>
        {filteredItems.length === 0 ? (
          <EmptyState title="لا يوجد محتوى محمي" description="أضف أول رابط محمي واربطه بمنتج منشور قبل استقبال المدفوعات." />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {filteredItems.map((item) => (
              <article key={item.id} className="rounded-[1.75rem] border border-sand bg-cream/80 p-5 shadow-soft dark:border-gold/25 dark:bg-white/10">
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <h3 className="text-lg font-black text-charcoal dark:text-ivory">{item.title || 'محتوى بدون عنوان'}</h3>
                  <ToneBadge tone={item.productType === 'book' ? 'gold' : 'petrol'}>{item.productType === 'book' ? 'كتاب' : 'كورس'}</ToneBadge>
                  <StatusBadge meta={{ label: item.isActive === false ? 'معطل' : 'نشط', description: '', tone: item.isActive === false ? 'warning' : 'success' }} />
                </div>
                <div className="space-y-2 text-xs font-bold text-warm-gray dark:text-cream">
                  <p>Product ID: <span className="text-charcoal dark:text-ivory">{item.productId || 'غير محدد'}</span></p>
                  <p>Product Slug: <span className="text-charcoal dark:text-ivory">{item.productSlug || 'غير محدد'}</span></p>
                  <p>آخر تحديث: <span className="text-charcoal dark:text-ivory">{formatArabicDateTime(item.updatedAt as never || item.createdAt as never)}</span></p>
                  <p className="break-all">الرابط: <span className="text-charcoal dark:text-ivory">{item.contentUrl ? 'موجود ومحفوظ' : 'غير موجود'}</span></p>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <AdminActionButton tone="petrol" onClick={() => editItem(item)}>تعديل</AdminActionButton>
                  <AdminActionButton disabled={saving} tone={item.isActive === false ? 'success' : 'warning'} onClick={() => toggleActive(item)}>{item.isActive === false ? 'تفعيل' : 'تعطيل'}</AdminActionButton>
                </div>
              </article>
            ))}
          </div>
        )}
      </AdminPanel>
    </div>
  )
}
