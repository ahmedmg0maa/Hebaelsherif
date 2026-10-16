import Link from 'next/link'
import { BrandLogo } from './BrandLogo'
import type { PublicNavigationItem } from '@/lib/data/cms'

const columns = [
  {
    title: 'اختاري تجربتك',
    links: [
      { href: '/start-here', label: 'ابدئي من هنا' },
      { href: '/courses', label: 'الدورات التدريبية' },
      { href: '/books', label: 'الكتب الرقمية' },
      { href: '/workshops', label: 'ورش العمل' },
      { href: '/booking', label: 'الجلسات الفردية' },
      { href: '/programs', label: 'البرامج والباقات' },
    ],
  },
  {
    title: 'اكتشفي المنصة',
    links: [
      { href: '/about', label: 'عن هبة الشريف' },
      { href: '/articles', label: 'المقالات' },
      { href: '/resources', label: 'مكتبة الموارد' },
      { href: '/testimonials', label: 'تجارب موثقة' },
      { href: '/press', label: 'الظهور الإعلامي' },
      { href: '/faq', label: 'الأسئلة الشائعة' },
    ],
  },
  {
    title: 'الثقة والخصوصية',
    links: [
      { href: '/privacy', label: 'سياسة الخصوصية' },
      { href: '/terms', label: 'الشروط والأحكام' },
      { href: '/refund', label: 'الحجز والإلغاء والاسترداد' },
      { href: '/disclaimer', label: 'إخلاء المسؤولية' },
      { href: '/contact', label: 'تواصلي معنا' },
    ],
  },
]

export function PublicFooter({ items = [] }: { items?: PublicNavigationItem[] }) {
  const dynamicColumns = items.length ? [
    { title: 'اختاري تجربتك', links: items.filter((item) => item.menu === 'footer_platform') },
    { title: 'اكتشفي المنصة', links: items.filter((item) => item.menu === 'footer_about') },
    { title: 'الثقة والخصوصية', links: items.filter((item) => item.menu === 'footer_legal') },
  ] : columns

  return (
    <footer id="footer" className="relative overflow-hidden bg-deep-teal text-on-dark">
      <span aria-hidden className="pointer-events-none absolute inset-y-0 start-[12%] w-px bg-linear-to-b from-transparent via-antique-gold/15 to-transparent" />
      <span aria-hidden className="pointer-events-none absolute inset-y-0 end-[12%] w-px bg-linear-to-b from-transparent via-antique-gold/15 to-transparent" />

      <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-12 sm:px-8 lg:grid-cols-[1.25fr_2fr] lg:py-16">
        <div>
          <div className="flex items-center gap-4">
            <BrandLogo tone="light" className="h-20 w-20 rounded-[1.6rem]" />
            <div>
              <p className="font-heading text-2xl font-bold">هبة الشريف</p>
              <p className="mt-1 text-xs font-bold tracking-[.28em] text-antique-gold" dir="ltr">HEBA ELSHERIF</p>
            </div>
          </div>
          <p className="mt-6 max-w-sm text-sm leading-[2] text-on-dark/68">
            مساحة عربية للتعلّم والتطوّر الواعي؛ تجمع بين المعرفة الهادئة، الأدوات العملية، وتجارب واضحة الحدود تساعدك على اختيار خطوتك التالية.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 text-sm">
            <Link prefetch={false} href="/search" className="inline-flex min-h-12 items-center rounded-full border border-on-dark/18 px-4 py-2 text-on-dark/78 transition hover:border-aqua hover:text-aqua">ابحثي في المنصة</Link>
            <a href="#main-content" className="inline-flex min-h-12 items-center rounded-full border border-on-dark/18 px-4 text-on-dark/80 hover:text-on-dark">العودة للأعلى ↑</a>
            <Link prefetch={false} href="/auth/login" className="inline-flex min-h-12 items-center rounded-full border border-on-dark/18 px-4 py-2 text-on-dark/78 transition hover:border-aqua hover:text-aqua">دخول الحساب</Link>
          </div>
        </div>

        <div className="hidden gap-x-6 gap-y-10 md:grid md:grid-cols-3">
          {dynamicColumns.map((column) => (
            <div key={column.title}>
              <h3 className="mb-5 font-heading text-lg font-bold text-aqua">{column.title}</h3>
              <ul className="space-y-3">
                {column.links.map((link) => (
                  <li key={`${column.title}-${link.href}`}>
                    <Link prefetch={false} href={link.href} className="text-sm text-on-dark/65 transition-colors hover:text-on-dark">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="divide-y divide-on-dark/20 md:hidden">
          {dynamicColumns.map((column) => <details key={column.title} className="group py-2">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between font-heading text-xl font-bold text-aqua">{column.title}<span aria-hidden className="transition-transform group-open:rotate-45">+</span></summary>
            <ul className="pb-3">{column.links.map((link) => <li key={link.href}><Link prefetch={false} href={link.href} className="flex min-h-12 items-center text-sm text-on-dark/80 hover:text-on-dark">{link.label}</Link></li>)}</ul>
          </details>)}
        </div>
      </div>

      <div className="relative border-t border-on-dark/12 bg-[#183D49]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-5 py-5 text-center text-xs text-on-dark/55 sm:px-8 md:flex-row md:text-start">
          <p>© {new Date().getFullYear()} هبة الشريف. جميع الحقوق محفوظة.</p>
          <Link prefetch={false} href="/auth/admin" className="inline-flex min-h-11 items-center text-on-dark/80 underline underline-offset-4 hover:text-on-dark">دخول الإدارة</Link>
          <p>محتوى للتعلّم والتطوير، لا يقدّم تشخيصًا أو بديلًا عن المختصين.</p>
        </div>
      </div>
    </footer>
  )
}
