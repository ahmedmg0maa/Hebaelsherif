'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { DASHBOARD_NAV_LINKS } from '@/constants/design'
import { useAuth } from '@/hooks/useAuth'
import { PageSkeleton } from '@/components/ui/PremiumSkeleton'
import PremiumButton from '@/components/ui/PremiumButton'

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
    <main className="min-h-screen bg-cream">
      <header className="border-b border-sand bg-ivory/90">
        <div className="container-premium flex flex-col gap-5 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-warm-gray">مرحباً بكِ</p>
            <h1 className="mt-1 text-2xl font-black text-petrol">{user.name}</h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <PremiumButton href="/" variant="outline" size="sm">
              الرئيسية
            </PremiumButton>

            {user.role === 'admin' ? (
              <PremiumButton href="/admin" size="sm">
                لوحة الإدارة
              </PremiumButton>
            ) : null}

            <PremiumButton type="button" variant="ghost" size="sm" onClick={() => logout()}>
              تسجيل الخروج
            </PremiumButton>
          </div>
        </div>
      </header>

      <nav className="border-b border-sand bg-cream/80">
        <div className="container-premium overflow-x-auto">
          <div className="flex min-w-max gap-2 py-3">
            {DASHBOARD_NAV_LINKS.map((item) => {
              const active = pathname === item.href

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-5 py-2 text-sm font-bold transition ${
                    active
                      ? 'bg-petrol text-cream'
                      : 'text-warm-gray hover:bg-ivory hover:text-petrol'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      <section className="container-premium py-10">{children}</section>
    </main>
  )
}