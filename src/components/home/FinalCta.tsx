import type { ResolvedHomeMedia } from '@/lib/home/media'
import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { DEFAULT_HOME_CONTENT, type CtaContent } from '@/lib/home/sections'

export function FinalCta({ content = DEFAULT_HOME_CONTENT.cta as CtaContent, media }: { content?: CtaContent; media?: ResolvedHomeMedia }) {
  return (
    <section className="journey-surface relative isolate overflow-hidden border-t border-line bg-surface-raised px-5 py-14 text-ink sm:px-8 md:py-20" aria-labelledby="home-final-cta-title">
      {media && <Image src={media.url} alt={media.alt ?? ""} style={{ objectPosition: `${media.x}% ${media.y}%` }} fill unoptimized sizes="100vw" className="-z-20 object-cover" />}
      <span className="absolute inset-0 -z-10 bg-surface-raised/94" aria-hidden />
      <span className="pointer-events-none absolute inset-5 rounded-2xl border border-line sm:inset-8" aria-hidden />
      <div className="relative mx-auto max-w-4xl text-center">
        <p className="text-xs font-bold text-burgundy">{content.eyebrow}</p>
        <h2 id="home-final-cta-title" className="mt-3 text-3xl font-bold leading-snug text-deep-teal sm:text-5xl">{content.heading}</h2>
        <p className="mx-auto mt-4 max-w-2xl leading-loose text-text-soft">{content.body}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button href={content.primaryHref} variant="burgundy" size="lg">{content.primaryLabel}</Button>
          <Button href={content.secondaryHref} variant="secondary" size="lg">{content.secondaryLabel}</Button>
        </div>
      </div>
    </section>
  )
}
