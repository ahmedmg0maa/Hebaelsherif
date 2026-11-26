import { Sidebar, type SidebarSection } from '@/components/ui/Sidebar'
import { BottomNav } from '@/components/dashboard/BottomNav'
import { BrandLogo } from './BrandLogo'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { DashboardTopbar } from '@/components/dashboard/DashboardTopbar'

const sections: SidebarSection[] = [
  {
    items: [
      { href: '/dashboard', label: 'الرئيسية' },
      { href: '/dashboard/courses', label: 'دوراتي' },
      { href: '/dashboard/books', label: 'كتبي' },
      { href: '/dashboard/workshops', label: 'ورشي' },
      { href: '/dashboard/bookings', label: 'حجوزاتي' },
      { href: '/dashboard/subscriptions', label: 'اشتراكاتي' },
    ],
  },
  {
    title: 'الحساب',
    items: [
      { href: '/dashboard/orders', label: 'طلباتي' },
      { href: '/dashboard/payments', label: 'مدفوعاتي' },
      { href: '/dashboard/notifications', label: 'الإشعارات' },
      { href: '/dashboard/profile', label: 'ملفي الشخصي' },
      { href: '/dashboard/settings', label: 'الإعدادات' },
    ],
  },
]

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="customer-workspace dashboard-canvas flex min-h-screen flex-col bg-ivory lg:flex-row">
      <a href="#workspace-main" className="sr-only z-50 rounded-xl bg-surface-raised p-4 text-deep-teal focus:not-sr-only focus:fixed focus:start-4 focus:top-4">تخطي إلى المحتوى</a>
      <Sidebar
        brand={<BrandLogo tone="light" href="/dashboard" />}
        sections={sections}
        footer={
          <div className="space-y-3">
            <ThemeToggle className="sidebar-theme w-full" />

            <p className="text-xs text-on-dark/50">مساحة المتعلّمة</p>
          </div>
        }
      />
      {/* pb-28 keeps content clear of the mobile bottom tab bar */}
      <main id="workspace-main" tabIndex={-1} className="min-w-0 flex-1 px-4 py-6 pb-28 sm:px-6 sm:py-8 lg:px-10 lg:pb-8">
        <DashboardTopbar />
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
