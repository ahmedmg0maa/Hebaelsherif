'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { addDoc, collection, getDocs, query, serverTimestamp, where } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import { useAuth } from '@/hooks/useAuth'
import PremiumButton from '@/components/ui/PremiumButton'
import type { ProductType, Review } from '@/types'

interface ReviewSectionProps {
  productId: string
  productType: ProductType
}

export default function ReviewSection({ productId, productType }: ReviewSectionProps) {
  const { user } = useAuth()
  const [reviews, setReviews] = useState<Review[]>([])
  const [rating, setRating] = useState(5)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function loadReviews() {
      setLoading(true)
      const snap = await getDocs(
        query(
          collection(db, 'reviews'),
          where('productId', '==', productId),
          where('productType', '==', productType),
          where('status', '==', 'published'),
        ),
      )
      setReviews(snap.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() }) as Review))
      setLoading(false)
    }

    loadReviews().catch((error) => {
      console.error('Reviews load error:', error)
      setLoading(false)
    })
  }, [productId, productType])

  const averageRating = useMemo(() => {
    if (!reviews.length) return 5
    return reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) / reviews.length
  }, [reviews])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')

    if (!user) {
      setMessage('سجلي الدخول أولًا لإضافة تقييم.')
      return
    }

    if (content.trim().length < 8) {
      setMessage('اكتبي تقييمًا واضحًا من 8 أحرف على الأقل.')
      return
    }

    setSubmitting(true)

    try {
      await addDoc(collection(db, 'reviews'), {
        userId: user.uid,
        userName: user.name,
        productId,
        productType,
        rating,
        content: content.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      setContent('')
      setRating(5)
      setMessage('تم إرسال تقييمك للمراجعة قبل النشر. شكرًا لكِ.')
    } catch (error) {
      console.error('Review submit error:', error)
      setMessage('تعذر إرسال التقييم الآن.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <article className="rounded-3xl border border-sand bg-ivory/90 p-7 shadow-soft backdrop-blur-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-black text-gold">تقييمات التجربة</p>
          <h2 className="mt-2 text-2xl font-black text-charcoal">آراء المشاركات</h2>
        </div>
        <div className="rounded-2xl border border-sand bg-cream/70 px-5 py-3 text-center">
          <p className="text-xs font-bold text-warm-gray">متوسط التقييم</p>
          <p className="mt-1 text-xl font-black text-burgundy">{averageRating.toFixed(1)} ★</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {loading ? (
          <p className="text-sm text-warm-gray">جاري تحميل التقييمات...</p>
        ) : reviews.length ? (
          reviews.slice(0, 6).map((review) => (
            <div key={review.id} className="rounded-2xl border border-sand bg-cream/55 p-4">
              <p className="text-sm text-gold">{'★'.repeat(Math.max(1, Math.min(5, Number(review.rating))))}</p>
              <p className="mt-3 text-sm leading-7 text-charcoal">{review.content}</p>
              <p className="mt-3 text-xs font-black text-warm-gray">{review.userName}</p>
            </div>
          ))
        ) : (
          <p className="text-sm leading-7 text-warm-gray">لم تُنشر تقييمات بعد. كوني أول من يشارك التجربة.</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-6 rounded-2xl border border-sand bg-cream/50 p-4">
        <div className="grid gap-3 md:grid-cols-[180px_1fr_auto] md:items-center">
          <select className="premium-input" value={rating} onChange={(event) => setRating(Number(event.target.value))}>
            {[5, 4, 3, 2, 1].map((item) => (
              <option key={item} value={item}>{item} نجوم</option>
            ))}
          </select>
          <input
            className="premium-input"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="اكتبي رأيك المختصر في التجربة..."
          />
          <PremiumButton type="submit" disabled={submitting}>{submitting ? 'جاري الإرسال...' : 'إرسال تقييم'}</PremiumButton>
        </div>
        {message ? <p className="mt-3 text-xs font-bold text-burgundy">{message}</p> : null}
      </form>
    </article>
  )
}
