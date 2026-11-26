import type { Metadata } from 'next'
import { TrustStrip } from '@/components/home/TrustStrip'
import { Section } from '@/components/ui/Section'
import { Button } from '@/components/ui/Button'
import { CTARibbon } from '@/components/catalog/CTARibbon'
import { PageHero } from '@/components/catalog/PageHero'
import { getOwnerProfile } from '@/lib/data/cms'

export const metadata: Metadata = {
  title: 'عن هبة الشريف',
  description: 'تعرّفي على هبة الشريف ورسالتها في مرافقة النساء نحو نموّ هادئ وواعٍ.',
}

export default async function AboutPage() {
  const profile=await getOwnerProfile()
  return (
    <main>
      <PageHero
        eyebrow={profile.eyebrow}
        title={profile.title}
        lead={profile.lead}
      >
        <p className="mx-auto mt-3 max-w-2xl text-base leading-loose text-text-soft">
          {profile.method}
        </p>
        <div className="mt-7 flex flex-wrap gap-3 sm:gap-4">
          <Button href="/start-here" size="lg">ابدئي من هنا</Button>
          <Button href="/booking" variant="secondary" size="lg">استكشفي الجلسات</Button>
        </div>
      </PageHero>

      <TrustStrip profile={profile} />
      <Section eyebrow="ما نؤمن به" title="قيم تحكم ما نقدمه">
        <div className="grid gap-6 md:grid-cols-3">
          {profile.values.map((v, i) => (
            <div key={v.title} className="rounded-3xl border border-line bg-surface-raised p-8 text-center shadow-card">
              <span className="tnum mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-antique-gold/15 font-heading text-xl font-bold text-burgundy">
                {(i + 1).toLocaleString('ar-EG')}
              </span>
              <h3 className="text-xl font-bold text-deep-teal">{v.title}</h3>
              <p className="mt-3 leading-relaxed text-text-soft">{v.text}</p>
            </div>
          ))}
        </div>
      </Section>

      <CTARibbon />
    </main>
  )
}
