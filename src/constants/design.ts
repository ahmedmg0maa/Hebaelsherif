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
  cream: '#F5F0E7',
  warmBeige: '#E4D7C7',
  petrol: '#2F6173',
  deepTeal: '#0F3237',
  aqua: '#2F6173',
  gold: '#B79B60',
  olive: '#6F6A2F',
  burgundy: '#7A2433',
  ivory: '#F5F0E7',
  paper: '#F5F0E7',
  sand: '#E4D7C7',
  softSand: '#E4D7C7',
  stone: '#B79B60',
  leafGray: '#6F6A2F',
  warmGray: '#6F6A2F',
  charcoal: '#0F3237',
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
  { href: '/courses', label: 'الكورسات' },
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
  { href: '/admin/orders', label: 'الطلبات' },
  { href: '/admin/bookings', label: 'الحجوزات' },
  { href: '/admin/messages', label: 'الرسائل' },
  { href: '/admin/tasks', label: 'المهام' },
  { href: '/admin/courses', label: 'الكورسات' },
  { href: '/admin/books', label: 'الكتب' },
  { href: '/admin/content', label: 'المحتوى المحمي' },
  { href: '/admin/users', label: 'العملاء' },
  { href: '/admin/reviews', label: 'التقييمات' },
  { href: '/admin/analytics', label: 'التحليلات' },
  { href: '/admin/campaigns', label: 'الحملات' },
  { href: '/admin/system-health', label: 'صحة النظام' },
  { href: '/admin/templates', label: 'قوالب الرسائل' },
  { href: '/admin/logs', label: 'السجلات' },
  { href: '/admin/settings', label: 'الإعدادات' },
  { href: '/admin/exports', label: 'التصدير' },
] as const

export const SOCIAL_LINKS = [
  { key: 'facebook', label: 'Facebook', display: 'فيسبوك', href: process.env.NEXT_PUBLIC_FACEBOOK_URL || '#' },
  { key: 'instagram', label: 'Instagram', display: 'إنستغرام', href: process.env.NEXT_PUBLIC_INSTAGRAM_URL || '#' },
  { key: 'tiktok', label: 'TikTok', display: 'تيك توك', href: process.env.NEXT_PUBLIC_TIKTOK_URL || '#' },
] as const
