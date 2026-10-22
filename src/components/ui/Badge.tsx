import { cn } from '@/lib/cn'

type Tone = 'teal' | 'gold' | 'burgundy' | 'cobalt' | 'sand' | 'success' | 'pending' | 'danger'

const tones: Record<Tone, string> = {
  teal: 'bg-deep-teal/10 text-deep-teal',
  gold: 'bg-antique-gold/15 text-antique-gold',
  burgundy: 'bg-burgundy/10 text-burgundy',
  cobalt: 'bg-cobalt/10 text-cobalt',
  sand: 'bg-sand/50 text-taupe',
  success: 'bg-deep-teal/10 text-deep-teal',
  pending: 'bg-antique-gold/15 text-antique-gold',
  danger: 'bg-burgundy/10 text-burgundy',
}

export function Badge({
  tone = 'teal',
  className,
  children,
}: {
  tone?: Tone
  className?: string
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
