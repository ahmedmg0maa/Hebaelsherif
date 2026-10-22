import Image from 'next/image'
import Link from 'next/link'

const journeys = [
  {
    number: '٠١',
    eyebrow: 'حجز جلسة',
    title: 'اختاري الموعد وراجعي كل خطوة',
    text: 'جرّبي اختيار الجلسة والتاريخ والوقت ومحاكاة الدفع اليدوي، من دون إنشاء حجز أو إرسال ملف.',
    href: '/booking',
    image: '/images/experience/journey-landscape.webp',
    imagePosition: '42% center',
  },
  {
    number: '٠٢',
    eyebrow: 'كورس تفاعلي',
    title: 'تعلّمي واكتبي وتابعي تقدّمك',
    text: 'تسعة دروس أصلية وتمارين انعكاس وتقدّم مؤقت داخل المتصفح.',
    href: '/courses/preview-clarity-journey',
    image: '/images/experience/course-clarity-journey.webp',
    imagePosition: '50% 56%',
  },
  {
    number: '٠٣',
    eyebrow: 'كتاب كامل كتجربة',
    title: 'قارئة هادئة بخمسة فصول',
    text: 'نص أصلي، فهرس، وضع ليلي، حجم خط وتمارين عملية — للعرض فقط.',
    href: '/books/preview-listen-inward',
    image: '/images/experience/book-listen-inward.webp',
    imagePosition: '50% 52%',
  },
]

export function PreviewExperienceSpotlight() {
  return (
    <section className="experience-canvas relative isolate overflow-hidden border-y border-on-dark/10 bg-[#082730] px-5 py-16 text-on-dark sm:px-8 md:py-24" aria-labelledby="preview-experience-title">
      <span className="experience-orb experience-orb-a" aria-hidden />
      <span className="experience-orb experience-orb-b" aria-hidden />
      <div className="relative mx-auto max-w-7xl">
        <header className="grid gap-5 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
          <div>
            <p className="text-xs font-bold tracking-[.18em] text-aqua">تجربة عامة آمنة · لا بيانات حقيقية</p>
            <h2 id="preview-experience-title" className="mt-3 max-w-2xl text-4xl leading-tight font-bold sm:text-5xl">لا تكتفي بالمشاهدة — جرّبي الرحلة بنفسك</h2>
          </div>
          <p className="max-w-2xl text-base leading-loose text-on-dark/66 lg:justify-self-end lg:text-lg">هذه المسارات تعمل محليًا داخل Preview فقط. لا تنشئ حسابًا أو حجزًا أو طلبًا أو دفعًا، ولا تستخدم أي بيانات Production.</p>
        </header>

        <div className="mt-10 grid gap-5 lg:grid-cols-12">
          {journeys.map((journey, index) => (
            <Link key={journey.href} href={journey.href} className={`experience-spotlight group relative flex min-h-[380px] overflow-hidden rounded-[2rem] border border-on-dark/12 shadow-[0_24px_70px_rgb(0_0_0_/_0.25)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-aqua ${index === 0 ? 'lg:col-span-6' : 'lg:col-span-3'}`}>
              <Image src={journey.image} alt="" fill sizes={index === 0 ? '(min-width: 1024px) 50vw, 100vw' : '(min-width: 1024px) 25vw, 100vw'} className="object-cover transition duration-1000 group-hover:scale-[1.06]" style={{ objectPosition: journey.imagePosition }} />
              <span className="absolute inset-0 bg-linear-to-t from-[#061E25] via-[#082730]/42 to-transparent" />
              <span className="absolute inset-4 rounded-[1.45rem] border border-on-dark/15 transition group-hover:inset-3 group-hover:border-aqua/35" aria-hidden />
              <div className="relative mt-auto w-full p-7 sm:p-8">
                <div className="flex items-center justify-between text-xs font-bold text-aqua"><span>{journey.eyebrow}</span><span className="font-heading text-antique-gold">{journey.number}</span></div>
                <h3 className={`mt-3 leading-tight font-bold ${index === 0 ? 'text-3xl sm:text-4xl' : 'text-2xl'}`}>{journey.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-on-dark/68">{journey.text}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-aqua">ابدئي التجربة <span className="transition-transform group-hover:-translate-x-1" aria-hidden>←</span></span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
