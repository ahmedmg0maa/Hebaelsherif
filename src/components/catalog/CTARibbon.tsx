import { Button } from '@/components/ui/Button'

export function CTARibbon({
  title = 'جاهزة لخطوتك التالية؟',
  lead = 'اختاري خطوة واضحة تناسب مرحلتك وإيقاعك الحالي.',
  ctaLabel = 'ابدئي الآن',
  ctaHref = '/courses',
}: {
  title?: string
  lead?: string
  ctaLabel?: string
  ctaHref?: string
}) {
  return (
    <section className="relative overflow-hidden bg-deep-teal px-5 py-16 sm:px-8">
      {/* gold hairline + seed hue glow for a premium finish */}
      <span className="absolute inset-x-0 top-0 h-px bg-linear-to-l from-transparent via-antique-gold to-transparent" aria-hidden />
      <span className="pointer-events-none absolute -end-24 -top-24 h-64 w-64 rounded-full bg-aqua/10 blur-3xl" aria-hidden />
      <div className="relative mx-auto flex max-w-5xl flex-col items-center justify-between gap-6 text-center md:flex-row md:text-start">
        <div>
          <h2 className="font-heading text-3xl font-bold leading-snug text-on-dark md:text-4xl">{title}</h2>
          <p className="mt-2 text-on-dark/75">{lead}</p>
        </div>
        <Button href={ctaHref} variant="gold" size="lg" className="shimmer shrink-0">
          {ctaLabel}
        </Button>
      </div>
    </section>
  )
}
