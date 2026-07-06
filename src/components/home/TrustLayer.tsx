const items = ['خصوصية وهدوء', 'لا وعود علاجية', 'اختيارات واضحة', 'لغة عربية قريبة']

export default function TrustLayer() {
  return <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{items.map((item) => <div key={item} className="rounded-2xl border border-sand bg-ivory p-4 text-center text-sm font-black text-petrol shadow-soft dark:border-gold/25 dark:bg-white/10 dark:text-ivory">{item}</div>)}</section>
}
