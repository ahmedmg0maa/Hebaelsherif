import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/cn'

// The owner-supplied artwork is the canonical brand mark. Keeping it as an
// image preserves every calligraphic detail instead of approximating it in SVG.
export function BrandLogo({
  tone = 'dark',
  href = '/',
  className,
}: {
  tone?: 'dark' | 'light'
  href?: string
  className?: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group relative block h-16 w-16 shrink-0 overflow-hidden rounded-xl transition duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cobalt',
        'bg-[#f8f0e7]',
        className,
      )}
      data-tone={tone}
      aria-label="هبة الشريف — الصفحة الرئيسية"
    >
      <Image
        src="/brand/main-logo.png"
        alt="شعار هبة الشريف"
        width={256}
        height={256}
        unoptimized
        sizes="80px"
        className="h-full w-full object-contain"
      />
    </Link>
  )
}
