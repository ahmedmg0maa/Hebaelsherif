interface BrandOrnamentProps {
  className?: string
  label?: string
}

export default function BrandOrnament({ className = '', label = 'نقطة وعي' }: BrandOrnamentProps) {
  return (
    <span className={`inline-flex items-center gap-3 text-gold ${className}`} aria-label={label}>
      <span className="h-px w-10 bg-gradient-to-l from-gold to-transparent" />
      <span className="relative flex h-8 w-8 items-center justify-center">
        <span className="absolute bottom-0 h-3 w-6 rounded-t-full border-t-2 border-gold/75" />
        <span className="h-2.5 w-2.5 rounded-full bg-burgundy shadow-[0_0_0_6px_rgb(var(--color-gold)/.10)]" />
      </span>
      <span className="h-px w-10 bg-gradient-to-r from-gold to-transparent" />
    </span>
  )
}
