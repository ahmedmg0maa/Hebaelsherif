interface BrandDividerProps {
  className?: string
}

export default function BrandDivider({ className = '' }: BrandDividerProps) {
  return (
    <div className={`flex items-center justify-center gap-3 text-gold ${className}`} aria-hidden="true">
      <span className="h-px w-20 bg-gradient-to-l from-gold/70 to-transparent" />
      <span className="h-1.5 w-1.5 rotate-45 bg-gold" />
      <span className="h-2 w-2 rotate-45 bg-gold/80" />
      <span className="h-1.5 w-1.5 rotate-45 bg-gold" />
      <span className="h-px w-20 bg-gradient-to-r from-gold/70 to-transparent" />
    </div>
  )
}
