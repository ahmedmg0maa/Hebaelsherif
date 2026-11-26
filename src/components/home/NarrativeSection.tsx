import Image from 'next/image'
import type { ResolvedHomeMedia } from '@/lib/home/media'
import type { NarrativeContent } from '@/lib/home/sections'

export function NarrativeSection({ content, quote = false, media }: { content: NarrativeContent; quote?: boolean; media?: ResolvedHomeMedia }) {
  return <section className={quote ? 'journey-surface border-y border-line bg-sand/25 px-6 py-16 md:py-24' : 'journey-surface bg-surface-raised px-6 py-16 md:py-24'}>
    {media && <div className="relative mx-auto mb-10 aspect-[16/6] max-w-5xl overflow-hidden rounded-2xl"><Image src={media.url} alt={media.alt} fill unoptimized sizes="(min-width: 1024px) 1024px, 100vw" className="object-cover" style={{ objectPosition: `${media.x}% ${media.y}%` }} /></div>}
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-sm font-semibold text-burgundy">{content.eyebrow}</p>
      <h2 className="mt-5 font-heading text-3xl leading-snug font-bold text-deep-teal sm:text-4xl">{content.heading}</h2>
      <p className="mx-auto mt-5 max-w-2xl text-base leading-[2] text-text-soft sm:text-lg">{content.body}</p>
    </div>
  </section>
}
