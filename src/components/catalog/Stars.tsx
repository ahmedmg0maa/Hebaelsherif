import { cn } from '@/lib/cn'

export function Stars({ rating, count, className }: { rating: number; count?: number; className?: string }) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <span className="flex gap-0.5 text-antique-gold" aria-label={`التقييم ${rating} من 5`}>
        {Array.from({ length: 5 }, (_, i) => (
          <svg
            key={i}
            viewBox="0 0 20 20"
            className={cn('h-4 w-4', i < Math.round(rating) ? 'fill-current' : 'fill-sand')}
            aria-hidden
          >
            <path d="M10 1.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L10 14.9l-5.3 2.7 1-5.8L1.5 7.7l5.9-.9Z" />
          </svg>
        ))}
      </span>
      {count !== undefined && count > 0 && (
        <span className="tnum text-xs text-taupe">({count.toLocaleString('ar-EG')})</span>
      )}
    </span>
  )
}
