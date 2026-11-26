import Image from 'next/image'

const heroVisuals = [
  '/brand/catalog-still-life.webp',
  '/images/learning/learning-desk.webp',
  '/images/learning/learning-desk.webp',
  '/brand/catalog-still-life.webp',
  '/brand/catalog-still-life.webp',
]

function selectVisual(eyebrow: string, title: string) {
  const copy = `${eyebrow} ${title}`
  if (/كتب|كتاب|قراءة/.test(copy)) return '/brand/books-reading-v2.webp'
  if (/دورات|تعلم|كورس|ورش/.test(copy)) return heroVisuals[2]
  if (/مقال|موارد|بحث|مصادر/.test(copy)) return heroVisuals[4]
  if (/حجز|جلسة|تواصل/.test(copy)) return heroVisuals[0]
  return heroVisuals[1]
}

export function PageHero({
  eyebrow,
  title,
  lead,
  children,
  compact = false,
}: {
  eyebrow: string
  title: string
  lead: string
  children?: React.ReactNode
  compact?: boolean
}) {
  const visual = selectVisual(eyebrow, title)
  return (
    <section className="journey-surface relative isolate overflow-hidden border-b border-line bg-surface-raised dark:border-on-dark/10">
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_22%,color-mix(in_srgb,var(--color-aqua)_3%,transparent),transparent_30%),radial-gradient(circle_at_88%_80%,color-mix(in_srgb,var(--color-antique-gold)_5%,transparent),transparent_34%)]" aria-hidden />
      <div className={`relative mx-auto grid max-w-[1360px] gap-6 px-5 py-8 sm:px-8 ${compact ? 'lg:py-8' : 'lg:min-h-[340px] lg:grid-cols-[1.2fr_.8fr] lg:gap-12 lg:py-10'}`}>
        <div className="flex items-center py-4 lg:py-8">
          <div className="max-w-2xl text-start">
            <p className="mb-4 flex items-center gap-3 text-sm font-semibold text-burgundy">
              <span className="h-px w-10 bg-current opacity-55" aria-hidden />
              {eyebrow}
            </p>
            <h1 className="text-balance font-heading text-4xl leading-snug font-bold text-deep-teal md:text-5xl">{title}</h1>
            <p className="mt-4 max-w-2xl text-base leading-loose text-text-soft md:text-lg">{lead}</p>
            {children}
          </div>
        </div>
        {!compact && <div className="group relative min-h-[180px] overflow-hidden rounded-2xl border border-line lg:min-h-[260px] dark:border-on-dark/10">
          <Image src={visual} alt="" fill unoptimized sizes="(min-width: 1360px) 480px, (min-width: 1024px) 40vw, 100vw" className="object-cover transition-transform duration-700 motion-safe:group-hover:scale-[1.035]" />
          <span className="pointer-events-none absolute inset-0 bg-linear-to-t from-[#082730]/48 via-transparent to-transparent lg:bg-linear-to-l lg:from-surface-raised/52 dark:from-[#071C23]/68" aria-hidden />
          <span className="pointer-events-none absolute inset-5 rounded-[1.75rem] border border-on-dark/38 lg:inset-7 lg:rounded-[2.25rem]" aria-hidden />
        </div>}
      </div>
    </section>
  )
}
