import type { SidebarSection } from '@/components/ui/Sidebar'
import type { Permission } from '@/lib/auth/permissions'

export type AdminBadges = Partial<Record<'payments' | 'orders' | 'bookings' | 'reviews' | 'messages', number>>

function sections(badges: AdminBadges): SidebarSection[] {
  return [
    {title:'يومي',items:[{href:'/admin/overview',label:'ملخص الإدارة'}]},
    {title:'الجلسات',items:[
      {href:'/admin/bookings',label:'الحجوزات والمواعيد',badge:badges.bookings},
      {href:'/admin/services',label:'الجلسات وسياساتها'},
    ]},
    {title:'المحتوى',items:[
      {href:'/admin/courses',label:'الكورسات'},
      {href:'/admin/books',label:'الكتب'},
      {href:'/admin/workshops',label:'ورش العمل'},
      {href:'/admin/articles',label:'المقالات'},
      {href:'/admin/resources',label:'مكتبة الموارد'},
      {href:'/admin/media',label:'الصور والوسائط'},
      {href:'/admin/products',label:'كل المنتجات'},
    ]},
    {title:'الموقع',items:[
      {href:'/admin/pages',label:'الرئيسية والصفحات'},
      {href:'/admin/assessments',label:'الاختبار الإرشادي'},
      {href:'/admin/press',label:'الظهور الإعلامي'},
    ]},
    {title:'العميلات',items:[
      {href:'/admin/users',label:'حسابات العميلات'},
      {href:'/admin/inbox',label:'الرسائل والقائمة البريدية',badge:badges.messages},
      {href:'/admin/reviews',label:'التقييمات',badge:badges.reviews},
    ]},
    {title:'المبيعات',items:[
      {href:'/admin/orders',label:'الطلبات',badge:badges.orders},
      {href:'/admin/payments',label:'مراجعة الدفعات',badge:badges.payments},
      {href:'/admin/memberships',label:'الباقات والاشتراكات'},
      {href:'/admin/offers',label:'العروض'},
      {href:'/admin/coupons',label:'الكوبونات'},
      {href:'/admin/reports',label:'التقارير'},
    ]},
    {title:'الإدارة المتقدمة',items:[
      {href:'/admin/roles',label:'الفريق والصلاحيات'},
      {href:'/admin/settings',label:'إعدادات الموقع والقوائم'},
      {href:'/admin/security',label:'الأمان'},
      {href:'/admin/login-history',label:'سجل الدخول'},
      {href:'/admin/audit-logs',label:'سجل التغييرات'},
      {href:'/admin/revisions',label:'استعادة المحتوى'},
      {href:'/admin/delivery',label:'الملفات المحمية'},
      {href:'/admin/system',label:'حالة النظام'},
    ]},
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
