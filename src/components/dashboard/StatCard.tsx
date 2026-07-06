export default function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-[1.5rem] border border-sand bg-ivory p-5 shadow-soft dark:border-gold/25 dark:bg-white/10">
      <p className="text-xs font-black text-gold">{label}</p>
      <p className="mt-3 text-3xl font-black text-charcoal dark:text-ivory">{value}</p>
      {hint ? <p className="mt-2 text-xs font-bold text-warm-gray dark:text-cream">{hint}</p> : null}
    </div>
  )
}
