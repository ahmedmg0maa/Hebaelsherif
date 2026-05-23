import PremiumButton from '@/components/ui/PremiumButton'
import type { ProductType } from '@/types'

interface ProtectedContentNoticeProps {
  title?: string
  description?: string
  productTitle?: string
  productType?: ProductType
  backHref?: string
  purchaseHref?: string
}

export default function ProtectedContentNotice({
  title = 'هذا المحتوى حصري',
  description,
  productTitle,
  productType,
  backHref = '/dashboard',
  purchaseHref,
}: ProtectedContentNoticeProps) {
  const productLabel = productType === 'course' ? 'الكورس' : 'الكتاب'

  return (
    <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-4 py-12">
      <div className="premium-glow-border w-full max-w-lg rounded-[2.25rem] border border-sand bg-ivory/95 p-8 text-center shadow-premium backdrop-blur-sm">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-petrol/10 text-3xl text-petrol">🔒</div>
        <h1 className="text-2xl font-black text-charcoal">{title}</h1>
        <p className="mt-4 text-sm leading-8 text-warm-gray">
          {description ||
            `للوصول إلى ${productTitle ? `“${productTitle}”` : productLabel} يجب أن يكون لديك طلب مدفوع ومؤكد من الإدارة.`}
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {purchaseHref ? <PremiumButton href={purchaseHref}>طلب الشراء</PremiumButton> : null}
          <PremiumButton href={backHref} variant="outline">العودة للوحة</PremiumButton>
        </div>
      </div>
    </div>
  )
}
