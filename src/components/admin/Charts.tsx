import { formatPrice } from '@/lib/format'

// Lightweight SVG charts — no chart library, brand colors only.

export function RevenueChart({ data }: { data: { label: string; value: number }[] }) {
  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl bg-ivory/60 text-sm text-taupe">
        تظهر إيرادات الأشهر هنا فور تسجيل أول طلب مدفوع
      </div>
    )
  }
  const w = 560
  const h = 180
  const pad = 8
  const max = Math.max(...data.map((d) => d.value)) || 1
  const step = (w - pad * 2) / (data.length - 1 || 1)
  const points = data.map((d, i) => ({
    x: pad + i * step,
    y: h - pad - ((h - pad * 2) * d.value) / max,
  }))
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const area = `${line} L${points[points.length - 1].x},${h - pad} L${points[0].x},${h - pad} Z`

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="إيرادات آخر ستة أشهر">
        <path d={area} fill="var(--color-deep-teal)" opacity="0.08" />
        <path d={line} fill="none" stroke="var(--color-deep-teal)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill="var(--color-antique-gold)" stroke="var(--color-surface-raised)" strokeWidth="1.5" />
        ))}
      </svg>
      <div className="mt-2 flex justify-between px-1 text-xs text-taupe" dir="rtl">
        {data.map((d) => (
          <span key={d.label} className="tnum">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl bg-ivory/60 text-sm text-taupe">
        يظهر توزيع الحجوزات هنا فور استلام أول حجز
      </div>
    )
  }
  const r = 60
  const c = 2 * Math.PI * r
  const segments = data.reduce<{ d: (typeof data)[number]; frac: number; start: number }[]>((acc, d) => {
    const start = acc.length ? acc[acc.length - 1].start + acc[acc.length - 1].frac : 0
    acc.push({ d, frac: d.value / total, start })
    return acc
  }, [])

  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 160 160" className="h-40 w-40 -rotate-90" role="img" aria-label="توزيع الحجوزات حسب الحالة">
        {segments.map(({ d, frac, start }) => (
          <circle
            key={d.label}
            cx="80"
            cy="80"
            r={r}
            fill="none"
            stroke={d.color}
            strokeWidth="22"
            strokeDasharray={`${(frac * c).toFixed(2)} ${c.toFixed(2)}`}
            strokeDashoffset={(-start * c).toFixed(2)}
          />
        ))}
        <circle cx="80" cy="80" r="38" fill="var(--color-surface-raised)" />
      </svg>
      <ul className="space-y-2 text-sm">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2.5">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: d.color }} aria-hidden />
            <span className="text-ink">{d.label}</span>
            <span className="tnum font-bold text-deep-teal">{d.value.toLocaleString('ar-EG')}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function KpiValue({ value, kind }: { value: number; kind: 'money' | 'count' }) {
  return <>{kind === 'money' ? formatPrice(value) : value.toLocaleString('ar-EG')}</>
}
