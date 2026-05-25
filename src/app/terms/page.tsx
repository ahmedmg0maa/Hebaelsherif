export const dynamic = 'force-dynamic'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import PremiumButton from '@/components/ui/PremiumButton'
import { LEGAL_PAGES } from '@/constants/content'

const page = LEGAL_PAGES.terms

export const metadata = {
  title: page.title,
  description: page.description,
}

export default function LegalPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20">
        <section className="container-premium max-w-4xl py-16">
          <p className="mini-label">Legal</p>
          <h1 className="mt-5 text-4xl font-black leading-tight text-charcoal md:text-6xl">{page.title}</h1>
          <p className="mt-5 text-lg leading-9 text-warm-gray">{page.description}</p>
          <div className="mt-10 space-y-4">
            {page.sections.map(([title, content]) => (
              <section key={title} className="rounded-[2rem] border border-sand bg-ivory/90 p-6 shadow-soft backdrop-blur-sm">
                <h2 className="text-xl font-black text-charcoal">{title}</h2>
                <p className="mt-3 text-sm leading-8 text-warm-gray">{content}</p>
              </section>
            ))}
          </div>
          <div className="mt-10">
            <PremiumButton href="/contact" variant="outline">تواصل معنا</PremiumButton>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
