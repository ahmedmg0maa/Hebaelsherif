'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { BRAND, PUBLIC_NAV_LINKS } from '@/constants/design'
import { useAuth } from '@/hooks/useAuth'
import PremiumButton from '@/components/ui/PremiumButton'

export default function Navbar() {
  const pathname = usePathname()
  const { user, loading, logout } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 16)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll)

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const navClasses = scrolled
    ? 'border-sand bg-cream/90 shadow-sm backdrop-blur-xl'
    : 'border-transparent bg-cream/55 backdrop-blur-md'

  return (
    <header className={`fixed inset-x-0 top-0 z-50 border-b transition-all duration-300 ${navClasses}`}>
      <nav className="container-premium">
        <div className="flex h-20 items-center justify-between gap-4">
          <Link href="/" className="group">
            <span className="block text-xl font-black text-petrol transition group-hover:text-gold">
              {BRAND.arName}
            </span>

            <span className="block text-[11px] font-medium text-warm-gray">
              {BRAND.tagline}
            </span>
          </Link>

          <div className="hidden items-center gap-7 lg:flex">
            {PUBLIC_NAV_LINKS.map((item) => {
              const active = pathname === item.href

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative text-sm font-bold transition ${
                    active ? 'text-petrol' : 'text-warm-gray hover:text-petrol'
                  }`}
                >
                  {item.label}

                  {active ? (
                    <span className="absolute -bottom-2 right-0 h-1 w-full rounded-full bg-gold" />
                  ) : null}
                </Link>
              )
            })}
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            {loading ? (
              <div className="h-10 w-28 animate-pulse rounded-full bg-sand" />
            ) : user ? (
              <>
                <PremiumButton href="/dashboard" size="sm">
                  لوحتي
                </PremiumButton>

                {user.role === 'admin' ? (
                  <PremiumButton href="/admin" size="sm" variant="outline">
                    الإدارة
                  </PremiumButton>
                ) : null}

                <button
                  type="button"
                  onClick={() => logout()}
                  className="rounded-full px-3 py-2 text-xs font-bold text-warm-gray transition hover:bg-burgundy/10 hover:text-burgundy"
                >
                  خروج
                </button>
              </>
            ) : (
              <>
                <PremiumButton href="/auth/login" size="sm" variant="outline">
                  دخول
                </PremiumButton>

                <PremiumButton href="/auth/register" size="sm">
                  حساب جديد
                </PremiumButton>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((current) => !current)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-sand bg-ivory/90 text-petrol shadow-soft backdrop-blur-sm transition hover:border-gold hover:text-gold lg:hidden"
            aria-label="فتح القائمة"
            aria-expanded={mobileOpen}
          >
            <span className="text-xl leading-none">{mobileOpen ? '×' : '☰'}</span>
          </button>
        </div>

        {mobileOpen ? (
          <div className="pb-5 lg:hidden">
            <div className="premium-glow-border rounded-3xl border border-sand bg-ivory/95 p-4 shadow-premium backdrop-blur-xl">
              <div className="grid gap-2">
                {PUBLIC_NAV_LINKS.map((item) => {
                  const active = pathname === item.href

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${
                        active
                          ? 'bg-petrol text-cream'
                          : 'text-warm-gray hover:bg-cream hover:text-petrol'
                      }`}
                    >
                      {item.label}
                    </Link>
                  )
                })}
              </div>

              <div className="mt-4 grid gap-2 border-t border-sand pt-4">
                {loading ? (
                  <div className="h-11 animate-pulse rounded-full bg-sand" />
                ) : user ? (
                  <>
                    <PremiumButton href="/dashboard" className="w-full">
                      لوحتي
                    </PremiumButton>

                    {user.role === 'admin' ? (
                      <PremiumButton href="/admin" variant="outline" className="w-full">
                        لوحة الإدارة
                      </PremiumButton>
                    ) : null}

                    <PremiumButton
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={() => logout()}
                    >
                      تسجيل الخروج
                    </PremiumButton>
                  </>
                ) : (
                  <>
                    <PremiumButton href="/auth/login" variant="outline" className="w-full">
                      تسجيل الدخول
                    </PremiumButton>

                    <PremiumButton href="/auth/register" className="w-full">
                      إنشاء حساب
                    </PremiumButton>
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