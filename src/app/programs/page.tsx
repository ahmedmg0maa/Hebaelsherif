export const dynamic = 'force-dynamic'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import PremiumButton from '@/components/ui/PremiumButton'

const pathways = [
  {
    title: 'اختيار البداية المناسبة',
    text: 'جلسة هادئة تساعدك على فهم المرحلة الحالية وتحديد الخطوة الأقرب لكِ دون تشتت.',
    action: 'احجزي جلسة توجيه',
    href: '/booking',
  },
  {
    title: 'متابعة أعمق بعد الجلسة',
    text: 'بعد وضوح الاحتياج، يمكن اقتراح متابعة مناسبة من الجلسات أو المحتوى عند توفره.',
    action: 'تواصلي معنا',
    href: '/contact',
  },
  {
    title: 'قائمة انتظار المحتوى',
    text: 'انضمي لقائمة الاهتمام لتصلكِ المسارات التعليمية والإصدارات الرقمية فور اعتمادها.',
    action: 'انضمي للقائمة',
    href: '/courses',
  },
]

export default function ProgramsPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20">
        <section className="container-premium py-16">
          <p className="mini-label">المسارات</p>
          <h1 className="mt-4 max-w-3xl text-5xl font-black leading-tight text-charcoal md:text-6xl">اختاري مسارًا يبدأ من احتياجك الحقيقي</h1>
          <p className="mt-5 max-w-2xl text-sm leading-8 text-warm-gray">
            هذه الصفحة تساعدك على الاقتراب من الخطوة المناسبة لكِ: جلسة توجيه، متابعة أعمق، أو انتظار المحتوى القادم عندما يكون جاهزًا للإطلاق.
          </p>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {pathways.map((pathway) => (
              <article key={pathway.title} className="premium-glow-border rounded-[2rem] border border-sand bg-ivory/90 p-7 shadow-soft dark:bg-deep-teal/55">
                <h2 className="text-2xl font-black text-charcoal">{pathway.title}</h2>
                <p className="mt-4 text-sm leading-8 text-warm-gray">{pathway.text}</p>
                <PremiumButton href={pathway.href} className="mt-6">{pathway.action}</PremiumButton>
              </article>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
