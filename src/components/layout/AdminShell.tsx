import { Sidebar } from '@/components/ui/Sidebar'
import { BrandLogo } from './BrandLogo'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { type Permission } from '@/lib/auth/permissions'
import { adminNavigation, type AdminBadges } from '@/lib/admin-navigation'

export function AdminShell({ children, badges = {}, permissions }: { children: React.ReactNode; badges?: AdminBadges; permissions: readonly Permission[] }) {
  const allowedSections=adminNavigation(permissions,badges)
  return (
    <div className="admin-workspace dashboard-canvas flex min-h-screen flex-col bg-ivory lg:flex-row">
      <a href="#workspace-main" className="sr-only z-50 rounded-xl bg-surface-raised p-4 text-deep-teal focus:not-sr-only focus:fixed focus:start-4 focus:top-4">تخطي إلى المحتوى</a>
      <Sidebar
        brand={<BrandLogo tone="light" href="/admin/overview" />}
        sections={allowedSections}
        footer={
          <div className="space-y-3">
            <ThemeToggle className="sidebar-theme w-full" />

            <p className="text-xs text-on-dark/50">لوحة الإدارة</p>
          </div>
        }
      />
      <main id="workspace-main" tabIndex={-1} className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10">{children}</main>
    </div>
  )
}
