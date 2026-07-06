import Link from 'next/link'

export default function AboutHeba() {
  return (
    <section className="rounded-[2rem] border border-sand bg-ivory p-6 shadow-soft md:p-8 dark:border-gold/25 dark:bg-white/10">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-gold">عن هبة</p>
      <h2 className="mt-3 text-3xl font-black text-charcoal dark:text-ivory">منهج هادئ لفهم الذات لا لمحاكمة الذات</h2>
      <p className="mt-4 max-w-3xl text-sm font-bold leading-8 text-warm-gray dark:text-cream">تجمع المنصة بين جلسات فردية، محتوى مقروء، ومسارات تعلم يتم إطلاقها تدريجيًا لمساعدة المرأة العربية على تفكيك الأنماط العاطفية والحدود والاختيارات المتكررة بوعي ورحمة.</p>
      <Link href="/about" className="mt-6 inline-flex rounded-full bg-gold px-5 py-3 text-xs font-black text-deepTeal">قراءة القصة والمنهج</Link>
    </section>
  )
}
