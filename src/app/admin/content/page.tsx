'use client'

export const dynamic = 'force-dynamic'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import PremiumBadge from '@/components/ui/PremiumBadge'
import PremiumButton from '@/components/ui/PremiumButton'
import PremiumEmptyState from '@/components/ui/PremiumEmptyState'
import PremiumFormField from '@/components/ui/PremiumFormField'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'
import type { Book, Course, ProductType } from '@/types'

interface ProtectedContentRecord {
  productId: string
  productType: ProductType
  contentUrl: string
  resourceUrl?: string
  updatedAt?: unknown
  createdAt?: unknown
}

interface ContentItem {
  id: string
  title: string
  productType: ProductType
  slug: string
  status: string
  contentUrl: string
  resourceUrl: string
}

type FilterType = 'all' | ProductType

function getProtectedContentId(productType: ProductType, productId: string) {
  return `${productType}_${productId}`
}

function getProductTypeLabel(productType: ProductType) {
  return productType === 'course' ? 'كورس' : 'كتاب'
}

export default function AdminContentPage() {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<ContentItem[]>([])
  const [activeType, setActiveType] = useState<FilterType>('all')
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null)

  async function loadContentItems() {
    setLoading(true)

    const [coursesSnap, booksSnap] = await Promise.all([
      getDocs(collection(db, 'courses')),
      getDocs(collection(db, 'books')),
    ])

    const courses = coursesSnap.docs.map((docItem) => ({
      id: docItem.id,
      ...docItem.data(),
    })) as Course[]

    const books = booksSnap.docs.map((docItem) => ({
      id: docItem.id,
      ...docItem.data(),
    })) as Book[]

    const productItems = [
      ...courses.map((course) => ({
        id: course.id,
        title: course.title,
        productType: 'course' as const,
        slug: course.slug,
        status: course.status,
      })),
      ...books.map((book) => ({
        id: book.id,
        title: book.title,
        productType: 'book' as const,
        slug: book.slug,
        status: book.status,
      })),
    ]

    const hydratedItems = await Promise.all(
      productItems.map(async (product) => {
        const protectedSnap = await getDoc(
          doc(db, 'protected_content', getProtectedContentId(product.productType, product.id)),
        )

        const protectedData = protectedSnap.exists()
          ? (protectedSnap.data() as ProtectedContentRecord)
          : null

        return {
          ...product,
          contentUrl: protectedData?.contentUrl || '',
          resourceUrl: protectedData?.resourceUrl || '',
        }
      }),
    )

    hydratedItems.sort((a, b) => a.title.localeCompare(b.title, 'ar'))

    setItems(hydratedItems)
    setLoading(false)
  }

  useEffect(() => {
    loadContentItems().catch((error) => {
      console.error('Admin content load error:', error)
      setLoading(false)
    })
  }, [])

  const filteredItems = useMemo(() => {
    if (activeType === 'all') return items
    return items.filter((item) => item.productType === activeType)
  }, [activeType, items])

  function handleSaved(updatedItem: ContentItem) {
    setItems((current) =>
      current.map((item) => (item.id === updatedItem.id && item.productType === updatedItem.productType ? updatedItem : item)),
    )

    setEditingItem(null)
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
      <div className="mb-8">
        <p className="mb-2 text-sm font-bold text-gold">المحتوى المحمي</p>
        <h2 className="text-3xl font-black text-charcoal">روابط الوصول المدفوع</h2>
        <p className="mt-3 max-w-3xl text-sm leading-8 text-warm-gray">
          من هنا يتم ربط كل كورس أو كتاب برابط المحتوى الخاص به. هذه الروابط لا تظهر في صفحات
          الزوار، ولا يتم فتحها إلا عبر نظام التحقق من الشراء.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveType('all')}
          className={`rounded-full px-4 py-2 text-xs font-bold transition ${
            activeType === 'all'
              ? 'bg-petrol text-cream'
              : 'border border-sand bg-ivory text-warm-gray hover:text-petrol'
          }`}
        >
          الكل
        </button>

        <button
          type="button"
          onClick={() => setActiveType('course')}
          className={`rounded-full px-4 py-2 text-xs font-bold transition ${
            activeType === 'course'
              ? 'bg-petrol text-cream'
              : 'border border-sand bg-ivory text-warm-gray hover:text-petrol'
          }`}
        >
          الكورسات
        </button>

        <button
          type="button"
          onClick={() => setActiveType('book')}
          className={`rounded-full px-4 py-2 text-xs font-bold transition ${
            activeType === 'book'
              ? 'bg-petrol text-cream'
              : 'border border-sand bg-ivory text-warm-gray hover:text-petrol'
          }`}
        >
          الكتب
        </button>
      </div>

      {filteredItems.length === 0 ? (
        <PremiumEmptyState
          icon="🔒"
          title="لا توجد منتجات"
          description="أضف كورسات أو كتب أولًا حتى تتمكن من ربط المحتوى المحمي."
        />
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <article
              key={`${item.productType}_${item.id}`}
              className="rounded-3xl border border-sand bg-ivory p-6 shadow-soft"
            >
              <div className="grid gap-5 lg:grid-cols-[1fr_220px] lg:items-center">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <PremiumBadge variant={item.productType === 'course' ? 'petrol' : 'olive'}>
                      {getProductTypeLabel(item.productType)}
                    </PremiumBadge>

                    <PremiumBadge variant={item.status === 'published' ? 'gold' : 'neutral'}>
                      {item.status === 'published' ? 'منشور' : 'مسودة'}
                    </PremiumBadge>

                    <PremiumBadge variant={item.contentUrl ? 'olive' : 'burgundy'}>
                      {item.contentUrl ? 'الرابط موجود' : 'الرابط غير مضاف'}
                    </PremiumBadge>
                  </div>

                  <h3 className="mt-4 text-xl font-black text-charcoal">{item.title}</h3>

                  <p className="mt-2 text-xs text-warm-gray" dir="ltr">
                    /{item.productType === 'course' ? 'courses' : 'books'}/{item.slug}
                  </p>

                  {item.contentUrl ? (
                    <p className="mt-3 line-clamp-1 text-xs text-warm-gray" dir="ltr">
                      {item.contentUrl}
                    </p>
                  ) : (
                    <p className="mt-3 text-sm text-burgundy">
                      لم يتم إضافة رابط محتوى لهذا المنتج بعد.
                    </p>
                  )}
                </div>

                <PremiumButton
                  type="button"
                  className="w-full"
                  onClick={() => setEditingItem(item)}
                >
                  تعديل الرابط
                </PremiumButton>
              </div>
            </article>
          ))}
        </div>
      )}

      {editingItem ? (
        <ProtectedContentModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSaved={handleSaved}
        />
      ) : null}
    </div>
  )
}

