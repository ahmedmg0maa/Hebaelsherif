import Link from 'next/link'

export default function LearnerMetricCard({
  icon,
  label,
  value,
  hint,
  href,
}: {
  icon: string
  label: string
  value: string | number
  hint: string
  href?: string
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-gold/20 bg-gold/10 text-lg text-gold">
          {icon}
        </span>
        <span className="text-xs font-black text-warm-gray">{hint}</span>
      </div>
      <strong className="latin-numerals mt-5 block text-4xl font-black text-petrol">{value}</strong>
      <p className="mt-2 text-sm font-black text-charcoal">{label}</p>
    </>
  )

  const className = 'rounded-[2rem] border border-sand bg-ivory/90 p-5 shadow-soft backdrop-blur-sm transition hover:-translate-y-1 hover:shadow-premium'

  if (!href) return <div className={className}>{content}</div>
  return <Link href={href} className={className}>{content}</Link>
}
