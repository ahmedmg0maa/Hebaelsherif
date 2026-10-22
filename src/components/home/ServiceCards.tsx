import type { ResolvedHomeMedia } from '@/lib/home/media'
import Image from 'next/image'
import Link from 'next/link'
import { DEFAULT_HOME_CONTENT, type PathwaysContent } from '@/lib/home/sections'
import { cn } from '@/lib/cn'

const images: Record<string, string> = {
  '/booking': '/brand/catalog-still-life.webp',
  '/services': '/brand/catalog-still-life.webp',
  '/books': '/brand/books-reading-v2.webp',
  '/courses': '/images/learning/learning-desk.webp',
  '/workshops': '/brand/catalog-still-life.webp',
}

export function ServiceCards({ content = DEFAULT_HOME_CONTENT.pathways as PathwaysContent, media = {} }: { content?: PathwaysContent; media?: Record<string, ResolvedHomeMedia> }) {
  return (
    <section className="journey-surface border-b border-line bg-ivory px-5 py-16 sm:px-8 md:py-24" aria-labelledby="service-gates-title">
      <div className="mx-auto max-w-7xl">
        <header className="mx-auto mb-12 max-w-2xl text-center">
          <p className="text-sm font-semibold text-burgundy">{content.eyebrow}</p>
          <h2 id="service-gates-title" className="mt-4 font-heading text-4xl leading-snug font-bold text-deep-teal sm:text-5xl">{content.heading}</h2>
          <p className="mt-5 text-base leading-loose text-text-soft">{content.lead}</p>
        </header>
        <div className={cn('grid gap-5', content.items.length === 3 ? 'md:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-4')}>
          {content.items.map((service, index) => (
            <Link prefetch={false} key={service.href} href={service.href} className="interactive-card group flex min-w-0 flex-col rounded-2xl border border-line bg-surface-raised p-3 pb-6 text-start focus-visible:rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-cobalt">
              <div className="relative mx-auto aspect-[4/3] rounded-xl w-full max-w-sm overflow-hidden border border-antique-gold/40 bg-sand shadow-card transition-shadow duration-300 group-hover:shadow-card-hover">
                {!media[`portal${index}`] && !images[service.href] && <div aria-hidden className="absolute inset-0 grid place-items-center bg-linear-to-br from-ivory via-sand to-muted-gold/35"><svg viewBox="0 0 180 130" className="w-3/4 max-w-56 text-deep-teal" fill="none"><path d="M20 25Q55 10 90 32Q125 10 160 25V106Q125 91 90 113Q55 91 20 106Z" fill="var(--color-ivory)" stroke="currentColor" strokeWidth="1.5"/><path d="M90 32V113M33 41Q57 33 76 43M33 56Q57 48 76 58M33 71Q57 63 76 73M104 43Q127 33 147 41M104 58Q127 48 147 56M104 73Q127 63 147 71" stroke="currentColor" strokeOpacity=".4"/><path d="M130 21V64L122 58L114 64V23" fill="var(--color-burgundy)"/></svg></div>}
                {(media[`portal${index}`] || images[service.href]) && <Image src={media[`portal${index}`]?.url ?? images[service.href]} alt={media[`portal${index}`]?.alt ?? ""} style={{ objectPosition: `${media[`portal${index}`]?.x ?? 50}% ${media[`portal${index}`]?.y ?? 50}%` }} fill unoptimized sizes="(min-width: 1024px) 30vw, (min-width: 768px) 33vw, 100vw" className="object-cover transition-transform duration-700 motion-safe:group-hover:scale-[1.035]" />}
                <span aria-hidden className="absolute inset-0 bg-linear-to-t from-[#082730]/45 to-transparent" />
                <span aria-hidden className="absolute inset-x-0 bottom-6 font-heading text-base font-bold text-on-dark">{(index + 1).toLocaleString('ar-EG', { minimumIntegerDigits: 2 })}</span>
              </div>
              <h3 className="mx-3 mt-5 font-heading text-3xl font-bold text-deep-teal">{service.title}</h3>
              <p className="mx-3 mt-3 max-w-sm flex-1 text-base leading-loose text-text-soft">{service.text}</p>
              <span className="mx-3 mt-5 self-start inline-flex min-h-12 items-center gap-3 border-b border-burgundy/25 text-sm font-semibold text-burgundy group-hover:border-burgundy">{service.cta}<span aria-hidden>←</span></span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
