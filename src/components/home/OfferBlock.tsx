import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Countdown } from '@/components/ui/Countdown'
import type { HomeOffer } from '@/lib/data/home'

export function OfferBlock({ offer, ctaLabel = 'استفيدي من العرض الآن' }: { offer: HomeOffer | null; ctaLabel?: string }) {
  if (!offer?.endsAt) return null
  const endsAt = offer.endsAt

  return (
    <section className="heritage-paper bg-ivory px-6 py-10 md:py-12">
      <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-5 overflow-hidden rounded-xl border border-antique-gold/45 bg-surface-raised px-8 py-9 text-center shadow-card">
        {offer.badgeText && (
          <Badge tone="burgundy" className="px-4 py-1.5 text-sm">
            {offer.badgeText}
          </Badge>
        )}
        <h2 className="text-3xl font-bold text-deep-teal md:text-4xl">{offer.title}</h2>
        <p className="max-w-2xl leading-loose text-text-soft">{offer.description}</p>
        <Countdown target={endsAt} />
        <Button href="/courses" size="lg">
          {ctaLabel}
        </Button>
      </div>
    </section>
  )
}
