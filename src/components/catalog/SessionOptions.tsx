import type { CatalogService } from '@/lib/data/catalog'
import { arabicDigits, formatDuration, formatPrice, weekdayNames } from '@/lib/format'
import { Button } from '@/components/ui/Button'

export type SessionOption = Pick<CatalogService, 'slug' | 'title' | 'description' | 'price' | 'durationMinutes' | 'availability'> & { subtitle?: string }

export function SessionOptions({ services, detailed = false }: { services: SessionOption[]; detailed?: boolean }) {
  const description = services[0]?.description
  const sharedDescription = detailed && services.every(service => service.description === description) ? description : undefined

  return (
    <div>
      {sharedDescription && <p className="mb-5 max-w-3xl text-sm leading-loose text-on-dark/90 sm:text-base">{sharedDescription}</p>}
      <ul className="divide-y divide-on-dark/20">
        {services.map(service => {
          const duration = formatDuration(service.durationMinutes)
          const title = arabicDigits(service.title)
          const isDurationTitle = title === `جلسة فردية — ${arabicDigits(String(service.durationMinutes))} دقيقة`
          const days = [...new Set(service.availability.map(rule => weekdayNames[rule.weekday]))].join('، ')
          return (
            <li key={service.slug} className="py-4">
              <div className="flex items-center justify-between gap-3 sm:gap-5">
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-semibold leading-relaxed text-on-dark">{isDurationTitle ? duration : title}</p>
                  <p className="mt-1 flex flex-wrap items-baseline gap-x-3 text-sm leading-relaxed text-muted-gold">
                    {!isDurationTitle && <span>{duration}</span>}
                    <strong className="tnum text-base font-semibold">{service.price === 0 ? 'مجانية' : formatPrice(service.price)}</strong>
                  </p>
                </div>
                <Button href={`/booking?service=${encodeURIComponent(service.slug)}`} variant="inverse" size="sm" className="min-h-12 shrink-0 focus-visible:outline-on-dark">
                  اختاري الموعد<span className="sr-only"> — {isDurationTitle ? duration : title}</span>
                </Button>
              </div>
              {detailed && service.subtitle && <p className="mt-3 text-sm leading-loose text-muted-gold">{service.subtitle}</p>}
              {detailed && !sharedDescription && service.description && <p className="mt-2 text-sm leading-loose text-on-dark/90">{service.description}</p>}
              {detailed && days && <p className="mt-2 text-sm leading-relaxed text-on-dark/80">{days}</p>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
