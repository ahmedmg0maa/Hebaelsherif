export const BRAND = {
  arName: 'هبة الشريف',
  enName: 'Heba ElSherif',
  tagline: 'نقطة وعي تعيدك إلى ذاتك',
  shortTagline: 'رحلة وعي تعيدك إلى ذاتك',
  description:
    'مساحة عربية فاخرة للكوتشنج، التعلم العاطفي، الكتب الرقمية، والجلسات الفردية؛ تساعدك على فهم نفسك بعمق وبناء حياة أكثر وعيًا واتزانًا.',
  credentials: 'لايف كوتش معتمدة ICF | مدربة وعي بالذات | كاتبة وروائية',
  promise:
    'أدعم رحلة فهم النفس بأمان من خلال تواصل أعمق مع الذات، لاكتشاف رسالتك، واختيار طريقك بوعي، وعيش حياة تشبهك بحرية واتزان.',
} as const

export const COLORS = {
  ivory: '#F7F2EA',
  softWhite: '#FFFDF8',
  sand: '#D8D0BE',
  taupe: '#9C9484',
  khaki: '#A79C82',
  deepTeal: '#0E3440',
  tealHover: '#123F4C',
  burgundy: '#7A1F2B',
  burgundySoft: '#B45A64',
  cobalt: '#2F6FA8',
  antiqueGold: '#B59A65',
  mutedGold: '#D5C49E',
  ink: '#1F1E1C',
  textSoft: '#6E675D',
  border: '#E6DDCF',

  // Legacy aliases kept for existing components while the codebase migrates to semantic V7 names.
  cream: '#F7F2EA',
  warmBeige: '#D8D0BE',
  petrol: '#0E3440',
  aqua: '#2F6FA8',
  gold: '#B59A65',
  olive: '#A79C82',
  paper: '#FFFDF8',
  softSand: '#D8D0BE',
  stone: '#B59A65',
  leafGray: '#9C9484',
  warmGray: '#6E675D',
  charcoal: '#1F1E1C',
} as const

export const BRAND_TOKENS = {
  identityWords: ['وعي', 'بصيرة', 'نور داخلي', 'رسالة', 'اتزان'],
  visualLanguage: [
    'زخارف نباتية هادئة',
    'خطوط ذهبية رفيعة',
    'خلفيات ورقية دافئة',
    'أقواس ومنحنيات عربية',
    'مساحات تنفس كبيرة',
  ],
  designPrinciples: [
    'الهدوء قبل الانبهار',
    'الوضوح قبل كثرة العناصر',
    'الفخامة من التفاصيل الصغيرة',
    'الألوان البترولية هي القيادة والبورغندي accent فقط',
    'كل صورة لها إطار براند واضح حتى قبل إضافة الصورة الحقيقية',
  ],
} as const

export const PUBLIC_NAV_LINKS = [
  { href: '/', label: 'الرئيسية' },
  { href: '/services', label: 'الخدمات' },
  { href: '/books', label: 'الكتب' },
  { href: '/booking', label: 'الجلسات' },
  { href: '/articles', label: 'المقالات' },
  { href: '/about', label: 'عن هبة' },
  { href: '/contact', label: 'تواصل' },
] as const

export const DASHBOARD_NAV_LINKS = [
  { href: '/dashboard', label: 'رحلتي' },
  { href: '/dashboard/courses', label: 'كورساتي' },
  { href: '/dashboard/books', label: 'كتبي' },
  { href: '/dashboard/sessions', label: 'جلساتي' },
  { href: '/dashboard/orders', label: 'طلباتي' },
  { href: '/dashboard/profile', label: 'الملف الشخصي' },
] as const

export const ADMIN_NAV_LINKS = [
  { href: '/admin', label: 'لوحة التشغيل' },
  { href: '/admin/action-queue', label: 'قائمة المتابعة' },
  { href: '/admin/notifications', label: 'الإشعارات' },
  { href: '/admin/products', label: 'المنتجات' },
  { href: '/admin/orders', label: 'الطلبات' },
  { href: '/admin/bookings', label: 'الحجوزات' },
  { href: '/admin/messages', label: 'الرسائل' },
  { href: '/admin/tasks', label: 'المهام' },
  { href: '/admin/courses', label: 'الكورسات' },
  { href: '/admin/books', label: 'الكتب' },
  { href: '/admin/workshops', label: 'الورش' },
  { href: '/admin/coupons', label: 'الكوبونات' },
  { href: '/admin/offers', label: 'العروض' },
  { href: '/admin/pages', label: 'الصفحات' },
  { href: '/admin/media', label: 'الوسائط' },
  { href: '/admin/content', label: 'المحتوى المحمي' },
  { href: '/admin/users', label: 'العملاء' },
  { href: '/admin/reviews', label: 'التقييمات' },
  { href: '/admin/reports', label: 'التقارير' },
  { href: '/admin/analytics', label: 'التحليلات' },
  { href: '/admin/campaigns', label: 'الحملات' },
  { href: '/admin/security', label: 'الحماية' },
  { href: '/admin/roles', label: 'الصلاحيات' },
  { href: '/admin/audit-logs', label: 'سجل التدقيق' },
  { href: '/admin/system-health', label: 'صحة النظام' },
  { href: '/admin/templates', label: 'قوالب الرسائل' },
  { href: '/admin/logs', label: 'السجلات القديمة' },
  { href: '/admin/settings', label: 'الإعدادات' },
  { href: '/admin/exports', label: 'التصدير' },
] as const

export const SOCIAL_LINKS = [
  { key: 'facebook', label: 'Facebook', display: 'فيسبوك', href: process.env.NEXT_PUBLIC_FACEBOOK_URL || '#' },
  { key: 'instagram', label: 'Instagram', display: 'إنستغرام', href: process.env.NEXT_PUBLIC_INSTAGRAM_URL || '#' },
  { key: 'tiktok', label: 'TikTok', display: 'تيك توك', href: process.env.NEXT_PUBLIC_TIKTOK_URL || '#' },
] as const
