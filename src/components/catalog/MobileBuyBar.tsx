import { Button } from '@/components/ui/Button'
import { formatPrice } from '@/lib/format'

// Sticky purchase bar for phones — the desktop card is sticky in the side column instead.
export function MobileBuyBar({
  price,
  compareAtPrice,
  ctaLabel,
  ctaHref,
}: {
  price: number
  compareAtPrice?: number | null
  ctaLabel: string
  ctaHref: string
}) {
  return (
    <>
      {/* spacer so page content never hides behind the fixed bar */}
      <div className="mobile-buy-spacer lg:hidden" aria-hidden />
      <div className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface-raised/95 backdrop-blur-md lg:hidden">
        <div className="mobile-buy-content flex items-center justify-between gap-3 px-4 py-3">
          <p className="min-w-0 flex flex-col">
            <span className="tnum text-xl font-bold text-burgundy">{formatPrice(price)}</span>
            {compareAtPrice && (
              <span className="tnum text-xs text-taupe line-through">{formatPrice(compareAtPrice)}</span>
            )}
          </p>
          <Button href={ctaHref} size="md" className="min-w-0 flex-1 max-w-56">
            {ctaLabel}
          </Button>
        </div>
      </div>
    </>
  )
}
