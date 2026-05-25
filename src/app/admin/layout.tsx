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
import BrandDivider from '@/components/brand/BrandDivider'

const primaryHrefs = new Set([
  '/admin',
  '/admin/analytics',
  '/admin/orders',
  '/admin/bookings',
  '/admin/courses',
  '/admin/books',
  '/admin/content',
  '/admin/reviews',
])

const contentHrefs = new Set([
  '/admin/academy',
  '/admin/articles',
  '/admin/faqs',
  '/admin/media',
  '/admin/uploads',
  '/admin/content-ops',
  '/admin/homepage',
  '/admin/navigation',
  '/admin/seo',
])

const commerceHrefs = new Set([
  '/admin/payments',
  '/admin/coupons',
  '/admin/pricing',
  '/admin/bundles',
  '/admin/commerce',
  '/admin/leads',
  '/admin/users',
  '/admin/calendar',
  '/admin/availability',
])

const systemHrefs = new Set([
  '/admin/settings',
  '/admin/theme',
  '/admin/security',
  '/admin/diagnostics',
  '/admin/integrations',
  '/admin/notifications',
  '/admin/emails',
  '/admin/automation',
  '/admin/operations',
  '/admin/backups',
  '/admin/policies',
  '/admin/legal',
  '/admin/logs',
  '/admin/feature-flags',
  '/admin/analytics-events',
  '/admin/customer-journey',
  '/admin/quality',
  '/admin/assessment',
  '/admin/journeys',
  '/admin/experiments',
  '/admin/ai-guide',
])

function groupLinks() {
  const all = [...ADMIN_NAV_LINKS]

  return [
    {
      title: 'القيادة اليومية',
      hint: 'الطلبات والحجوزات والمحتوى الأساسي',
      links: all.filter((item) => primaryHrefs.has(item.href)),
    },
    {
      title: 'المحتوى والظهور',
      hint: 'الصفحات، المقالات، SEO، والميديا',
      links: all.filter((item) => contentHrefs.has(item.href)),
    },
    {
      title: 'التجارة والعملاء',
      hint: 'الدفع، الكوبونات، المستخدمون، والتوفر',
      links: all.filter((item) => commerceHrefs.has(item.href)),
    },
    {
      title: 'النظام والجودة',
      hint: 'الأمان، الإعدادات، القياس، والتشغيل',
      links: all.filter((item) => systemHrefs.has(item.href)),
    },
  ]
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

  return (
    <main className="min-h-screen bg-cream lg:flex">
      <aside className="hidden border-l border-gold/15 bg-deepTeal text-ivory lg:sticky lg:top-0 lg:block lg:h-screen lg:w-[21rem] lg:overflow-y-auto">
        <div className="paper-texture relative overflow-hidden border-b border-white/10 p-6">
          <div className="absolute -left-16 -top-16 h-44 w-44 rounded-full bg-gold/10 blur-3xl" />
          <div className="relative">
            <Link href="/admin" className="block">
              <BrandMark size="md" className="[&_.text-charcoal]:text-ivory [&_.text-warm-gray]:text-ivory/55" />
            </Link>
            <p className="mt-5 text-xs font-bold leading-6 text-ivory/55">
              مركز قيادة البراند: المحتوى، التجارة، الحجوزات، وتجربة العميلة في مساحة واحدة.
            </p>
            <BrandDivider className="mt-5" />
          </div>
        </div>

        <nav className="space-y-6 p-4">
          {groups.map((group) => (
            <section key={group.title}>
              <div className="mb-3 px-2">
                <p className="text-[11px] font-black text-gold">{group.title}</p>
                <p className="mt-1 text-[11px] leading-5 text-ivory/45">{group.hint}</p>
              </div>

              <div className="space-y-1">
                {group.links.map((item) => {
                  const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(`${item.href}/`))

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group flex items-center justify-between rounded-2xl px-4 py-3 text-xs font-bold transition ${
                        active
                          ? 'bg-ivory text-deepTeal shadow-soft'
                          : 'text-ivory/68 hover:bg-white/8 hover:text-ivory'
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
              <PremiumButton
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-ivory hover:bg-white/10"
                onClick={() => logout()}
              >
                تسجيل الخروج
              </PremiumButton>
            </div>
          </div>
        </div>
      </aside>

      <section className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 border-b border-sand/80 bg-cream/88 backdrop-blur-xl">
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
                <p className="mini-label">إدارة المنصة</p>
                <h1 className="brand-title mt-1 text-2xl font-black text-petrol">لوحة قيادة هبة الشريف</h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <PremiumBadge variant="gold">V3.3 Launch</PremiumBadge>
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

          {mobileOpen ? (
            <div className="border-t border-sand bg-ivory/95 px-5 py-4 shadow-soft lg:hidden">
              <div className="grid max-h-[60vh] gap-2 overflow-y-auto">
                {groups.flatMap((group) => group.links).map((item) => {
                  const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(`${item.href}/`))

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`rounded-2xl px-4 py-3 text-xs font-bold transition ${
                        active ? 'bg-petrol text-ivory' : 'border border-sand bg-cream text-warm-gray'
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
