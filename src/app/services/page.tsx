export const dynamic = 'force-dynamic'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import PremiumButton from '@/components/ui/PremiumButton'
import PremiumSection from '@/components/ui/PremiumSection'
import ImageSlot from '@/components/ui/ImageSlot'
import PremiumTimeline from '@/components/ui/PremiumTimeline'
import FAQSection from '@/components/marketing/FAQSection'
import { IMAGE_SLOTS, SERVICES } from '@/constants/content'

const journey = [
  { title: 'اختاري نوع المسار', description: 'جلسة واحدة، جلسة عميقة، أو مسار VIP حسب احتياجك الحالي.' },
  { title: 'احجزي موعدًا متاحًا', description: 'التاريخ والوقت يظهران كبطاقات واضحة، مع منع الأيام السابقة والمواعيد المحجوزة.' },
  { title: 'تأكيد الإدارة', description: 'بعد إرسال الطلب، تراجع الإدارة الموعد وتؤكد الجلسة داخل حسابك.' },
  { title: 'خطوة بعد الجلسة', description: 'تخرجين بخطوة عملية أو توصية بمحتوى يناسب المرحلة.' },
]

export const metadata = {
  title: 'الخدمات والجلسات',
  description: 'جلسات فردية ومسارات خاصة وكورسات رقمية داخل منصة هبة الشريف.',
}

export default function ServicesPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20">
        <section className="container-premium grid gap-10 py-16 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <p className="mini-label">الخدمات</p>
            <h1 className="mt-4 text-balance text-5xl font-black leading-tight text-charcoal md:text-7xl">
              اختاري المسار الأقرب لما تحتاجينه الآن
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-10 text-warm-gray">
              الجلسة ليست بديلًا عن العلاج النفسي، لكنها مساحة وعي وتنظيم تساعدك على فهم السؤال العاطفي الأقرب لقلبك.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <PremiumButton href="/booking" size="lg">احجزي جلسة</PremiumButton>
              <PremiumButton href="/courses" variant="outline" size="lg">شاهدي الكورسات</PremiumButton>
            </div>
          </div>
          <ImageSlot fallbackSrc={IMAGE_SLOTS.session} alt="جلسة هبة الشريف" ratio="portrait" label="مساحة بصرية للجلسات" priority />
        </section>

        <section className="border-y border-sand bg-ivory/55">
          <div className="container-premium py-16">
            <PremiumSection eyebrow="الباقات" title="خدمات قابلة للتوسع" description="يمكنكِ البدء بجلسة واحدة أو اختيار مسار أعمق عندما تحتاجين متابعة أكثر تنظيمًا.">
              <div className="grid gap-5 lg:grid-cols-3">
                {SERVICES.map((service) => (
                  <article key={service.slug} className="interactive-lift rounded-[2rem] border border-sand bg-ivory/90 p-6 shadow-soft backdrop-blur-sm">
                    <p className="text-xs font-black text-gold">{service.duration}</p>
                    <h2 className="mt-3 text-2xl font-black text-charcoal">{service.title}</h2>
                    <p className="mt-3 text-sm leading-8 text-warm-gray">{service.description}</p>
                    <strong className="mt-5 block text-lg font-black text-petrol">{service.priceLabel}</strong>
                    <ul className="mt-5 space-y-3">
                      {service.features.map((feature) => (
                        <li key={feature} className="rounded-2xl border border-sand bg-cream/60 px-4 py-3 text-sm font-bold text-charcoal">✦ {feature}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </PremiumSection>
          </div>
        </section>

        <section className="container-premium py-16">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="mini-label">كيف تعمل؟</p>
              <h2 className="mt-4 text-4xl font-black leading-tight text-charcoal">رحلة حجز واضحة من غير ضغط</h2>
              <p className="mt-4 text-sm leading-8 text-warm-gray">كل خطوة في الحجز مصممة لتقليل التشتت: تاريخ، وقت، بيانات، ثم تأكيد.</p>
            </div>
            <PremiumTimeline items={journey} />
          </div>
        </section>

        <section className="container-premium pb-16">
          <FAQSection />
        </section>
      </main>
      <Footer />
    </>
  )
}
