export const BRAND = {
  arName: 'هبة الشريف',
  enName: 'Heba ElSherif',
  tagline: 'رحلة هادئة نحو الوضوح العاطفي',
  description:
    'منصة عربية فاخرة للتحول العاطفي والنمو الشخصي من خلال الدورات، الكتب، والجلسات الفردية.',
} as const

export const COLORS = {
  cream: '#F5F0E7',
  petrol: '#2F6173',
  olive: '#6B724E',
  gold: '#B79B6C',
  burgundy: '#7A2433',
  ivory: '#FAF7F2',
  sand: '#E9E0D2',
  stone: '#C8C1B6',
  warmGray: '#8A837B',
  charcoal: '#2A2A2A',
} as const

export const PUBLIC_NAV_LINKS = [
  {
    href: '/',
    label: 'الرئيسية',
  },
  {
    href: '/courses',
    label: 'الدورات',
  },
  {
    href: '/books',
    label: 'الكتب',
  },
  {
    href: '/booking',
    label: 'الجلسات',
  },
  {
    href: '/about',
    label: 'عن هبة',
  },
] as const

export const DASHBOARD_NAV_LINKS = [
  {
    href: '/dashboard',
    label: 'رحلتي',
  },
  {
    href: '/dashboard/courses',
    label: 'دوراتي',
  },
  {
    href: '/dashboard/books',
    label: 'كتبي',
  },
  {
    href: '/dashboard/sessions',
    label: 'جلساتي',
  },
  {
    href: '/dashboard/orders',
    label: 'طلباتي',
  },
] as const

export const ADMIN_NAV_LINKS = [
  {
    href: '/admin',
    label: 'لوحة التحكم',
  },
  {
    href: '/admin/courses',
    label: 'الدورات',
  },
  {
    href: '/admin/books',
    label: 'الكتب',
  },
    {
    href: '/admin/content',
    label: 'المحتوى المحمي',
  },
  {
    href: '/admin/bookings',
    label: 'الحجوزات',
  },
  {
    href: '/admin/orders',
    label: 'الطلبات',
  },
] as const