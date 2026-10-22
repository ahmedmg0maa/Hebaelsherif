import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import Image from 'next/image'
import { Badge } from '@/components/ui/Badge'
import { Stars } from './Stars'
import { formatPrice } from '@/lib/format'

type ProductCardProps = {
  href: string
  title: string
  subtitle?: string
  description: string
  price: number
  compareAtPrice?: number | null
  badge?: { label: string; tone?: 'gold' | 'burgundy' | 'teal' | 'cobalt' }
  rating?: { value: number; count: number }
  meta?: string[]
  coverKind?: 'course' | 'book' | 'workshop' | 'session' | 'program'
  ctaLabel?: string
  coverUrl?: string | null
  priceLabel?: string
}

// One original no-person editorial still life, cropped per product kind for a
// coherent catalog instead of unrelated stock photography.
const coverArt: Record<NonNullable<ProductCardProps['coverKind']>, { position: string; glyph: React.ReactNode }> = {
  course: {
    position: '66% center',
    glyph: <path d="M8 10h24v15H8zM14 30h12M20 25v5M14 15h12M14 19h8" strokeLinecap="round" strokeLinejoin="round" />,
  },
  book: {
    position: '12% center',
    glyph: <path d="M8 10a3 3 0 0 1 3-3h21v22H11a3 3 0 0 0-3 3ZM8 10v22M32 29v4H11" strokeLinecap="round" strokeLinejoin="round" />,
  },
  workshop: {
    position: '92% center',
    glyph: <path d="M20 7v4M9.7 9.7l2.8 2.8M7 20h4M9.7 30.3l2.8-2.8M20 33v-4M30.3 30.3l-2.8-2.8M33 20h-4M30.3 9.7l-2.8 2.8M20 15a5 5 0 1 0 5 5" strokeLinecap="round" strokeLinejoin="round" />,
  },
  session: {
    position: '39% center',
    glyph: <path d="M20 20a6 6 0 1 0-6-6 6 6 0 0 0 6 6Zm-11 14c0-6 4.9-11 11-11s11 5 11 11" strokeLinecap="round" strokeLinejoin="round" />,
  },
  program: {
    position: '52% center',
    glyph: <path d="M9 12h22v20H9zM9 18h22M15 8v8M25 8v8M14 24h12M14 28h8" strokeLinecap="round" strokeLinejoin="round" />,
  },
}

export function ProductCard({
  href,
  title,
  subtitle,
  description,
  price,
  compareAtPrice,
  badge,
  rating,
  meta,
  coverKind = 'course',
  ctaLabel = 'اعرفي التفاصيل',
  coverUrl,
  priceLabel,
}: ProductCardProps) {
  const art = coverArt[coverKind]
  return (
    <Card hover as="article" className="group flex flex-col overflow-hidden p-0">
      <div className="relative flex aspect-[16/10] items-end overflow-hidden">
        {coverUrl ? <Image src={coverUrl} alt={`غلاف ${title}`} fill unoptimized sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" className={coverKind === 'book' ? 'object-contain bg-surface-raised p-3' : 'object-cover transition-transform duration-700 motion-safe:group-hover:scale-[1.035]'} /> : <Image
          src={coverKind === 'book' ? '/brand/books-reading-v2.webp' : '/brand/catalog-still-life.webp'}
          alt=""
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-700 motion-safe:group-hover:scale-[1.035]"
          style={{ objectPosition: coverKind === 'book' ? 'center' : art.position }}
        />}
        {!(coverKind === 'book' && coverUrl) && <span className="absolute inset-0 bg-linear-to-t from-deep-teal/65 via-deep-teal/5 to-transparent" />}
        {!(coverKind === 'book' && coverUrl) && <span className="relative m-4 flex h-11 w-11 items-center justify-center rounded-full border border-on-dark/35 bg-deep-teal/75 text-on-dark shadow-card backdrop-blur-sm">
          <svg viewBox="0 0 40 40" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
            {art.glyph}
          </svg>
        </span>}
        {badge && (
          <Badge tone={badge.tone ?? 'gold'} className="absolute end-4 top-4 bg-surface-raised/95 shadow-card">
            {badge.label}
          </Badge>
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        {subtitle && <p className="mb-1 text-sm font-semibold text-burgundy">{subtitle}</p>}
        <h3 className="font-heading text-2xl font-bold leading-snug text-deep-teal">
          <Link href={href} className="transition-colors hover:text-burgundy">
            {title}
          </Link>
        </h3>
        {rating && rating.count > 0 && <Stars rating={rating.value} count={rating.count} className="mt-2" />}
        <p className="mt-3 flex-1 text-base leading-loose text-text-soft">{description}</p>
        {meta && meta.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-soft">
            {meta.map((m) => (
              <li key={m} className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-antique-gold" aria-hidden />
                {m}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <p className="flex items-baseline gap-2">
            <span className="tnum text-lg font-bold text-burgundy">{priceLabel ?? formatPrice(price)}</span>
            {compareAtPrice && (
              <span className="tnum text-sm text-taupe line-through">{formatPrice(compareAtPrice)}</span>
            )}
          </p>
          <Link href={href} aria-label={`${ctaLabel}: ${title}`} className="inline-flex min-h-12 items-center text-sm font-semibold text-deep-teal transition-colors group-hover:text-burgundy">
            {ctaLabel}
          </Link>
        </div>
      </div>
    </Card>
  )
}
