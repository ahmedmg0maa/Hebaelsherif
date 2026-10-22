import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHero } from '@/components/catalog/PageHero'
import { Section } from '@/components/ui/Section'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { searchPublishedContent, type PublicSearchKind } from '@/lib/search/public-search'

export const metadata: Metadata = {
  title: 'البحث',
  description: 'ابحثي داخل المحتوى والخدمات المنشورة في المنصة.',
  robots: { index: false, follow: true },
}

export const revalidate = 0

const labels: Record<PublicSearchKind, string> = {
  course: 'دورة',
  book: 'كتاب',
  workshop: 'ورشة',
  service: 'جلسة',
  article: 'مقال',
  resource: 'مورد',
  program: 'برنامج/باقة',
}

type Props = { searchParams: Promise<{ q?: string | string[] }> }

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams
  const rawQuery = Array.isArray(params.q) ? params.q[0] ?? '' : params.q ?? ''
  const { query, results } = await searchPublishedContent(rawQuery)

  return <main>
    <PageHero compact eyebrow="بحث واضح" title="ما الذي تبحثين عنه؟" lead="ابحثي بكلمة عن موضوع يهمكِ أو باسم خدمة، لتصلي إلى ما تحتاجينه بسهولة." />
    <Section>
      <form role="search" method="get" action="/search" className="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-line bg-surface-raised p-4 shadow-card sm:flex-row">
        <label htmlFor="public-search" className="sr-only">كلمة البحث</label>
        <input id="public-search" name="q" type="search" minLength={2} maxLength={80} defaultValue={rawQuery.slice(0, 80)} placeholder="مثال: حدود، كتاب، أو جلسة" className="min-h-12 flex-1 rounded-xl border border-line bg-ivory px-4 text-ink outline-none focus:border-deep-teal focus:ring-2 focus:ring-aqua/30" />
        <button type="submit" className="min-h-12 rounded-xl bg-deep-teal px-7 font-bold text-on-dark transition-colors hover:bg-burgundy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep-teal">بحث</button>
      </form>

      <div className="mx-auto mt-10 max-w-5xl" aria-live="polite">
        {!query ? <EmptyState title="اكتبي ما تبحثين عنه" description="اكتبي حرفين على الأقل، أو اسم الموضوع الذي يهمكِ." actionLabel="استكشفي المسارات" actionHref="/services" />
          : query.length < 2 ? <EmptyState title="كلمة البحث قصيرة" description="اكتبي حرفين على الأقل للحصول على نتائج مفيدة." />
          : results.length === 0 ? <EmptyState title="لا توجد نتائج منشورة" description={`لم نجد محتوى منشورًا يطابق «${query}». جرّبي كلمة أبسط أو عودي إلى المسارات.`} actionLabel="ابدئي من هنا" actionHref="/start-here" />
          : <>
            <p className="mb-5 text-sm font-semibold text-text-soft">{results.length.toLocaleString('ar-EG')} نتيجة منشورة لعبارة «{query}»</p>
            <div className="grid gap-5 md:grid-cols-2">
              {results.map((result) => <Card key={`${result.kind}-${result.href}`} hover as="article" className="flex flex-col">
                <p className="text-xs font-bold text-antique-gold">{labels[result.kind]}</p>
                <h2 className="mt-2 text-xl font-bold text-deep-teal"><Link href={result.href} className="focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-deep-teal">{result.title}</Link></h2>
                <p className="mt-3 line-clamp-3 flex-1 leading-loose text-text-soft">{result.summary}</p>
                <Link href={result.href} className="mt-5 font-semibold text-burgundy">عرض التفاصيل ←</Link>
              </Card>)}
            </div>
          </>}
      </div>
    </Section>
  </main>
}
