import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHero } from '@/components/catalog/PageHero'
import { EmptyState } from '@/components/ui/EmptyState'
import { PressCard } from '@/components/press/PressCard'
import { listPublishedPress } from '@/lib/data/press'
import { PRESS_KINDS, PRESS_KIND_LABELS, type PressKind } from '@/lib/press/governance'
import { cn } from '@/lib/cn'

export const metadata: Metadata = { title: 'الظهور الإعلامي', description: 'روابط أصلية لظهور هبة الشريف الإعلامي والحوارات والفعاليات، مع توضيح نوع المصدر.' }
export const revalidate = 300

export default async function PressPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams
  const selected = PRESS_KINDS.includes(kind as PressKind) ? kind as PressKind : undefined
  const mentions = await listPublishedPress(selected)
  return <main><PageHero eyebrow="مصادر أصلية" title="حوارات ومشاركات هبة" lead="كل سجل يقود إلى مصدره الأصلي ويبيّن بوضوح إن كان تحريرًا مستقلًا أو تعاونًا أو قناة مملوكة أو فعالية." />
    <section className="mx-auto max-w-6xl px-6 py-12 md:py-16" aria-labelledby="press-list-title">
      <div className="mb-8 flex flex-col gap-5 border-b border-line pb-7 md:flex-row md:items-end md:justify-between"><div><p className="text-sm font-bold text-antique-gold">الأحدث أولًا</p><h2 id="press-list-title" className="mt-2 text-3xl font-bold text-deep-teal">المصادر المنشورة</h2></div><nav className="flex flex-wrap gap-2" aria-label="تصفية الظهور حسب النوع"><Link href="/press" aria-current={!selected ? 'page' : undefined} className={cn('rounded-full border px-4 py-2 text-sm font-semibold', !selected ? 'border-deep-teal bg-deep-teal text-on-dark' : 'border-line text-deep-teal')}>الكل</Link>{PRESS_KINDS.map((item) => <Link key={item} href={`/press?kind=${item}`} aria-current={selected === item ? 'page' : undefined} className={cn('rounded-full border px-4 py-2 text-sm font-semibold', selected === item ? 'border-deep-teal bg-deep-teal text-on-dark' : 'border-line text-deep-teal')}>{PRESS_KIND_LABELS[item]}</Link>)}</nav></div>
      {mentions.length ? <div className="space-y-6">{mentions.map((mention) => <PressCard key={mention.id} mention={mention} />)}</div> : <EmptyState title="لا توجد مصادر موثقة منشورة في هذا القسم" description="لا توجد مشاركات متاحة في هذا القسم حاليًا. يمكنكِ التعرف على هبة وطريقتها في العمل." actionLabel="تعرّفي على هبة" actionHref="/about" />}
    </section>
  </main>
}
