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

  if (loading) return <main className="min-h-screen bg-cream"><PageSkeleton /></main>
  if (!user) return null

  return (
    <main className="min-h-screen bg-cream lg:flex">
      <aside className="border-b border-sand bg-ivory/80 backdrop-blur-xl lg:sticky lg:top-0 lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-l">
        <div className="border-b border-sand p-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-petrol text-lg font-black text-ivory">هـ</span>
            <span>
              <span className="block text-xl font-black text-charcoal">هبة الشريف</span>
              <span className="mt-1 block text-xs font-bold text-warm-gray">لوحة الرحلة</span>
            </span>
          </Link>
        </div>

        <nav className="flex gap-2 overflow-x-auto p-4 lg:block lg:space-y-2">
          {DASHBOARD_NAV_LINKS.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block min-w-max rounded-2xl px-4 py-3 text-sm font-black transition lg:min-w-0 ${
                  active ? 'bg-petrol text-ivory shadow-soft' : 'text-warm-gray hover:bg-cream hover:text-petrol'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="hidden p-4 lg:block">
          <div className="rounded-[1.5rem] border border-sand bg-cream/70 p-4">
            <p className="text-xs font-bold text-warm-gray">مرحبًا بكِ</p>
            <p className="mt-1 break-words text-sm font-black text-charcoal">{user.name}</p>
            <p className="mt-1 break-words text-xs text-warm-gray">{user.email}</p>
            <PremiumButton type="button" variant="ghost" size="sm" className="mt-4 w-full" onClick={() => logout()}>
              تسجيل الخروج
            </PremiumButton>
          </div>
        </div>
      </aside>

      <section className="min-w-0 flex-1">
        <header className="border-b border-sand bg-ivory/70 backdrop-blur-xl">
          <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-8">
            <div>
              <p className="mini-label mb-1">مساحتك الخاصة</p>
              <h1 className="text-2xl font-black text-charcoal">مرحبًا، {user.name}</h1>
            </div>
            <div className="flex flex-wrap gap-3">
              <PremiumButton href="/" variant="outline" size="sm">الرئيسية</PremiumButton>
              {user.role === 'admin' ? <PremiumButton href="/admin" size="sm">لوحة الإدارة</PremiumButton> : null}
              <PremiumButton type="button" variant="ghost" size="sm" className="lg:hidden" onClick={() => logout()}>خروج</PremiumButton>
            </div>
          </div>
        </header>
        <div className="p-5 lg:p-8">{children}</div>
      </section>
    </main>
  )
}
