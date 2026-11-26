import type { ResolvedHomeMedia } from '@/lib/home/media'
import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { DEFAULT_HOME_CONTENT, type EditorialFeatureContent } from '@/lib/home/sections'

export function EditorialFeature({ content = DEFAULT_HOME_CONTENT.editorial_feature as EditorialFeatureContent, media }: { content?: EditorialFeatureContent; media?: ResolvedHomeMedia }) {
  return (
    <section className="px-4 py-8 sm:px-6 sm:py-12">
      <div className="relative mx-auto grid max-w-7xl overflow-hidden rounded-[2rem] border border-antique-gold/30 bg-deep-teal shadow-[0_28px_80px_rgb(15_48_57_/_0.18)] lg:grid-cols-[1.15fr_.85fr]">
        <div className="relative min-h-72 lg:min-h-[430px]">
          <Image
            src={media?.url ?? "/brand/catalog-still-life.webp"}
            alt={media?.alt ?? "كتب ودفتر ومساحة تعلم هادئة بألوان هوية هبة الشريف"}
            unoptimized
            fill
            sizes="(min-width: 1024px) 58vw, 100vw"
            className="object-cover"
            style={{ objectPosition: `${media?.x ?? 55}% ${media?.y ?? 50}%` }}
          />
          <span className="absolute inset-0 bg-linear-to-t from-deep-teal/45 via-transparent to-transparent lg:bg-linear-to-l" />
        </div>
        <div className="relative flex flex-col justify-center px-6 py-10 text-on-dark sm:px-10 lg:px-12">
          <span className="pointer-events-none absolute end-10 top-0 h-28 w-px bg-linear-to-b from-antique-gold/60 to-transparent" aria-hidden />
          <span className="pointer-events-none absolute end-10 top-28 h-px w-28 bg-linear-to-l from-antique-gold/60 to-transparent" aria-hidden />
          <p className="text-xs font-bold tracking-[.18em] text-antique-gold">{content.eyebrow}</p>
          <h2 className="relative mt-4 text-3xl leading-snug font-bold sm:text-4xl">{content.heading}</h2>
          <p className="relative mt-4 leading-loose text-on-dark/72">
            {content.body}
          </p>
          <div className="relative mt-7 flex flex-wrap gap-3">
            <Button href={content.primaryHref} className="bg-antique-gold text-deep-teal hover:bg-muted-gold">{content.primaryLabel}</Button>
            <Button href={content.secondaryHref} variant="inverse">{content.secondaryLabel}</Button>
          </div>
        </div>
      </div>
    </section>
  )
}
