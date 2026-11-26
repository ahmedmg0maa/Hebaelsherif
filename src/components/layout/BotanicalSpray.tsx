import { cn } from '@/lib/cn'

// Original code-native botanical filigree inspired by classical Arabic book arts.
// It carries the editorial mood of the references without copying their artwork.
export function BotanicalSpray({ className, mirrored = false }: { className?: string; mirrored?: boolean }) {
  return (
    <svg
      viewBox="0 0 280 420"
      className={cn(mirrored && '-scale-x-100', className)}
      fill="none"
      aria-hidden
    >
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 408C42 330 94 296 82 226 72 166 104 118 164 84 197 65 223 38 236 8" strokeWidth="2" strokeOpacity=".48" />
        <path d="M41 350c48-18 78-52 88-101 8-40 32-70 73-91" strokeWidth="1.3" strokeOpacity=".34" />
        <path d="M78 250c-31-7-51-25-61-54 34-3 57 14 68 45M95 209c33-13 55-38 65-76 22 28 15 58-28 86M131 247c36 3 64 19 84 48-38 9-69-4-89-39M152 113c-12-31-7-59 15-84 19 29 14 58-15 84M62 324c-27-3-47-16-61-40 30-8 53 3 68 31M111 302c26 8 44 25 54 51-30 3-51-10-62-40" strokeWidth="1.4" strokeOpacity=".52" />
      </g>
      <g fill="currentColor">
        <circle cx="82" cy="226" r="4" fillOpacity=".65" />
        <circle cx="129" cy="249" r="3" fillOpacity=".55" />
        <circle cx="164" cy="84" r="3.5" fillOpacity=".6" />
        <circle cx="62" cy="324" r="3" fillOpacity=".5" />
      </g>
      <g transform="translate(206 296)" stroke="currentColor" strokeWidth="1.3" strokeOpacity=".62">
        <circle r="12" />
        <path d="M0-25C8-18 9-9 0 0-9-9-8-18 0-25ZM25 0C18 8 9 9 0 0 9-9 18-8 25 0ZM0 25C-8 18-9 9 0 0 9 9 8 18 0 25ZM-25 0C-18-8-9-9 0 0-9 9-18 8-25 0Z" />
      </g>
      <g transform="translate(20 190) scale(.7)" stroke="currentColor" strokeWidth="1.6" strokeOpacity=".55">
        <circle r="10" />
        <path d="M0-23C8-17 8-8 0 0-8-8-8-17 0-23ZM23 0C17 8 8 8 0 0 8-8 17-8 23 0ZM0 23C-8 17-8 8 0 0 8 8 8 17 0 23ZM-23 0C-17-8-8-8 0 0-8 8-17 8-23 0Z" />
      </g>
      <g fill="currentColor" fillOpacity=".28">
        <path d="M191 129c18-10 35-9 51 4-17 15-35 14-51-4Z" />
        <path d="M35 371c19-7 35-2 48 13-19 11-36 6-48-13Z" />
        <path d="M181 342c17-3 30 3 39 17-18 7-31 1-39-17Z" />
      </g>
    </svg>
  )
}
