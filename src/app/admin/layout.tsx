'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { ADMIN_NAV_LINKS } from '@/constants/design'
import { useAuth } from '@/hooks/useAuth'
import { PageSkeleton } from '@/components/ui/PremiumSkeleton'
import PremiumButton from '@/components/ui/PremiumButton'
import PremiumBadge from '@/components/ui/PremiumBadge'
import BrandMark from '@/components/brand/BrandMark'
import NotificationBell from '@/components/admin/NotificationBell'
import CommandPalette from '@/components/admin/CommandPalette'

const groupDefinitions = [
  {
    title: 'التشغيل اليومي',
    hint: 'المبيعات والحجوزات والمتابعة',
    links: ['/admin', '/admin/action-queue', '/admin/orders', '/admin/bookings', '/admin/messages', '/admin/tasks'],
  },
  {
    title: 'المنتجات والحماية',
    hint: 'الكورسات والكتب والمحتوى المدفوع',
    links: ['/admin/courses', '/admin/books', '/admin/content'],
  },
  {
    title: 'العملاء والثقة',
    hint: 'العملاء، التقييمات، والتحليلات',
    links: ['/admin/users', '/admin/reviews', '/admin/analytics', '/admin/campaigns'],
  },
  {
    title: 'النظام',
    hint: 'السجلات والإعدادات الأساسية',
    links: ['/admin/system-health', '/admin/notifications', '/admin/templates', '/admin/exports', '/admin/logs', '/admin/settings'],
  },
]

function groupLinks() {
  const all = [...ADMIN_NAV_LINKS]

  return groupDefinitions.map((group) => ({
    ...group,
    links: group.links.map((href) => all.find((item) => item.href === href)).filter(Boolean) as Array<(typeof ADMIN_NAV_LINKS)[number]>,
  }))
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading, isAdmin, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  const groups = useMemo(() => groupLinks(), [])

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/auth/login?next=${encodeURIComponent(pathname)}`)
      return
    }

    if (!loading && user && !isAdmin) {
      router.push('/dashboard')
    }
  }, [isAdmin, loading, pathname, router, user])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  if (loading) {
    return (
      <main className="min-h-screen bg-cream">
        <PageSkeleton />
      </main>
    )
  }

  if (!user || !isAdmin) return null

  const flatLinks = groups.flatMap((group) => group.links)

  return (
    <main className="admin-shell min-h-screen lg:flex">
      <aside className="admin-sidebar hidden border-l border-gold/25 lg:sticky lg:top-0 lg:block lg:h-screen lg:w-[20rem] lg:overflow-y-auto">
        <div className="relative overflow-hidden border-b border-white/10 p-6">
          <div className="absolute -left-16 -top-16 h-44 w-44 rounded-full bg-gold/10 blur-3xl" />
          <Link href="/admin" className="relative block">
            <BrandMark size="md" className="[&_.text-charcoal]:text-ivory" />
          </Link>
          <div className="relative mt-5 rounded-2xl border border-gold/25 bg-gold/10 p-4">
            <p className="text-xs font-black text-gold">Heba Global Operations Center</p>
            <p className="mt-2 text-xs font-bold leading-6 admin-soft-text">
              غرفة تشغيل عالمية لإدارة المتابعة اليومية، الطلبات، الحجوزات، المحتوى، العملاء، والتحليلات الصادقة.
            </p>
          </div>
        </div>

        <nav className="space-y-6 p-4">
          {groups.map((group) => (
            <section key={group.title}>
              <div className="mb-3 px-2">
                <p className="text-[11px] font-black text-gold">{group.title}</p>
                <p className="mt-1 text-[11px] leading-5 admin-soft-text">{group.hint}</p>
              </div>

              <div className="space-y-1.5">
                {group.links.map((item) => {
                  const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(`${item.href}/`))

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group flex items-center justify-between rounded-2xl px-4 py-3 text-xs font-black transition ${
                        active ? 'admin-nav-item-active shadow-soft' : 'admin-nav-item hover:bg-white/10'
                      }`}
                    >
                      <span>{item.label}</span>
                      <span className={`h-2 w-2 rounded-full transition ${active ? 'bg-gold' : 'bg-white/15 group-hover:bg-gold/60'}`} />
                    </Link>
                  )
                })}
              </div>
            </section>
          ))}
        </nav>

        <div className="p-4">
          <div className="rounded-[1.75rem] border border-white/10 bg-white/6 p-4 shadow-botanical">
            <p className="text-xs font-bold text-gold">مسجل كمدير</p>
            <p className="mt-2 break-words text-sm font-black text-ivory">{user.email}</p>
            <div className="mt-4 grid gap-2">
              <PremiumButton href="/" variant="gold" size="sm" className="w-full">
                عرض الموقع
              </PremiumButton>
              <PremiumButton type="button" variant="ghost" size="sm" className="w-full text-ivory hover:bg-white/10" onClick={() => logout()}>
                تسجيل الخروج
              </PremiumButton>
            </div>
          </div>
        </div>
      </aside>

      <section className="min-w-0 flex-1">
        <header className="admin-header sticky top-0 z-40 border-b backdrop-blur-xl">
          <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-8">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setMobileOpen((current) => !current)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-sand bg-ivory text-petrol shadow-soft lg:hidden"
                aria-label="فتح قائمة الإدارة"
                aria-expanded={mobileOpen}
              >
                {mobileOpen ? '×' : '☰'}
              </button>

              <div>
                <p className="mini-label">مركز التشغيل</p>
                <h1 className="brand-title mt-1 text-2xl font-black text-petrol">لوحة تشغيل هبة الشريف</h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <PremiumBadge variant="gold">V4.0 Global</PremiumBadge>
              <CommandPalette />
              <NotificationBell />
              <PremiumButton href="/admin/action-queue" variant="outline" size="sm">
                قائمة المتابعة
              </PremiumButton>
              <PremiumButton href="/admin/orders" variant="outline" size="sm">
                مراجعة الطلبات
              </PremiumButton>
              <PremiumButton href="/admin/bookings" variant="outline" size="sm">
                مراجعة الحجوزات
              </PremiumButton>
              <PremiumButton href="/" variant="ghost" size="sm">
                عرض الموقع
              </PremiumButton>
            </div>
          </div>

          {mobileOpen ? (
            <div className="border-t border-sand bg-ivory/95 px-5 py-4 shadow-soft lg:hidden dark:bg-deepTeal">
              <div className="grid max-h-[60vh] gap-2 overflow-y-auto">
                {flatLinks.map((item) => {
                  const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(`${item.href}/`))

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`rounded-2xl px-4 py-3 text-xs font-black transition ${
                        active ? 'bg-petrol text-ivory' : 'border border-sand bg-cream text-warm-gray dark:border-gold/25 dark:bg-white/10 dark:text-cream'
                      }`}
                    >
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          ) : null}
        </header>

        <div className="p-5 lg:p-8">{children}</div>
      </section>
    </main>
  )
}
