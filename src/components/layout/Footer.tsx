import Link from 'next/link'
import { BRAND, PUBLIC_NAV_LINKS } from '@/constants/design'

const footerSections = [
  {
    title: 'المنصة',
    links: PUBLIC_NAV_LINKS,
  },
  {
    title: 'الحساب',
    links: [
      {
        href: '/auth/login',
        label: 'تسجيل الدخول',
      },
      {
        href: '/auth/register',
        label: 'إنشاء حساب',
      },
      {
        href: '/dashboard',
        label: 'لوحتي',
      },
    ],
  },
  {
    title: 'الدعم',
    links: [
      {
        href: '/privacy',
        label: 'سياسة الخصوصية',
      },
      {
        href: '/terms',
        label: 'الشروط والأحكام',
      },
      {
        href: '/booking',
        label: 'حجز جلسة',
      },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-sand bg-ivory/75 backdrop-blur-sm">
      <div className="ambient-orb ambient-orb-gold -right-10 top-10 h-44 w-44" />
      <div className="ambient-orb ambient-orb-petrol bottom-0 left-10 h-56 w-56" />

      <div className="container-premium relative py-12">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_2fr]">
          <div>
            <Link href="/" className="inline-block">
              <span className="block text-2xl font-black text-petrol">{BRAND.arName}</span>
              <span className="mt-1 block text-sm font-bold text-gold">{BRAND.enName}</span>
            </Link>

            <p className="mt-5 max-w-md text-sm leading-8 text-warm-gray">{BRAND.description}</p>

            <div className="mt-6 rounded-3xl border border-sand bg-cream/70 p-5 backdrop-blur-sm">
              <p className="text-xs font-bold tracking-[0.2em] text-gold">
                مساحة هادئة للنمو
              </p>

              <p className="mt-3 text-xs leading-6 text-warm-gray">
                تجربة عربية فاخرة للتعلم، القراءة، والجلسات الخاصة، مصممة لتكون واضحة
                ومنظمة من أول زيارة حتى الوصول للمحتوى.
              </p>
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {footerSections.map((section) => (
              <div key={section.title}>
                <h3 className="mb-4 text-sm font-black text-charcoal">{section.title}</h3>

                <ul className="space-y-3">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm font-medium text-warm-gray transition hover:text-petrol"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-sand pt-6 text-xs text-warm-gray sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {BRAND.arName}. جميع الحقوق محفوظة.
          </p>

          <p>Arabic-first premium emotional learning platform.</p>
        </div>
      </div>
    </footer>
  )
}