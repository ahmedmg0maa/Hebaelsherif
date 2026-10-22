import { Section } from '@/components/ui/Section'
import { ArticleCard } from '@/components/catalog/ArticleCard'
import { Button } from '@/components/ui/Button'
import type { HomeArticle } from '@/lib/data/home'
import { DEFAULT_HOME_CONTENT, type ArticlesContent } from '@/lib/home/sections'

export function FeaturedArticles({ articles, content = DEFAULT_HOME_CONTENT.articles as ArticlesContent }: { articles: HomeArticle[]; content?: ArticlesContent }) {
  if (articles.length === 0) return null
  return (
    <Section tone="white" eyebrow={content.eyebrow} title={content.heading} lead={content.lead}>
      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        {articles.map((a, index) => (
          <ArticleCard key={a.slug} article={a} featured={index === 0} className={index === 0 ? 'lg:row-span-2' : 'lg:flex-row lg:[&>div:first-child:not(:only-child)]:w-[36%] lg:[&>div:first-child:not(:only-child)]:shrink-0'} />
        ))}
      </div>
      <div className="mt-10 text-center">
        <Button href="/articles" variant="secondary">
          {content.ctaLabel}
        </Button>
      </div>
    </Section>
  )
}
