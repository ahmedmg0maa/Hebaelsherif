'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BackToTop } from '@/components/motion/BackToTop'
import { PublicHeader } from './PublicHeader'
import { PublicFooter } from './PublicFooter'
import type { PublicNavigationItem } from '@/lib/data/cms'

export function PublicFrame({ children, flags, navigation }: { children: React.ReactNode; flags: Record<string, boolean>; navigation:PublicNavigationItem[] }) {
  const pathname = usePathname()
  if (pathname.startsWith('/auth/')) return <>{children}</>
  const maintenance = flags.site_open === false && !['/contact', '/privacy', '/terms', '/refund', '/disclaimer', '/session-policy'].includes(pathname)
  const intakeClosed = (pathname === '/booking' && flags.booking_open === false) || (pathname.startsWith('/checkout/') && flags.checkout_open === false)
  return (
    <>
      <a
        href="#main-content"
        className="sr-only fixed start-4 top-4 z-[70] rounded-lg bg-deep-teal px-4 py-3 text-sm font-semibold text-on-dark shadow-card focus:not-sr-only focus:outline-2 focus:outline-offset-2 focus:outline-antique-gold"
      >
        تخطّي إلى المحتوى
      </a>
      <PublicHeader flags={flags} items={navigation.filter(item=>item.menu==='header')} />
      <div id="main-content" tabIndex={-1} className="public-canvas journey-surface flex flex-1 flex-col outline-none">{maintenance || intakeClosed ? <section className="mx-auto w-full max-w-2xl px-6 py-24 text-center"><p className="text-sm font-bold text-antique-gold">مساحتكِ محفوظة</p><h1 className="mt-4 font-heading text-3xl text-deep-teal">{maintenance ? 'الموقع في استراحة مؤقتة' : 'استقبال الطلبات الجديدة متوقف مؤقتًا'}</h1><p className="mt-5 leading-loose text-text-soft">يمكنكِ الدخول إلى حسابك لمتابعة طلباتك وحجوزاتك والمحتوى المتاح لكِ.</p><div className="mt-8 flex flex-wrap justify-center gap-6"><Link className="inline-flex min-h-12 items-center font-bold text-deep-teal underline" href="/dashboard">حسابي</Link><Link className="inline-flex min-h-12 items-center font-bold text-deep-teal underline" href="/contact">تواصلي معنا</Link></div></section> : children}</div>
      <BackToTop />
      <PublicFooter items={navigation.filter(item=>item.menu.startsWith('footer_'))} />
    </>
  )
}
