import Link from 'next/link'

const items = [
  { title: 'اكتشفي', text: 'مساحة خاصة لفهم ما يشغلكِ واختيار خطوتكِ التالية.', href: '/booking', label: 'اكتشفي الجلسات' },
  { title: 'تعلّمي', text: 'معرفة واضحة، وملاحظات وموارد تعودين إليها في وقتكِ.', href: '/courses', label: 'تصفّحي الدورات' },
  { title: 'طبّقي', text: 'قراءة وأدوات تساعدكِ على تحويل الفهم إلى ممارسة.', href: '/books', label: 'استكشفي الكتب' },
]

export function LearningJourney() {
  return <section className="learning-journey" aria-labelledby="learning-journey-title">
    <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-on-dark/20 pb-7">
        <div><p className="text-xs text-antique-gold">اكتشاف · تعلّم · تطبيق</p><h2 id="learning-journey-title" className="mt-3 font-heading text-3xl font-bold sm:text-4xl">كل خطوة لها مساحتها</h2></div>
        <p className="max-w-sm text-sm leading-7 text-on-dark/80">اختاري ما تحتاجينه اليوم، وامنحي نفسكِ الوقت لفهمه.</p>
      </div>
      <ol className="mt-8 grid gap-8 md:grid-cols-3">
        {items.map((item, i) => <li key={item.title}>
          <Link prefetch={false} href={item.href} className="group block rounded-xl p-3 transition-colors hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-antique-gold">
            <span className="text-xs text-antique-gold" aria-hidden dir="ltr">0{i + 1}</span>
            <h3 className="mt-3 font-heading text-3xl font-bold">{item.title}</h3>
            <p className="mt-3 max-w-xs text-sm leading-8 text-on-dark/80">{item.text}</p>
            <span className="mt-5 inline-flex min-h-11 items-center gap-3 border-b border-on-dark/25 text-sm group-hover:border-antique-gold">{item.label}<span aria-hidden>←</span></span>
          </Link>
        </li>)}
      </ol>
    </div>
  </section>
}
