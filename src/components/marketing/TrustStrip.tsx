import { TRUST_METRICS } from '@/constants/content'

export default function TrustStrip() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {TRUST_METRICS.map((metric) => (
        <div key={metric.label} className="rounded-[1.75rem] border border-sand bg-ivory/80 p-5 text-center shadow-soft backdrop-blur-sm">
          <strong className="block text-3xl font-black text-burgundy">{metric.value}</strong>
          <span className="mt-2 block text-xs font-bold leading-6 text-warm-gray">{metric.label}</span>
        </div>
      ))}
    </div>
  )
}
