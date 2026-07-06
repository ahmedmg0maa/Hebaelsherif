'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { PUBLIC_NAV_LINKS } from '@/constants/design'
import { useAuth } from '@/hooks/useAuth'
import PremiumButton from '@/components/ui/PremiumButton'
import ThemeToggle from '@/components/experience/ThemeToggle'
import BrandMark from '@/components/brand/BrandMark'

const desktopLinks = PUBLIC_NAV_LINKS.filter((item) =>
  ['/', '/services', '/courses', '/books', '/booking', '/about', '/contact'].includes(item.href),
)

export default function Navbar() {
  const pathname = usePathname()
  const { user, loading, logout } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 14)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => setMobileOpen(false), [pathname])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transition-all duration-300 ${
        scrolled
          ? 'border-sand bg-ivory/95 shadow-sm backdrop-blur-xl'
          : 'border-transparent bg-ivory/82 backdrop-blur-md'
      }`}
    >
      <nav className="container-wide">
        <div className="flex h-[4.75rem] items-center justify-between gap-4">
          <BrandMark size="md" />

          <div className="hidden items-center gap-6 lg:flex">
            {desktopLinks.map((item) => {
              const active = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative text-sm font-black transition ${
                    active ? 'text-petrol' : 'text-warm-gray hover:text-petrol'
                  }`}
                >
                  {item.label}
                  {active ? <span className="absolute -bottom-2 right-0 h-0.5 w-full rounded-full bg-gold" /> : null}
                </Link>
              )
            })}
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <ThemeToggle compact />
            {loading ? (
              <div className="h-10 w-32 animate-pulse rounded-full bg-sand" />
            ) : user ? (
              <>
                <PremiumButton href="/dashboard" size="sm">لوحتي</PremiumButton>
                {user.role === 'admin' ? (
                  <PremiumButton href="/admin" size="sm" variant="outline">الإدارة</PremiumButton>
                ) : null}
                <button
                  type="button"
                  onClick={() => logout()}
                  className="rounded-full px-3 py-2 text-xs font-black text-warm-gray transition hover:bg-petrol/10 hover:text-petrol"
                >
                  خروج
                </button>
              </>
            ) : (
              <>
                <PremiumButton href="/auth/login" size="sm" variant="outline">تسجيل الدخول</PremiumButton>
                <PremiumButton href="/booking" size="sm">احجزي الآن</PremiumButton>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((current) => !current)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-sand bg-ivory/90 text-petrol shadow-soft backdrop-blur-sm transition hover:border-petrol/35 lg:hidden"
            aria-label="فتح القائمة"
            aria-expanded={mobileOpen}
          >
            <span className="text-xl leading-none">{mobileOpen ? '×' : '☰'}</span>
          </button>
        </div>

        {mobileOpen ? (
          <div className="pb-5 lg:hidden">
            <div className="premium-glow-border brand-mobile-drawer rounded-[2rem] border border-sand bg-ivory/95 p-4 shadow-premium backdrop-blur-xl">
              <div className="mb-4 rounded-[1.5rem] border border-gold/20 bg-cream/70 p-4">
                <BrandMark size="sm" />
                <p className="mt-3 text-xs font-bold leading-6 text-warm-gray">
                  رحلة وعي تعيدك إلى ذاتك، في مساحة هادئة وواضحة.
                </p>
              </div>

              <div className="grid gap-2">
                {PUBLIC_NAV_LINKS.map((item) => {
                  const active = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`rounded-2xl px-4 py-3 text-sm font-black transition ${
                        active ? 'bg-petrol text-ivory' : 'text-warm-gray hover:bg-cream hover:text-petrol'
                      }`}
                    >
                      {item.label}
                    </Link>
                  )
                })}
              </div>
              <div className="mt-4 grid gap-2 border-t border-sand pt-4">
                <ThemeToggle />
                {loading ? (
                  <div className="h-11 animate-pulse rounded-full bg-sand" />
                ) : user ? (
                  <>
                    <PremiumButton href="/dashboard" className="w-full">لوحتي</PremiumButton>
                    {user.role === 'admin' ? <PremiumButton href="/admin" variant="outline" className="w-full">لوحة الإدارة</PremiumButton> : null}
                    <PremiumButton type="button" variant="ghost" className="w-full" onClick={() => logout()}>تسجيل الخروج</PremiumButton>
                  </>
                ) : (
                  <>
                    <PremiumButton href="/auth/login" variant="outline" className="w-full">تسجيل الدخول</PremiumButton>
                    <PremiumButton href="/booking" className="w-full">احجزي جلسة</PremiumButton>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </nav>
    </header>
  )
}
