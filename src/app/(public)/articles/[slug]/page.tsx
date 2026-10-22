import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { articleDate } from '@/lib/articles/presentation'
import { notFound } from 'next/navigation'
import { getArticle } from '@/lib/data/catalog'
import { CTARibbon } from '@/components/catalog/CTARibbon'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await getArticle((await params).slug)
  return article ? { title: article.title, description: article.excerpt } : { title: 'مقال غير موجود' }
}

export const revalidate = 300

export default async function ArticlePage({ params }: Props) {
  const article = await getArticle((await params).slug)
  if (!article) notFound()

  return (
    <main>
      <article className="mx-auto max-w-2xl px-6 py-16">
        <header className="mb-10 text-center">
          <Link href="/articles" className="text-sm font-semibold text-antique-gold hover:text-burgundy">
            المدونة
          </Link>
          <h1 className="mt-3 text-4xl leading-snug font-bold text-deep-teal">{article.title}</h1>
          {articleDate(article.publishedAt) && (
            <time dateTime={article.publishedAt!} className="tnum mt-3 block text-sm text-taupe">
              {articleDate(article.publishedAt)}
            </time>
          )}
          <p className="mt-3 text-sm text-text-soft">قراءة نحو {article.readingMinutes.toLocaleString('ar-EG')} دقائق</p>
          <span className="mx-auto mt-6 block h-px w-16 bg-antique-gold" aria-hidden />
        </header>
        {article.coverUrl && <div className="relative mb-10 aspect-[16/10] overflow-hidden rounded-2xl bg-sand"><Image src={article.coverUrl} alt="" fill unoptimized sizes="(min-width: 768px) 624px, 100vw" className="object-cover" /></div>}
        <div className="space-y-6 text-lg leading-loose text-ink">
          {article.content.split('\n').map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </article>

      <CTARibbon
        title="أعجبك المقال؟"
        lead="اكتشفي مسارات تساعدكِ على متابعة الفهم والتطبيق."
        ctaLabel="استكشفي الدورات"
        ctaHref="/courses"
      />
    </main>
  )
}
