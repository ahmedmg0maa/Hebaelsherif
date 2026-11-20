import type { Metadata } from 'next'
import { listServices } from '@/lib/data/catalog'
import { PageHero } from '@/components/catalog/PageHero'
import { ServiceCards } from '@/components/home/ServiceCards'
import { CTARibbon } from '@/components/catalog/CTARibbon'
import { Section } from '@/components/ui/Section'
import { EmptyState } from '@/components/ui/EmptyState'
import { listPublishedPrograms } from '@/lib/data/programs'
import { ProgramCard } from '@/components/catalog/ProgramCard'
import { SessionOptions } from '@/components/catalog/SessionOptions'

export const metadata: Metadata = {
  title: 'الخدمات',
  description: 'دورات، كتب، ورش عمل، وجلسات فردية — اختاري الشكل الأنسب لرحلتك.',
}

export const revalidate = 300

export default async function ServicesPage() {
  const [services, programs] = await Promise.all([listServices(), listPublishedPrograms()])
  const plans = programs.filter((program) => program.type === 'vip')

  return (
    <main>
      <PageHero
        eyebrow="خدماتنا"
        title="مسارات مختلفة، وجهة واحدة"
        lead="قارني الجلسات والدورات والقراءات، واختاري الشكل الذي يناسب سؤالكِ ووقتكِ."
      />
      <ServiceCards />

      <Section id="individual-sessions" className="scroll-mt-24" tone="white" title="الجلسات الفردية">
        <div className="mx-auto max-w-4xl">
          {services.length === 0 ? <EmptyState
            title="لا توجد جلسات منشورة حاليًا"
            description="الجلسات غير متاحة للحجز حاليًا. يمكنكِ الاطلاع على خيارات البداية الأخرى."
            actionLabel="ابدئي من هنا"
            actionHref="/start-here"
          /> : <div className="rounded-3xl border border-on-dark/15 bg-[#173C48] p-5 text-on-dark shadow-card sm:p-8">
            <SessionOptions services={services} detailed />
          </div>}
        </div>
      </Section>

      {plans.length > 0 && <Section eyebrow="مرافقة مستمرة" title="باقات تناسب إيقاعك" lead="تعرّفي على ما تتضمنه كل باقة ومدتها وأسعارها قبل الاختيار.">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{plans.map((plan) => <ProgramCard key={plan.id} program={plan}/>)}</div>
      </Section>}

      <CTARibbon />
    </main>
  )
}
