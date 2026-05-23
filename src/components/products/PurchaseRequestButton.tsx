'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PAYMENT_METHODS } from '@/constants/payments'
import { useAuth } from '@/hooks/useAuth'
import PremiumButton from '@/components/ui/PremiumButton'
import type { PaymentMethod, ProductType } from '@/types'

interface PurchaseRequestButtonProps {
  productId: string
  productType: ProductType
  currentPath: string
  paidRedirectHref: string
  className?: string
}

interface CreateOrderResponse {
  success?: boolean
  orderId?: string
  status?: 'pending' | 'paid' | 'cancelled'
  alreadyPaid?: boolean
  alreadyPending?: boolean
  error?: string
}

export default function PurchaseRequestButton({ productId, productType, currentPath, paidRedirectHref, className = '' }: PurchaseRequestButtonProps) {
  const router = useRouter()
  const { user, firebaseUser, loading } = useAuth()

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('instapay')
  const [paymentReference, setPaymentReference] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const productTypeLabel = useMemo(() => (productType === 'course' ? 'الكورس' : 'الكتاب'), [productType])
  const selectedPayment = PAYMENT_METHODS.find((method) => method.id === paymentMethod) || PAYMENT_METHODS[0]

  async function handlePurchaseRequest() {
    setMessage('')
    setError('')

    if (loading) return

    if (!user || !firebaseUser) {
      router.push(`/auth/login?next=${encodeURIComponent(currentPath)}`)
      return
    }

    setSubmitting(true)

    try {
      const token = await firebaseUser.getIdToken()
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productId, productType, paymentMethod, paymentReference: paymentReference.trim() }),
      })

      const data = (await response.json()) as CreateOrderResponse

      if (!response.ok || !data.success) {
        setError(data.error || 'تعذر إرسال طلب الشراء الآن.')
        return
      }

      if (data.alreadyPaid || data.status === 'paid') {
        router.push(paidRedirectHref)
        return
      }

      if (data.alreadyPending) {
        setMessage(`لديكِ طلب شراء قائم بالفعل لهذا ${productTypeLabel}. يمكنك متابعة حالته من صفحة الطلبات.`)
        return
      }

      setMessage(`تم إرسال طلب شراء ${productTypeLabel} بنجاح. طريقة الدفع المختارة: ${selectedPayment.title}. ستراجع الإدارة الطلب وتفتح الوصول بعد التأكيد.`)
    } catch (requestError) {
      console.error('Purchase request error:', requestError)
      setError('تعذر إرسال طلب الشراء الآن. حاولي مرة أخرى.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={className}>
      <div className="mb-4 rounded-2xl border border-sand bg-cream/55 p-4">
        <p className="mb-3 text-xs font-black text-gold">اختاري طريقة الدفع</p>
        <div className="grid gap-2">
          {PAYMENT_METHODS.map((method) => (
            <button
              key={method.id}
              type="button"
              onClick={() => setPaymentMethod(method.id)}
              className={`rounded-2xl border p-3 text-right transition ${
                paymentMethod === method.id
                  ? 'border-petrol bg-petrol text-ivory'
                  : 'border-sand bg-ivory/80 text-charcoal hover:border-gold'
              }`}
            >
              <span className="block text-sm font-black">{method.title}</span>
              <span className="mt-1 block text-[11px] leading-5 opacity-75" dir="ltr">
                {method.accountValue}
              </span>
            </button>
          ))}
        </div>
        <input
          className="premium-input mt-3"
          value={paymentReference}
          onChange={(event) => setPaymentReference(event.target.value)}
          placeholder="رقم العملية أو ملاحظة الدفع - اختياري"
        />
      </div>

      <PremiumButton type="button" size="lg" className="w-full" onClick={handlePurchaseRequest} disabled={loading || submitting}>
        {submitting ? 'جاري إرسال الطلب...' : `طلب شراء ${productTypeLabel}`}
      </PremiumButton>

      {message ? (
        <div className="mt-4 rounded-2xl border border-olive/20 bg-olive/10 px-4 py-3 text-sm leading-7 text-olive">
          {message}
          <button type="button" onClick={() => router.push('/dashboard/orders')} className="mt-2 block font-black text-petrol transition hover:text-gold">
            عرض طلباتي
          </button>
        </div>
      ) : null}

      {error ? <div className="mt-4 rounded-2xl border border-petrol/20 bg-petrol/10 px-4 py-3 text-sm leading-7 text-petrol">{error}</div> : null}

      <p className="mt-3 text-center text-xs leading-6 text-warm-gray">بعد إرسال الطلب، تقوم الإدارة بتأكيد الدفع ثم يتم فتح الوصول تلقائياً داخل حسابك.</p>
    </div>
  )
}
