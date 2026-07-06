import Link from 'next/link'

const paths = [
  ['أحتاج أفهم من أين أبدأ', '/start-here'],
  ['أحتاج جلسة واضحة', '/booking'],
  ['أريد قراءة هادئة', '/books'],
]

export default function ChooseYourPath() {
  return (
    <section className="space-y-5">
      <h2 className="text-3xl font-black text-charcoal dark:text-ivory">اختاري المسار الأقرب لكِ</h2>
      <div className="grid gap-4 md:grid-cols-3">{paths.map(([title, href]) => <Link key={href} href={href} className="rounded-[1.75rem] border border-sand bg-ivory p-5 text-lg font-black text-petrol shadow-soft transition hover:-translate-y-1 dark:border-gold/25 dark:bg-white/10 dark:text-ivory">{title}</Link>)}</div>
    </section>
  )
}
