'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import CountdownTimer from '@/components/offers/CountdownTimer'
import PremiumBadge from '@/components/ui/PremiumBadge'

interface ActiveOffer {
  id: string
  title_ar: string
  description_ar: string | null
  discount_type: 'percentage' | 'fixed' | 'none'
  discount_value: number
  ends_at: string | null
  countdown_enabled: boolean
  public_coupon_code: string | null
  badge_text_ar: string | null
  cta_label_ar: string | null
  cta_href: string | null
}

export default function OfferBanner() {
  const [offer, setOffer] = useState<ActiveOffer | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/offers/active')
      .then((response) => response.json())
      .then((data: { offer?: ActiveOffer | null }) => {
        if (!cancelled && data.offer) setOffer(data.offer)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  const handleExpire = useCallback(() => setOffer(null), [])

  if (!offer) return null

  const discountLabel =
    offer.discount_type === 'percentage'
      ? `خصم ${offer.discount_value}%`
      : offer.discount_type === 'fixed'
        ? `خصم ${offer.discount_value} ج.م`
        : null

  return (
    <section className="container-wide px-3 pt-6 sm:px-0" aria-label="عرض حالي">
      <div className="premium-glow-border relative overflow-hidden rounded-[2.25rem] border border-gold/30 bg-gradient-to-l from-petrol/8 via-ivory to-gold/12 p-6 shadow-premium md:p-8">
        <div className="pointer-events-none absolute -left-16 top-0 h-48 w-48 rounded-full bg-gold/18 blur-3xl" />
        <div className="relative flex flex-col items-start justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <PremiumBadge variant="gold">{offer.badge_text_ar || 'عرض لفترة محدودة'}</PremiumBadge>
              {discountLabel ? <PremiumBadge variant="rose">{discountLabel}</PremiumBadge> : null}
            </div>
            <h2 className="mt-3 text-2xl font-black leading-snug text-charcoal md:text-3xl">{offer.title_ar}</h2>
            {offer.description_ar ? (
              <p className="mt-2 max-w-2xl text-sm leading-8 text-warm-gray">{offer.description_ar}</p>
            ) : null}
            {offer.public_coupon_code ? (
              <p className="latin-numerals mt-3 inline-block rounded-full border border-dashed border-petrol/40 bg-ivory/80 px-4 py-1.5 text-sm font-black tracking-widest text-petrol">
                {offer.public_coupon_code}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            {offer.countdown_enabled && offer.ends_at ? (
              <CountdownTimer endsAt={offer.ends_at} onExpire={handleExpire} />
            ) : null}
            <Link
              href={offer.cta_href || '/services'}
              className="focus-premium inline-flex items-center justify-center rounded-full bg-petrol px-6 py-3 text-sm font-black text-ivory shadow-soft transition hover:-translate-y-0.5 hover:bg-deepTeal"
            >
              {offer.cta_label_ar || 'اكتشفي العرض'}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
