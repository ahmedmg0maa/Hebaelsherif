import { notFound } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import PremiumButton from '@/components/ui/PremiumButton'
import { ARTICLES } from '@/constants/content'

export const dynamic = 'force-dynamic'


export function generateMetadata({ params }: { params: { slug: string } }) {
  const article = ARTICLES.find((item) => item.slug === params.slug)
  return {
    title: article?.title || 'مقال',
    description: article?.excerpt || 'مقال من منصة هبة الشريف',
  }
}

export default function ArticleDetailsPage({ params }: { params: { slug: string } }) {
  const article = ARTICLES.find((item) => item.slug === params.slug)
  if (!article) notFound()

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20">
        <article className="container-premium max-w-4xl py-16">
          <p className="mini-label">{article.category} · {article.readingTime}</p>
          <h1 className="mt-5 text-balance text-4xl font-black leading-tight text-charcoal md:text-6xl">{article.title}</h1>
          <p className="mt-5 text-lg leading-10 text-warm-gray">{article.excerpt}</p>
          <div className="reading-surface mt-10 rounded-[2rem] border border-sand p-6 shadow-soft md:p-10">
            {article.content.map((paragraph) => (
              <p key={paragraph} className="mb-6 text-base leading-10 text-charcoal last:mb-0">{paragraph}</p>
            ))}
          </div>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <PremiumButton href="/booking">احجزي جلسة</PremiumButton>
            <PremiumButton href="/articles" variant="outline">كل المقالات</PremiumButton>
          </div>
        </article>
      </main>
      <Footer />
    </>
  )
}
