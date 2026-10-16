import Image from 'next/image'
import Link from 'next/link'
import type { HomeResource } from '@/lib/data/home'
import type { ArticlesContent } from '@/lib/home/sections'
import { Badge } from '@/components/ui/Badge'
import { RESOURCE_KIND_LABELS, type ResourceKind } from '@/lib/resources/governance'

const visuals = [
  '/images/experience/book-listen-inward.webp',
  '/brand/catalog-still-life.webp',
  '/images/experience/editorial-reflection-studio.webp',
] as const

export function FeaturedResources({ resources, content }: { resources: HomeResource[]; content: ArticlesContent }) {
  if (!resources.length) return null
  return (
    <section className="section-atmosphere relative isolate overflow-hidden border-y border-line bg-ivory px-6 py-14 md:py-20">
      <span className="pointer-events-none absolute -end-32 -top-36 h-96 w-96 rounded-full bg-aqua/10 blur-3xl" aria-hidden />
      <div className="relative mx-auto max-w-6xl">
        <p className="text-sm font-bold tracking-widest text-[#9A7042] dark:text-antique-gold">{content.eyebrow}</p>
        <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-deep-teal md:text-4xl">{content.heading}</h2>
            <p className="mt-3 leading-loose text-text-soft">{content.lead}</p>
          </div>
          <Link href="/resources" className="font-bold text-burgundy underline underline-offset-4">{content.ctaLabel}</Link>
        </div>
        <div className="mt-9 grid gap-5 md:grid-cols-3">
          {resources.map((resource, index) => (
            <article key={resource.id} className="group overflow-hidden rounded-3xl border border-line bg-surface-raised shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-card-hover">
              <div className="relative h-40 overflow-hidden">
                <Image src={visuals[index % visuals.length]} alt="" fill unoptimized sizes="(min-width: 768px) 33vw, 100vw" className="object-cover transition duration-700 group-hover:scale-105" />
                <span className="absolute inset-0 bg-linear-to-t from-[#082730]/50 to-transparent" aria-hidden />
              </div>
              <div className="p-6">
                <div className="flex flex-wrap gap-2">
                  <Badge tone="gold">{RESOURCE_KIND_LABELS[resource.kind as ResourceKind] ?? 'مورد'}</Badge>
                  <Badge tone="sand">{resource.topic}</Badge>
                </div>
                <h3 className="mt-4 text-xl font-bold leading-snug text-deep-teal"><Link href={`/resources/${resource.slug}`}>{resource.title}</Link></h3>
                <p className="mt-3 line-clamp-3 leading-loose text-text-soft">{resource.excerpt}</p>
                <Link href={`/resources/${resource.slug}`} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-burgundy">افتحي المورد <span aria-hidden>←</span></Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
