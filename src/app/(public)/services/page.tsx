import type { Metadata } from 'next'
import { listServices, formatPrice, formatDuration, weekdayNames } from '@/lib/data/catalog'
import { PageHero } from '@/components/catalog/PageHero'
import { ServiceCards } from '@/components/home/ServiceCards'
import { CTARibbon } from '@/components/catalog/CTARibbon'
import { Section } from '@/components/ui/Section'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { listPublishedPrograms } from '@/lib/data/programs'
import { ProgramCard } from '@/components/catalog/ProgramCard'

export const metadata: Metadata = {
  title: 'الخدمات',
  description: 'دورات، كتب، ورش عمل، وجلسات فردية — اختاري الشكل الأنسب لرحلتك.',
}

export const revalidate = 300

export default async function ServicesPage() {
  const services = await listServices()
  const plans = (await listPublishedPrograms()).filter((program) => program.type === 'vip')

  return (
    <main>
      <PageHero
        eyebrow="خدماتنا"
        title="مسارات مختلفة، وجهة واحدة"
        lead="قارني الجلسات والدورات والقراءات، واختاري الشكل الذي يناسب سؤالكِ ووقتكِ."
      />
      <ServiceCards />

      <Section tone="white" eyebrow="المرافقة الفردية" title="الجلسات الفردية">
        <div className="mx-auto max-w-3xl space-y-6">
          {services.length === 0 ? <EmptyState
            title="لا توجد جلسات منشورة حاليًا"
            description="الجلسات غير متاحة للحجز حاليًا. يمكنكِ الاطلاع على خيارات البداية الأخرى."
            actionLabel="ابدئي من هنا"
            actionHref="/start-here"
          /> : services.map((s) => (
            <Card key={s.slug} className="flex flex-col gap-6 md:flex-row md:items-center">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-deep-teal">{s.title}</h3>
                <p className="mt-1 text-sm text-text-soft">{s.subtitle}</p>
                <p className="mt-2 text-sm leading-relaxed text-text-soft">{s.description}</p>
                <ul className="tnum mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-taupe">
                  <li>{formatDuration(s.durationMinutes)}</li>
                  {s.availability.map((a) => (
                    <li key={`${a.weekday}-${a.startTime}`}>{weekdayNames[a.weekday]}</li>
                  ))}
                </ul>
              </div>
              <div className="flex shrink-0 flex-col items-center gap-3">
                <span className="tnum text-xl font-bold text-burgundy">{formatPrice(s.price)}</span>
                <Button href={`/booking?service=${encodeURIComponent(s.slug)}`} size="sm">
                  اختاري موعدك
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      {plans.length > 0 && <Section eyebrow="مرافقة مستمرة" title="باقات تناسب إيقاعك" lead="تعرّفي على ما تتضمنه كل باقة ومدتها وأسعارها قبل الاختيار.">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{plans.map((plan) => <ProgramCard key={plan.id} program={plan}/>)}</div>
      </Section>}

      <CTARibbon />
    </main>
  )
}
