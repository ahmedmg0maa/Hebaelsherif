export const dynamic = 'force-dynamic'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import PremiumSection from '@/components/ui/PremiumSection'
import { ARTICLES } from '@/constants/content'

export const metadata = {
  title: 'المقالات',
  description: 'مقالات عربية هادئة عن الوعي العاطفي، العلاقات، الحدود، والجلسات.',
}

export default function ArticlesPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20">
        <section className="container-premium py-16">
          <PremiumSection eyebrow="مقالات" title="مكتبة وعي عاطفي قابلة للنمو" description="قراءات هادئة تساعدك على فهم الحدود، التعلق، والعلاقات بلغة واضحة وغير مرهقة.">
            <div className="grid gap-5 md:grid-cols-3">
              {ARTICLES.map((article) => (
                <Link key={article.slug} href={`/articles/${article.slug}`} className="interactive-lift rounded-[2rem] border border-sand bg-ivory/90 p-6 shadow-soft backdrop-blur-sm">
                  <p className="text-xs font-black text-gold">{article.category} · {article.readingTime}</p>
                  <h2 className="mt-4 text-2xl font-black leading-tight text-charcoal">{article.title}</h2>
                  <p className="mt-4 text-sm leading-8 text-warm-gray">{article.excerpt}</p>
                  <span className="mt-6 inline-flex rounded-full bg-petrol px-5 py-2 text-xs font-black text-ivory">قراءة المقال</span>
                </Link>
              ))}
            </div>
          </PremiumSection>
        </section>
      </main>
      <Footer />
    </>
  )
}
