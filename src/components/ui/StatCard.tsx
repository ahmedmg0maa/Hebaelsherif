import { cn } from '@/lib/cn'
import { Card } from './Card'

type StatCardProps = {
  label: string
  value: string
  delta?: { value: string; direction: 'up' | 'down' }
  sparkline?: number[]
  accent?: 'teal' | 'gold' | 'burgundy' | 'cobalt'
  icon?: React.ReactNode
  className?: string
}

const accents = {
  teal: 'text-deep-teal',
  gold: 'text-antique-gold',
  burgundy: 'text-burgundy',
  cobalt: 'text-cobalt',
}

function Sparkline({ points, className }: { points: number[]; className?: string }) {
  if (points.length < 2) return null
  const max = Math.max(...points)
  const min = Math.min(...points)
  const range = max - min || 1
  const w = 96
  const h = 28
  const step = w / (points.length - 1)
  const d = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${(h - ((p - min) / range) * h).toFixed(1)}`)
    .join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn('h-7 w-24', className)} aria-hidden preserveAspectRatio="none">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
    </svg>
  )
}

export function StatCard({ label, value, delta, sparkline, accent = 'teal', icon, className }: StatCardProps) {
  return (
    <Card className={cn('relative flex flex-col gap-3 overflow-hidden border-antique-gold/20', className)}>
      <span className="pointer-events-none absolute -start-7 -top-7 h-20 w-20 rounded-full border border-antique-gold/15 bg-antique-gold/5" />
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-text-soft">{label}</span>
        <span className={cn('flex h-10 w-10 items-center justify-center rounded-full border border-antique-gold/25 bg-ivory opacity-90', accents[accent])}>
          {icon ?? <span className="h-2 w-2 rounded-full bg-current" />}
        </span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <span className={cn('tnum text-3xl font-bold', accents[accent])}>{value}</span>
        {sparkline && <Sparkline points={sparkline} className={accents[accent]} />}
      </div>
      {delta && (
        <span className={cn('tnum text-xs font-semibold', delta.direction === 'up' ? 'text-deep-teal' : 'text-burgundy')}>
          {delta.direction === 'up' ? '▲' : '▼'} {delta.value}
        </span>
      )}
    </Card>
  )
}
