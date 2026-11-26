import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { BrandLogo } from '@/components/layout/BrandLogo'
import { ThemeToggle } from '@/components/theme/ThemeToggle'

export function AuthShell({
  title,
  lead,
  footer,
  children,
}: {
  title: string
  lead: string
  footer?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <main className="auth-canvas heritage-paper relative flex min-h-screen items-center justify-center overflow-hidden bg-ivory px-6 py-16">
      <span className="pointer-events-none absolute start-8 top-8 h-20 w-20 border-s border-t border-antique-gold/25" />
      <span className="pointer-events-none absolute end-8 bottom-8 h-20 w-20 border-e border-b border-antique-gold/25" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,color-mix(in_srgb,var(--color-antique-gold)_8%,transparent),transparent_34%)]" />
      <div className="absolute end-5 top-5 flex gap-2"><ThemeToggle compact /></div>
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex justify-center"><BrandLogo className="h-20 w-20 rounded-3xl" /></div>
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 block h-px w-16 bg-antique-gold" aria-hidden />
          <h1 className="text-3xl font-bold text-deep-teal">{title}</h1>
          <p className="mt-2 leading-relaxed text-text-soft">{lead}</p>
        </div>
        <Card className="border-antique-gold/30 p-8">{children}</Card>
        {footer && <p className="mt-6 text-center text-sm text-text-soft">{footer}</p>}
      </div>
    </main>
  )
}

export function AuthLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-semibold text-burgundy underline-offset-4 hover:underline">
      {children}
    </Link>
  )
}
