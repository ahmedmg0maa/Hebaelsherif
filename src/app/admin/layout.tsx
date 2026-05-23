'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { ADMIN_NAV_LINKS } from '@/constants/design'
import { useAuth } from '@/hooks/useAuth'
import { PageSkeleton } from '@/components/ui/PremiumSkeleton'
import PremiumButton from '@/components/ui/PremiumButton'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading, isAdmin, logout } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/auth/login?next=${encodeURIComponent(pathname)}`)
      return
    }

    if (!loading && user && !isAdmin) {
      router.push('/dashboard')
    }
  }, [isAdmin, loading, pathname, router, user])

  if (loading) {
    return (
      <main className="min-h-screen bg-cream">
        <PageSkeleton />
      </main>
    )
  }

  if (!user || !isAdmin) return null

  return (
    <main className="min-h-screen bg-cream lg:flex">
      <aside className="border-b border-sand bg-charcoal text-cream lg:sticky lg:top-0 lg:h-screen lg:w-80 lg:overflow-y-auto lg:border-b-0 lg:border-l">
        <div className="border-b border-white/10 p-6">
          <Link href="/" className="block">
            <p className="text-2xl font-black text-cream">هبة الشريف</p>
            <p className="mt-1 text-xs text-cream/50">لوحة الإدارة</p>
          </Link>
        </div>

        <nav className="flex gap-2 overflow-x-auto p-4 lg:block lg:space-y-1">
          {ADMIN_NAV_LINKS.map((item) => {
            const active = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block min-w-max rounded-2xl px-4 py-2.5 text-xs font-bold transition lg:min-w-0 ${
                  active
                    ? 'bg-cream text-charcoal'
                    : 'text-cream/70 hover:bg-white/10 hover:text-cream'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="hidden p-4 lg:block">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-cream/50">مسجل كمدير</p>
            <p className="mt-1 break-words text-sm font-bold text-cream">{user.email}</p>

            <PremiumButton
              type="button"
              variant="ghost"
              size="sm"
              className="mt-4 w-full text-cream hover:bg-white/10"
              onClick={() => logout()}
            >
              تسجيل الخروج
            </PremiumButton>
          </div>
        </div>
      </aside>

      <section className="min-w-0 flex-1">
        <header className="border-b border-sand bg-ivory/90">
          <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-8">
            <div>
              <p className="text-sm text-warm-gray">إدارة المنصة</p>
              <h1 className="mt-1 text-2xl font-black text-petrol">لوحة التحكم</h1>
            </div>

            <div className="flex flex-wrap gap-3">
              <PremiumButton href="/" variant="outline" size="sm">
                عرض الموقع
              </PremiumButton>

              <PremiumButton
                type="button"
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => logout()}
              >
                خروج
              </PremiumButton>
            </div>
          </div>
        </header>

        <div className="p-5 lg:p-8">{children}</div>
      </section>
    </main>
  )
}