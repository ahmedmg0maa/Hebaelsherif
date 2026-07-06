import Link from 'next/link'

export default function BooksPreview() {
  return (
    <section className="rounded-[2rem] border border-sand bg-cream p-6 shadow-soft dark:border-gold/25 dark:bg-white/10">
      <p className="text-xs font-black text-gold">المكتبة</p>
      <h2 className="mt-2 text-2xl font-black text-charcoal dark:text-ivory">كتب رقمية لقراءة أكثر هدوءًا</h2>
      <p className="mt-3 text-sm font-bold leading-7 text-warm-gray dark:text-cream">المكتبة تُدار من الأدمن وتظهر فقط الكتب المنشورة والمتاحة للشراء أو القراءة.</p>
      <Link href="/books" className="mt-5 inline-flex rounded-full bg-gold px-5 py-3 text-xs font-black text-deepTeal">فتح المكتبة</Link>
    </section>
  )
}
