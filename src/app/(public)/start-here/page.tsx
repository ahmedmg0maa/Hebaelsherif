import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHero } from '@/components/catalog/PageHero'
import { Section } from '@/components/ui/Section'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { CTARibbon } from '@/components/catalog/CTARibbon'
import { StartHereQuiz } from '@/components/catalog/StartHereQuiz'
import { getStartHereContent } from '@/lib/data/start-here'
import { getPublishedGuidedAssessment } from '@/lib/data/assessments'
import { defaultGuidedAssessmentContent } from '@/lib/assessments/governance'

export const metadata: Metadata = {
  title: 'ابدئي من هنا',
  description: 'دليلك المختصر لاختيار نقطة البداية الأنسب لك في المنصة.',
}

export default async function StartHerePage() {
  const [content, assessment] = await Promise.all([getStartHereContent(), getPublishedGuidedAssessment()])
  return (
    <main>
      <PageHero compact
        eyebrow={content.hero.eyebrow}
        title={content.hero.title}
        lead={content.hero.lead}
      >
        <p className="mt-4 text-sm font-semibold text-deep-teal">{(assessment?.content.questions.length ?? defaultGuidedAssessmentContent.questions.length).toLocaleString('ar-EG')} أسئلة قصيرة · بدون حساب أو شراء</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button href="#start-guide">ساعديني أختار</Button>
          <Button href="#start-paths" variant="secondary">أفضل التصفح مباشرة</Button>
        </div>
      </PageHero>

      <section id="start-guide" aria-label="دليل اختيار البداية" className="journey-surface bg-ivory px-5 py-12 sm:px-8">
        <StartHereQuiz content={assessment?.content ?? defaultGuidedAssessmentContent} version={assessment?.version} />
      </section>

      <Section id="start-paths" tone="white" eyebrow="اختياركِ المباشر" title="تعرفين كيف تحبين أن تبدئي؟" lead="اختاري طريقة تناسبكِ، واطلعي على تفاصيلها قبل الحجز أو الشراء.">
        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
          {content.paths.map((p, index) => (
            <Card key={p.href} hover className="group flex flex-col">
              <span aria-hidden className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-line bg-ivory text-sm font-semibold text-burgundy">{(index + 1).toLocaleString('ar-EG')}</span>
              <h2 className="text-xl font-bold leading-relaxed text-deep-teal">«{p.title}»</h2>
              <p className="mt-3 flex-1 leading-relaxed text-text-soft">{p.text}</p>
              <Link prefetch={false} href={p.href} className="mt-5 inline-flex min-h-12 items-center gap-2 font-semibold text-burgundy">
                {p.cta}
                <svg viewBox="0 0 20 20" className="h-4 w-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <path d="M12 5l-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </Card>
          ))}
        </div>
      </Section>

      <CTARibbon
        title={content.closing.title}
        lead={content.closing.lead}
        ctaLabel={content.closing.ctaLabel}
        ctaHref={content.closing.ctaHref}
      />
    </main>
  )
}
