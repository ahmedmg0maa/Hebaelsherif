import type { Metadata } from 'next'
import { listArticles } from '@/lib/data/catalog'
import { PageHero } from '@/components/catalog/PageHero'
import { Section } from '@/components/ui/Section'
import { ArticleCard } from '@/components/catalog/ArticleCard'
import { EmptyState } from '@/components/ui/EmptyState'

export const metadata: Metadata = {
  title: 'المقالات',
  description: 'مقالات منشورة من المنصة في الوعي والنمو الهادئ.',
}

export const revalidate = 300

export default async function ArticlesPage() {
  const articles = await listArticles()

  return (
    <main>
      <PageHero
        eyebrow="المدونة"
        title="قراءات ترافق فنجان قهوتك"
        lead="اقرئي المقالات المنشورة عندما تتوفر، وعودي إلى المسارات الرئيسية في أي وقت."
      />

      <Section>
        {articles.length === 0 ? (
          <EmptyState
            title="لا توجد مقالات بعد"
            description="ستظهر المقالات هنا عند نشرها من إدارة المنصة."
            actionLabel="ابدئي من هنا"
            actionHref="/start-here"
          />
        ) : (
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
            {articles.map((a) => (
              <ArticleCard key={a.slug} article={a} headingLevel={2} />
            ))}
          </div>
        )}
      </Section>
    </main>
  )
}
