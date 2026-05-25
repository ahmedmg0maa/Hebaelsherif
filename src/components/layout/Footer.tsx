import Link from 'next/link'
import { BRAND, PUBLIC_NAV_LINKS, SOCIAL_LINKS } from '@/constants/design'
import BrandMark from '@/components/brand/BrandMark'
import BrandDivider from '@/components/brand/BrandDivider'

const footerSections = [
  {
    title: 'المنصة',
    links: PUBLIC_NAV_LINKS.filter((link) => ['/', '/about', '/services', '/courses', '/books', '/articles'].includes(link.href)),
  },
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

function SocialIcon({ type }: { type: string }) {
  if (type === 'instagram') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
        <rect width="16" height="16" x="4" y="4" rx="4.5" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="17" cy="7" r="1" fill="currentColor" />
      </svg>
    )
  }

  if (type === 'tiktok') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M14 4v10.2a4.2 4.2 0 1 1-4.2-4.2c.42 0 .82.06 1.2.18V7.4a7 7 0 1 0 5.8 6.9V8.9c1.05.92 2.37 1.48 3.8 1.57V7.8A5.4 5.4 0 0 1 14 4Z" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
      <path fill="currentColor" d="M13.4 21v-7.7h2.6l.4-3h-3V8.4c0-.87.24-1.47 1.5-1.47h1.6V4.26A21.4 21.4 0 0 0 14.16 4c-2.32 0-3.9 1.42-3.9 4.02v2.24H7.63v3h2.62V21h3.15Z" />
    </svg>
  )
}

export default function Footer() {
  return (
    <footer className="botanical-frame paper-texture relative overflow-hidden border-t border-sand bg-ivory/82 backdrop-blur-sm">
      <div className="ambient-orb ambient-orb-gold -right-10 top-10 h-44 w-44" />
      <div className="ambient-orb ambient-orb-petrol bottom-0 left-10 h-56 w-56" />

      <div className="container-wide relative py-14">
        <div className="mb-10 rounded-[2.25rem] border border-gold/20 bg-cream/62 p-6 text-center shadow-soft backdrop-blur-sm">
          <BrandMark href="/" size="lg" className="justify-center" />
          <BrandDivider className="mt-5" />
          <p className="mx-auto mt-5 max-w-2xl text-sm font-bold leading-8 text-warm-gray">
            {BRAND.promise}
          </p>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1.15fr_2fr]">
          <div>
            <p className="mini-label">{BRAND.credentials}</p>
            <h2 className="mt-4 text-3xl font-black leading-tight text-petrol">{BRAND.tagline}</h2>
            <p className="mt-5 max-w-md text-sm leading-8 text-warm-gray">{BRAND.description}</p>
            <div className="mt-6 rounded-[2rem] border border-sand bg-cream/70 p-5 backdrop-blur-sm">
              <p className="mini-label">نقطة وعي</p>
              <p className="mt-3 text-xs leading-6 text-warm-gray">
                رمز للوعي والبصيرة والنور الداخلي؛ تجربة عربية هادئة لا تضغط عليك ولا تشتت انتباهك.
              </p>
            </div>

            <div className="mt-6">
              <p className="mb-3 text-xs font-black tracking-[0.18em] text-warm-gray">تابعينا</p>
              <div className="flex flex-wrap gap-2">
                {SOCIAL_LINKS.map((social) => {
                  const active = social.href && social.href !== '#'
                  const classes = 'inline-flex h-11 w-11 items-center justify-center rounded-full border border-sand bg-ivory/80 text-petrol shadow-soft transition hover:-translate-y-1 hover:border-gold/50 hover:bg-cream hover:text-gold'

                  return active ? (
                    <a
                      key={social.key}
                      href={social.href}
                      target="_blank"
                      rel="noreferrer"
                      className={classes}
                      aria-label={social.label}
                      title={social.label}
                    >
                      <SocialIcon type={social.key} />
                    </a>
                  ) : (
                    <span key={social.key} className={`${classes} opacity-45`} aria-label={`${social.label} غير مفعّل حاليًا`} title={`${social.label} غير مفعّل حاليًا`}>
                      <SocialIcon type={social.key} />
                    </span>
                  )
                })}
              </div>
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
          <p>وعي · بصيرة · نور داخلي · حياة هادفة</p>
        </div>
      </div>
    </footer>
  )
}
