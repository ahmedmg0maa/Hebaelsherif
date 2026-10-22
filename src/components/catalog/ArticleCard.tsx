import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/cn'
import { articleDate } from '@/lib/articles/presentation'
import type { HomeArticle } from '@/lib/data/home'

export function ArticleCard({ article, featured = false, headingLevel = 3, className }: { article: HomeArticle; featured?: boolean; headingLevel?: 2 | 3; className?: string }) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3'
  const date = articleDate(article.publishedAt)
  return <article className={cn('group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface-raised transition-shadow hover:shadow-card', className)}>
    {article.coverUrl ? <div className={cn('relative overflow-hidden bg-sand', featured ? 'aspect-[16/10]' : 'aspect-[16/9]')}>
      <Image src={article.coverUrl} alt="" fill unoptimized sizes={featured ? '(min-width: 1024px) 55vw, 100vw' : '(min-width: 768px) 33vw, 100vw'} className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.03]" />
    </div> : <span aria-hidden className="mx-6 mt-6 h-px w-12 bg-antique-gold" />}
    <div className={cn('flex flex-1 flex-col p-6', featured && 'sm:p-8')}>
      <div className="mb-4 flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-soft">
        {date && <time dateTime={article.publishedAt!}>{date}</time>}
        <span>قراءة نحو {article.readingMinutes.toLocaleString('ar-EG')} د</span>
      </div>
      <Heading className={cn('font-heading text-2xl leading-snug font-bold text-deep-teal', featured && 'sm:text-3xl')}><Link href={`/articles/${article.slug}`} className="hover:text-burgundy">{article.title}</Link></Heading>
      <p className="mt-3 flex-1 text-base leading-loose text-text-soft">{article.excerpt}</p>
      <Link href={`/articles/${article.slug}`} aria-label={`اقرئي المقال: ${article.title}`} className="mt-5 inline-flex min-h-12 items-center gap-3 self-start text-sm font-semibold text-burgundy">اقرئي المقال <span aria-hidden>←</span></Link>
    </div>
  </article>
}
