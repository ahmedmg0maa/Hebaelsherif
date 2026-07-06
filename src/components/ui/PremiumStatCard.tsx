interface PremiumStatCardProps {
  value: string | number
  label: string
  hint?: string
}

export default function PremiumStatCard({ value, label, hint }: PremiumStatCardProps) {
  return (
    <div className="rounded-3xl border border-sand bg-ivory/80 p-5 shadow-soft backdrop-blur-sm">
      <strong className="block text-3xl font-black text-petrol">{value}</strong>
      <p className="mt-2 text-sm font-black text-charcoal">{label}</p>
      {hint ? <p className="mt-1 text-xs leading-6 text-warm-gray">{hint}</p> : null}
    </div>
  )
}
