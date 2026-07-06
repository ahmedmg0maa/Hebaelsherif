import Link from 'next/link'
import ImageSlot from '@/components/ui/ImageSlot'
import PremiumButton from '@/components/ui/PremiumButton'
import { formatCommercePrice, getAccessLabel, PRODUCT_TYPE_COLORS, PRODUCT_TYPE_LABELS, type UnifiedProduct } from '@/lib/commerce/unified'

interface UnifiedProductCardProps {
  product: UnifiedProduct
  priority?: boolean
}

export default function UnifiedProductCard({ product, priority = false }: UnifiedProductCardProps) {
  const colors = PRODUCT_TYPE_COLORS[product.type]
  return (
    <article className="group overflow-hidden rounded-[2.25rem] border border-sand bg-ivory/92 shadow-soft transition duration-300 hover:-translate-y-1 hover:border-gold/50 hover:shadow-premium">
      <Link href={product.href} className="block">
        <ImageSlot
          src={product.coverImageUrl}
          alt={product.title}
          ratio="video"
          variant={product.type === 'book' ? 'book' : product.type === 'course' ? 'course' : 'brand'}
          className="rounded-none border-0 shadow-none"
          priority={priority}
        />
      </Link>
      <div className="p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <span className={`rounded-full border px-3 py-1 text-xs font-black ${colors.badge}`}>{PRODUCT_TYPE_LABELS[product.type]}</span>
          <span className="latin-numerals text-sm font-black text-burgundy">{formatCommercePrice(product.price, product.currency)}</span>
        </div>
        <Link href={product.href} className="block">
          <h3 className="text-2xl font-black leading-tight text-charcoal transition group-hover:text-petrol">{product.title}</h3>
          <p className="mt-3 line-clamp-2 text-sm font-bold leading-7 text-warm-gray">{product.promise || product.description}</p>
        </Link>
        {product.metrics?.length ? (
          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            {product.metrics.slice(0, 3).map((metric) => (
              <div key={metric.label} className="rounded-2xl border border-sand bg-cream/70 px-2 py-3">
                <strong className="latin-numerals block text-sm font-black text-petrol">{metric.value}</strong>
                <span className="mt-1 block text-[11px] font-black text-warm-gray">{metric.label}</span>
              </div>
            ))}
          </div>
        ) : null}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs font-black text-gold">{getAccessLabel(product.accessMode)}</span>
          <PremiumButton href={product.checkoutHref} size="sm" variant={product.status === 'published' ? 'primary' : 'outline'}>
            {product.status === 'published' ? 'اختاري الآن' : 'سجلي اهتمامك'}
          </PremiumButton>
        </div>
      </div>
    </article>
  )
}
