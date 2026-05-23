import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import PremiumButton from '@/components/ui/PremiumButton'

const programs = [
  { title: 'مسار الوضوح العاطفي', items: 'كورس + كتاب + جلسة 60 دقيقة', price: 'يحدد حسب الباقة' },
  { title: 'مسار الحدود الهادئة', items: 'كورس مركزة + worksheets + متابعة', price: 'متاح كباقة لاحقًا' },
  { title: 'مسار التعافي اللطيف', items: 'جلسات + قراءة موجهة + خطة شخصية', price: 'حسب التوفر' },
]

export default function ProgramsPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20">
        <section className="container-premium py-16">
          <p className="mini-label">المسارات</p>
          <h1 className="mt-4 max-w-3xl text-5xl font-black leading-tight text-charcoal md:text-6xl">برامج تجمع بين التعلم والقراءة والجلسات</h1>
          <p className="mt-5 max-w-2xl text-sm leading-8 text-warm-gray">مسارات مقترحة تجمع بين الجلسات، الكورسات، والكتب عندما تحتاجين رحلة أوسع من خطوة واحدة.</p>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {programs.map((program) => (
              <article key={program.title} className="premium-glow-border rounded-[2rem] border border-sand bg-ivory/90 p-7 shadow-soft">
                <h2 className="text-2xl font-black text-charcoal">{program.title}</h2>
                <p className="mt-4 text-sm leading-8 text-warm-gray">{program.items}</p>
                <p className="mt-6 text-sm font-black text-gold">{program.price}</p>
                <PremiumButton href="/booking" className="mt-6">اسألي عن المسار</PremiumButton>
              </article>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
