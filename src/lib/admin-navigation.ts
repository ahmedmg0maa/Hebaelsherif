import type { SidebarSection } from '@/components/ui/Sidebar'
import type { Permission } from '@/lib/auth/permissions'

export type AdminBadges = Partial<Record<'payments' | 'orders' | 'bookings' | 'reviews' | 'messages', number>>

function sections(badges: AdminBadges): SidebarSection[] {
  return [
    {
      items: [{ href: '/admin/overview', label: 'نظرة عامة' }],
    },
    {
      title: 'العمليات',
      items: [
        { href: '/admin/payments', label: 'موافقات الدفع', badge: badges.payments },
        { href: '/admin/orders', label: 'الطلبات', badge: badges.orders },
        { href: '/admin/bookings', label: 'الحجوزات', badge: badges.bookings },
        { href: '/admin/memberships', label: 'الباقات والاشتراكات' },
        { href: '/admin/users', label: 'العملاء' },
        { href: '/admin/inbox', label: 'الرسائل والقائمة البريدية', badge: badges.messages },
      ],
    },
    {
      title: 'المحتوى',
      items: [
        { href: '/admin/products', label: 'المنتجات' },
        { href: '/admin/services', label: 'الخدمات والسياسات' },
        { href: '/admin/courses', label: 'الدورات' },
        { href: '/admin/books', label: 'الكتب' },
        { href: '/admin/workshops', label: 'ورش العمل' },
        { href: '/admin/articles', label: 'المقالات' },
        { href: '/admin/pages', label: 'الصفحات' },
        { href: '/admin/revisions', label: 'مراجعات المحتوى' },
        { href: '/admin/media', label: 'الوسائط' },
        { href: '/admin/reviews', label: 'التقييمات', badge: badges.reviews },
        { href: '/admin/press', label: 'الظهور الإعلامي' },
        { href: '/admin/resources', label: 'مكتبة الموارد' },
        { href: '/admin/assessments', label: 'الاختبار الإرشادي' },
      ],
    },
    {
      title: 'التسويق',
      items: [
        { href: '/admin/offers', label: 'العروض' },
        { href: '/admin/coupons', label: 'الكوبونات' },
        { href: '/admin/reports', label: 'التقارير' },
      ],
    },
    {
      title: 'النظام',
      items: [
        { href: '/admin/roles', label: 'الأدوار والصلاحيات' },
        { href: '/admin/login-history', label: 'أرشيف تسجيل الدخول' },
        { href: '/admin/audit-logs', label: 'سجل التدقيق' },
        { href: '/admin/security', label: 'الأمان' },
        { href: '/admin/settings', label: 'التحكم الكامل والإعدادات' },
        { href: '/admin/delivery', label: 'الملفات المحمية' },
        { href: '/admin/system', label: 'حالة النظام' },
      ],
    },
  ]
}

const routePermission: Record<string, Permission> = {
  '/admin/payments': 'payments.view', '/admin/orders': 'orders.view', '/admin/bookings': 'bookings.view',
  '/admin/memberships': 'packages.manage', '/admin/users': 'users.view', '/admin/inbox': 'inbox.view',
  '/admin/services': 'catalog.view', '/admin/products': 'catalog.view', '/admin/courses': 'catalog.view', '/admin/books': 'catalog.view',
  '/admin/workshops': 'catalog.view', '/admin/articles': 'content.view', '/admin/pages': 'content.view',
  '/admin/revisions': 'content.manage',
  '/admin/media': 'media.view', '/admin/reviews': 'reviews.manage', '/admin/press': 'press.manage', '/admin/resources': 'resources.manage', '/admin/assessments': 'assessments.manage', '/admin/offers': 'marketing.manage',
  '/admin/coupons': 'marketing.manage', '/admin/reports': 'reports.view', '/admin/roles': 'roles.manage',
  '/admin/login-history': 'audit.view',
  '/admin/audit-logs': 'audit.view', '/admin/security': 'system.view', '/admin/settings': 'settings.view',
  '/admin/system': 'system.view', '/admin/delivery': 'learning.manage',
}

export function adminNavigation(permissions:readonly Permission[],badges:AdminBadges={}):SidebarSection[] {
  return sections(badges).map(section=>({...section,items:section.items.filter(item=>{const required=routePermission[item.href];return !required||permissions.includes(required)})})).filter(section=>section.items.length>0)
}
export function normalizeNavigationQuery(value:string) {
  return value.normalize('NFKC').replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').toLocaleLowerCase('ar').trim()
}
