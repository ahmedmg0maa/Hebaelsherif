'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const pageNames: Record<string, string> = {
  '/dashboard': 'ملخّص رحلتك',
  '/dashboard/courses': 'دوراتي',
  '/dashboard/books': 'مكتبتي',
  '/dashboard/workshops': 'ورش العمل',
  '/dashboard/subscriptions': 'اشتراكاتي',
  '/dashboard/bookings': 'جلساتي وحجوزاتي',
  '/dashboard/orders': 'طلباتي',
  '/dashboard/payments': 'مدفوعاتي',
  '/dashboard/notifications': 'الإشعارات',
  '/dashboard/profile': 'ملفي الشخصي',
  '/dashboard/settings': 'إعدادات الحساب',
}

export function DashboardTopbar() {
  const pathname = usePathname()
  const current = Object.keys(pageNames)
    .sort((a, b) => b.length - a.length)
    .find((path) => pathname === path || (path !== '/dashboard' && pathname.startsWith(`${path}/`)))

  return (
    <header className="mb-7 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-surface-raised/85 px-4 py-3 shadow-card backdrop-blur sm:px-5">
      <div>
        <p className="text-sm font-semibold text-burgundy">مساحة التعلّم</p>
        <p className="mt-0.5 font-heading text-lg font-bold text-deep-teal">{pageNames[current ?? '/dashboard']}</p>
      </div>
      <Link href="/" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold text-deep-teal transition-colors hover:border-antique-gold hover:bg-ivory">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden><path d="M4 11 12 4l8 7v9H4z" strokeLinecap="round" strokeLinejoin="round" /><path d="M9 20v-6h6v6" /></svg>
        الموقع الرئيسي
      </Link>
    </header>
  )
}
