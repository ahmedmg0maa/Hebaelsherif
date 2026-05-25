'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { collection, doc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import PremiumButton from '@/components/ui/PremiumButton'
import PremiumSkeleton from '@/components/ui/PremiumSkeleton'
import type { Review } from '@/types'

export default function AdminReviewsPage() {
  const [loading, setLoading] = useState(true)
  const [reviews, setReviews] = useState<Review[]>([])
  const [updatingId, setUpdatingId] = useState('')

  async function loadReviews() {
    setLoading(true)
    const snap = await getDocs(collection(db, 'reviews'))
    setReviews(snap.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() }) as Review))
    setLoading(false)
  }

  useEffect(() => {
    loadReviews().catch((error) => {
      console.error('Admin reviews error:', error)
      setLoading(false)
    })
  }, [])

  async function updateStatus(id: string, status: Review['status']) {
    setUpdatingId(id)
    try {
      await updateDoc(doc(db, 'reviews', id), { status, updatedAt: serverTimestamp() })
      setReviews((current) => current.map((item) => (item.id === id ? { ...item, status } : item)))
    } finally {
      setUpdatingId('')
    }
  }

  if (loading) return <PremiumSkeleton className="h-80" />

  return (
    <div>
      <div className="mb-8">
        <p className="mini-label">Reviews</p>
        <h2 className="mt-3 text-3xl font-black text-charcoal">إدارة التقييمات</h2>
        <p className="mt-3 max-w-2xl text-sm leading-8 text-warm-gray">انشر أو أخفِ التقييمات بعد المراجعة للحفاظ على جودة الثقة.</p>
      </div>
      <div className="space-y-4">
        {reviews.map((review) => (
          <article key={review.id} className="rounded-[2rem] border border-sand bg-ivory/90 p-6 shadow-soft backdrop-blur-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-black text-gold">{review.productType} · {review.rating} ★ · {review.status}</p>
                <h3 className="mt-2 text-lg font-black text-charcoal">{review.userName}</h3>
                <p className="mt-3 max-w-3xl text-sm leading-8 text-warm-gray">{review.content}</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-3 lg:w-80">
                <PremiumButton size="sm" disabled={updatingId === review.id} onClick={() => updateStatus(review.id, 'published')}>نشر</PremiumButton>
                <PremiumButton size="sm" variant="outline" disabled={updatingId === review.id} onClick={() => updateStatus(review.id, 'pending')}>معلق</PremiumButton>
                <PremiumButton size="sm" variant="danger" disabled={updatingId === review.id} onClick={() => updateStatus(review.id, 'hidden')}>إخفاء</PremiumButton>
              </div>
            </div>
          </article>
        ))}
        {reviews.length === 0 ? <p className="text-sm text-warm-gray">لا توجد تقييمات بعد.</p> : null}
      </div>
    </div>
  )
}
