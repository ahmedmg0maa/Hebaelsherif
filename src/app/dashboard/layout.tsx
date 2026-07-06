'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import BrandDivider from '@/components/brand/BrandDivider'
import BrandMark from '@/components/brand/BrandMark'
import BrandOrnament from '@/components/brand/BrandOrnament'
import ThemeToggle from '@/components/experience/ThemeToggle'
import NotificationBell from '@/components/experience/NotificationBell'
import PremiumButton from '@/components/ui/PremiumButton'
import { PageSkeleton } from '@/components/ui/PremiumSkeleton'
import { BRAND, DASHBOARD_NAV_LINKS } from '@/constants/design'
import { useAuth } from '@/hooks/useAuth'

const navIcons: Record<string, string> = {
  '/dashboard': '✦',
  '/dashboard/courses': '◈',
  '/dashboard/books': '☾',
  '/dashboard/sessions': '◌',
  '/dashboard/orders': '◇',
  '/dashboard/profile': '◍',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading, logout } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/auth/login?next=${encodeURIComponent(pathname)}`)
    }
  }, [loading, pathname, router, user])

  if (loading) {
    return (
      <main className="min-h-screen bg-cream">
        <PageSkeleton />
      </main>
    )
  }

  if (!user) return null

  return (
    <main className="min-h-screen overflow-hidden bg-cream text-charcoal lg:flex">
      <aside className="relative z-20 border-b border-sand bg-ivory/92 backdrop-blur-xl lg:sticky lg:top-0 lg:min-h-screen lg:w-[21rem] lg:border-b-0 lg:border-l xl:w-[22rem]">
        <div className="pointer-events-none absolute -right-20 top-16 h-48 w-48 rounded-full bg-gold/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 bottom-20 h-56 w-56 rounded-full bg-petrol/10 blur-3xl" />

        <div className="relative border-b border-sand p-5 lg:p-6">
          <Link href="/" className="flex items-center gap-3">
            <BrandMark size="md" />
            <span>
              <span className="block text-xl font-black text-petrol">{BRAND.arName}</span>
              <span className="mt-1 block text-xs font-black text-gold">لوحة الرحلة الخاصة</span>
            </span>
          </Link>
        </div>

        <nav className="relative flex gap-2 overflow-x-auto p-4 lg:block lg:space-y-2 lg:p-5">
          {DASHBOARD_NAV_LINKS.map((item) => {
            const active = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex min-w-max items-center gap-3 rounded-[1.4rem] px-4 py-3 text-sm font-black transition lg:min-w-0 ${
                  active
                    ? 'bg-petrol text-ivory shadow-soft'
                    : 'text-warm-gray hover:bg-cream/80 hover:text-petrol'
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs transition ${
                    active
                      ? 'border-gold/30 bg-ivory/10 text-gold'
                      : 'border-sand bg-ivory/70 text-gold group-hover:border-petrol/20'
                  }`}
                >
                  {navIcons[item.href] || '•'}
                </span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="relative hidden px-5 pb-5 lg:block">
          <div className="premium-glow-border rounded-[2rem] border border-sand bg-cream/72 p-5 shadow-soft backdrop-blur-sm">
            <BrandOrnament className="mb-4 scale-75" />
            <p className="text-xs font-black text-warm-gray">مرحبًا بكِ</p>
            <p className="mt-2 break-words text-lg font-black text-charcoal">{user.name}</p>
            <p className="mt-1 break-words text-xs font-bold text-warm-gray">{user.email}</p>
            <BrandDivider className="my-5 scale-75" />
            <div className="grid gap-2">
              {['owner', 'admin', 'support', 'content_manager', 'finance', 'viewer'].includes(String(user.role)) ? (
                <PremiumButton href="/admin" size="sm" className="w-full">
                  لوحة الإدارة
                </PremiumButton>
              ) : null}
              <PremiumButton href="/booking" variant="outline" size="sm" className="w-full">
                حجز جلسة
              </PremiumButton>
              <PremiumButton type="button" variant="ghost" size="sm" className="w-full" onClick={() => logout()}>
                تسجيل الخروج
              </PremiumButton>
            </div>
          </div>
        </div>
      </aside>

      <section className="relative min-w-0 flex-1">
        <div className="pointer-events-none absolute left-10 top-10 h-64 w-64 rounded-full bg-aqua/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-20 right-1/4 h-72 w-72 rounded-full bg-gold/10 blur-3xl" />

        <header className="sticky top-0 z-10 border-b border-sand bg-cream/78 backdrop-blur-xl">
          <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-8">
            <div>
              <p className="mini-label mb-1">مساحتك الخاصة</p>
              <h1 className="text-2xl font-black text-charcoal md:text-3xl">مرحبًا، {user.name}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <NotificationBell />
              <ThemeToggle />
              <PremiumButton href="/" variant="outline" size="sm">
                الرئيسية
              </PremiumButton>
              {['owner', 'admin', 'support', 'content_manager', 'finance', 'viewer'].includes(String(user.role)) ? (
                <PremiumButton href="/admin" size="sm">
                  الإدارة
                </PremiumButton>
              ) : null}
              <PremiumButton type="button" variant="ghost" size="sm" className="lg:hidden" onClick={() => logout()}>
                خروج
              </PremiumButton>
            </div>
          </div>
        </header>

        <div className="relative p-5 lg:p-8 xl:p-10">{children}</div>
      </section>
    </main>
  )
}
