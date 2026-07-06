export const dynamic = 'force-dynamic'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import FAQSection from '@/components/marketing/FAQSection'

export default function FAQPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20">
        <section className="container-premium py-16">
          <FAQSection />
        </section>
      </main>
      <Footer />
    </>
  )
}