function ProtectedContentModal({
  item,
  onClose,
  onSaved,
}: {
  item: ContentItem
  onClose: () => void
  onSaved: (item: ContentItem) => void
}) {
  const [contentUrl, setContentUrl] = useState(item.contentUrl)
  const [resourceUrl, setResourceUrl] = useState(item.resourceUrl)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!contentUrl.trim()) {
      setError('رابط المحتوى الأساسي مطلوب.')
      return
    }

    setSubmitting(true)

    try {
      const protectedId = getProtectedContentId(item.productType, item.id)
      const protectedRef = doc(db, 'protected_content', protectedId)
      const existingSnap = await getDoc(protectedRef)

      await setDoc(
        protectedRef,
        {
          productId: item.id,
          productType: item.productType,
          contentUrl: contentUrl.trim(),
          resourceUrl: resourceUrl.trim(),
          createdAt: existingSnap.exists() ? existingSnap.data().createdAt : serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )

      onSaved({
        ...item,
        contentUrl: contentUrl.trim(),
        resourceUrl: resourceUrl.trim(),
      })
    } catch (submitError) {
      console.error('Protected content save error:', submitError)
      setError('تعذر حفظ رابط المحتوى. حاول مرة أخرى.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-charcoal/60 px-4 py-8 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-sand bg-ivory p-6 shadow-premium sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-bold text-gold">
              تعديل رابط {getProductTypeLabel(item.productType)}
            </p>
            <h3 className="text-2xl font-black text-charcoal">{item.title}</h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-sand bg-cream text-xl text-charcoal transition hover:bg-burgundy hover:text-cream"
            aria-label="إغلاق"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <PremiumFormField
            label="رابط المحتوى الأساسي"
            required
            hint={
              item.productType === 'course'
                ? 'رابط مجلد الكورس أو مشغل الدروس المحمي.'
                : 'رابط ملف الكتاب أو صفحة القراءة المحمية.'
            }
          >
            <input
              className="premium-input"
              dir="ltr"
              value={contentUrl}
              onChange={(event) => setContentUrl(event.target.value)}
              placeholder="https://..."
            />
          </PremiumFormField>

          <PremiumFormField label="رابط موارد إضافية" hint="اختياري، مثل ملف تمارين أو مرفقات.">
            <input
              className="premium-input"
              dir="ltr"
              value={resourceUrl}
              onChange={(event) => setResourceUrl(event.target.value)}
              placeholder="https://..."
            />
          </PremiumFormField>

          {error ? (
            <div className="rounded-2xl border border-burgundy/20 bg-burgundy/10 px-4 py-3 text-sm leading-7 text-burgundy">
              {error}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <PremiumButton type="submit" disabled={submitting}>
              {submitting ? 'جاري الحفظ...' : 'حفظ الرابط'}
            </PremiumButton>

            <PremiumButton type="button" variant="outline" onClick={onClose}>
              إلغاء
            </PremiumButton>
          </div>
        </form>
      </div>
    </div>
  )
}