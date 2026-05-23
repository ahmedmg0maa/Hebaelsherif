import Link from 'next/link'
import { BRAND, PUBLIC_NAV_LINKS, SOCIAL_LINKS } from '@/constants/design'

const footerSections = [
  { title: 'المنصة', links: PUBLIC_NAV_LINKS.filter((link) => ['/', '/about', '/services', '/courses', '/books', '/articles'].includes(link.href)) },
  {
    title: 'الحساب',
    links: [
      { href: '/auth/login', label: 'تسجيل الدخول' },
      { href: '/auth/register', label: 'إنشاء حساب' },
      { href: '/dashboard', label: 'لوحتي' },
    ],
  },
  {
    title: 'الدعم',
    links: [
      { href: '/booking', label: 'حجز جلسة' },
      { href: '/contact', label: 'تواصل' },
      { href: '/faq', label: 'الأسئلة الشائعة' },
    ],
  },
  {
    title: 'القانوني',
    links: [
      { href: '/privacy', label: 'الخصوصية' },
      { href: '/terms', label: 'الشروط' },
      { href: '/refund-policy', label: 'الاسترداد' },
      { href: '/session-policy', label: 'الجلسات' },
      { href: '/disclaimer', label: 'إخلاء المسؤولية' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-sand bg-ivory/78 backdrop-blur-sm">
      <div className="ambient-orb ambient-orb-gold -right-10 top-10 h-44 w-44" />
      <div className="ambient-orb ambient-orb-petrol bottom-0 left-10 h-56 w-56" />

      <div className="container-premium relative py-14">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_2fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-petrol/15 bg-cream text-xl font-black text-petrol shadow-soft">هـ</span>
              <span>
                <span className="block text-2xl font-black text-charcoal">{BRAND.arName}</span>
                <span className="mt-1 block text-xs font-bold tracking-[.22em] text-warm-gray">{BRAND.enName}</span>
              </span>
            </Link>
            <p className="mt-5 max-w-md text-sm leading-8 text-warm-gray">{BRAND.description}</p>
            <div className="mt-6 rounded-[2rem] border border-sand bg-cream/70 p-5 backdrop-blur-sm">
              <p className="mini-label">مساحة آمنة للنمو</p>
              <p className="mt-3 text-xs leading-6 text-warm-gray">
                تجربة عربية هادئة تجمع الجلسات، الكورسات، والكتب في مسار واضح لا يضغط عليك ولا يشتت انتباهك.
              </p>
            </div>

            <div className="mt-6">
              <p className="mb-3 text-xs font-black tracking-[0.18em] text-warm-gray">تابعينا</p>
              <div className="flex flex-wrap gap-2">
                {SOCIAL_LINKS.map((social) => (
                  <a
                    key={social.key}
                    href={social.href}
                    target={social.href === '#' ? undefined : '_blank'}
                    rel={social.href === '#' ? undefined : 'noreferrer'}
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-sand bg-ivory/80 px-4 text-xs font-black text-petrol shadow-soft transition hover:border-petrol/30 hover:bg-cream"
                    aria-label={social.display}
                  >
                    {social.display}
                  </a>
                ))}
              </div>
              <p className="mt-3 text-xs leading-6 text-warm-gray">ستظهر الروابط الحقيقية بمجرد إضافتها من إعدادات البيئة أو لوحة الإدارة.</p>
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-4">
            {footerSections.map((section) => (
              <div key={section.title}>
                <h3 className="mb-4 text-sm font-black text-charcoal">{section.title}</h3>
                <ul className="space-y-3">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="text-sm font-bold text-warm-gray transition hover:text-petrol">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-sand pt-6 text-xs font-bold text-warm-gray sm:flex-row sm:items-center sm:justify-between">
          <p>© <span className="latin-numerals">{new Date().getFullYear()}</span> {BRAND.arName}. جميع الحقوق محفوظة.</p>
          <p>مساحة عربية هادئة للوعي، الكوتشنج، والتعلم العاطفي.</p>
        </div>
      </div>
    </footer>
  )
}
