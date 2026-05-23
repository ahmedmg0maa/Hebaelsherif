import Link from 'next/link'
import { BRAND, PUBLIC_NAV_LINKS } from '@/constants/design'

const footerSections = [
  { title: 'المنصة', links: PUBLIC_NAV_LINKS },
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
      { href: '/articles', label: 'المقالات' },
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
    <footer className="relative overflow-hidden border-t border-sand bg-ivory/75 backdrop-blur-sm">
      <div className="ambient-orb ambient-orb-gold -right-10 top-10 h-44 w-44" />
      <div className="ambient-orb ambient-orb-rose bottom-0 left-10 h-56 w-56" />

      <div className="container-premium relative py-14">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_2fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-burgundy/15 bg-cream text-xl font-black text-burgundy shadow-soft">هـ</span>
              <span>
                <span className="block text-2xl font-black text-charcoal">{BRAND.arName}</span>
                <span className="mt-1 block text-xs font-bold tracking-[.22em] text-burgundy">{BRAND.enName}</span>
              </span>
            </Link>
            <p className="mt-5 max-w-md text-sm leading-8 text-warm-gray">{BRAND.description}</p>
            <div className="mt-6 rounded-[2rem] border border-sand bg-cream/70 p-5 backdrop-blur-sm">
              <p className="mini-label">مساحة آمنة للنمو</p>
              <p className="mt-3 text-xs leading-6 text-warm-gray">
                منصة عربية فاخرة تجمع الدورات، الكتب، والجلسات الخاصة في تجربة هادئة ومحكمة ومحمية.
              </p>
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-4">
            {footerSections.map((section) => (
              <div key={section.title}>
                <h3 className="mb-4 text-sm font-black text-charcoal">{section.title}</h3>
                <ul className="space-y-3">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="text-sm font-bold text-warm-gray transition hover:text-burgundy">
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
          <p>© {new Date().getFullYear()} {BRAND.arName}. جميع الحقوق محفوظة.</p>
          <p>Premium Arabic emotional learning platform.</p>
        </div>
      </div>
    </footer>
  )
}
