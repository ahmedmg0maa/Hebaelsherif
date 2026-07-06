const quotes = ['مساحة آمنة لفهم نفسي بهدوء.', 'أول مرة أفهم حدودي بدون جلد ذات.', 'اللغة قريبة وعميقة في نفس الوقت.']
export default function Testimonials() {
  return <section className="grid gap-4 md:grid-cols-3">{quotes.map((quote) => <blockquote key={quote} className="rounded-[1.5rem] border border-sand bg-ivory p-5 text-sm font-bold leading-7 text-warm-gray shadow-soft dark:border-gold/25 dark:bg-white/10 dark:text-cream">“{quote}”</blockquote>)}</section>
}
