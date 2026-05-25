import Image from 'next/image'
import Link from 'next/link'
import { BRAND } from '@/constants/design'

type BrandMarkSize = 'sm' | 'md' | 'lg'

interface BrandMarkProps {
  href?: string
  size?: BrandMarkSize
  showText?: boolean
  className?: string
}

const sizes: Record<BrandMarkSize, { box: string; image: string; title: string; subtitle: string }> = {
  sm: { box: 'h-10 w-14 rounded-2xl', image: 'p-1.5', title: 'text-base', subtitle: 'text-[9px]' },
  md: { box: 'h-12 w-16 rounded-[1.15rem]', image: 'p-1.5', title: 'text-xl', subtitle: 'text-[10px]' },
  lg: { box: 'h-20 w-28 rounded-[1.6rem]', image: 'p-2', title: 'text-3xl', subtitle: 'text-xs' },
}

function Mark({ size = 'md' }: { size?: BrandMarkSize }) {
  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden border border-gold/25 bg-ivory shadow-soft ring-1 ring-white/60 dark:border-gold/30 dark:bg-cream ${sizes[size].box}`}
      aria-hidden="true"
    >
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_18%,rgb(var(--color-gold)/.14),transparent_42%),radial-gradient(circle_at_80%_75%,rgb(var(--color-petrol)/.12),transparent_46%)]" />
      <Image
        src="/images/brand/logo-symbol.png"
        alt=""
        fill
        priority={size === 'lg'}
        className={`object-contain ${sizes[size].image}`}
        sizes={size === 'lg' ? '112px' : size === 'md' ? '64px' : '56px'}
      />
    </span>
  )
}

export default function BrandMark({ href = '/', size = 'md', showText = true, className = '' }: BrandMarkProps) {
  const content = (
    <span className={`group inline-flex items-center gap-3 ${className}`}>
      <Mark size={size} />
      {showText ? (
        <span className="min-w-0">
          <span className={`block font-black leading-none text-charcoal transition group-hover:text-petrol dark:text-ivory ${sizes[size].title}`}>
            {BRAND.arName}
          </span>
          <span className={`mt-1 block font-bold tracking-[0.22em] text-warm-gray ${sizes[size].subtitle}`}>
            HEBA ELSHERIF
          </span>
        </span>
      ) : null}
    </span>
  )

  if (!href) return content

  return (
    <Link href={href} aria-label="العودة إلى الرئيسية">
      {content}
    </Link>
  )
}
