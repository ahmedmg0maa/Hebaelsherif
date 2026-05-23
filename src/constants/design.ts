export const BRAND = {
  arName: 'هبة الشريف',
  enName: 'Heba ElSherif',
  tagline: 'رحلة هادئة نحو الوضوح العاطفي',
  description:
    'منصة عربية فاخرة للتحول العاطفي والنمو الشخصي من خلال الدورات، الكتب، والجلسات الفردية.',
} as const

export const COLORS = {
  cream: '#FBF4EE',
  petrol: '#2F6173',
  olive: '#6B724E',
  gold: '#C69A69',
  burgundy: '#7A2433',
  ivory: '#FFFAF6',
  sand: '#EADBD0',
  stone: '#C8B8AE',
  warmGray: '#8C7770',
  charcoal: '#332625',
} as const

export const PUBLIC_NAV_LINKS = [
  { href: '/', label: 'الرئيسية' },
  { href: '/services', label: 'الخدمات' },
  { href: '/courses', label: 'الدورات' },
  { href: '/books', label: 'الكتب' },
  { href: '/booking', label: 'الجلسات' },
  { href: '/articles', label: 'المقالات' },
  { href: '/about', label: 'عن هبة' },
] as const

export const DASHBOARD_NAV_LINKS = [
  { href: '/dashboard', label: 'رحلتي' },
  { href: '/dashboard/courses', label: 'دوراتي' },
  { href: '/dashboard/books', label: 'كتبي' },
  { href: '/dashboard/sessions', label: 'جلساتي' },
  { href: '/dashboard/orders', label: 'طلباتي' },
  { href: '/dashboard/profile', label: 'الملف الشخصي' },
] as const

export const ADMIN_NAV_LINKS = [
  { href: '/admin', label: 'لوحة التحكم' },
  { href: '/admin/analytics', label: 'التحليلات' },
  { href: '/admin/courses', label: 'الدورات' },
  { href: '/admin/books', label: 'الكتب' },
  { href: '/admin/content', label: 'المحتوى المحمي' },
  { href: '/admin/bookings', label: 'الحجوزات' },
  { href: '/admin/orders', label: 'الطلبات' },
  { href: '/admin/reviews', label: 'التقييمات' },
  { href: '/admin/logs', label: 'السجل' },
] as const
