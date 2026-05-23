import Link from 'next/link'
import type { ReactNode } from 'react'
import { BRAND } from '@/constants/design'

interface AuthShellProps {
  title: string
  description: string
  children: ReactNode
  footerText: string
  footerLinkText: string
  footerLinkHref: string
}

export default function AuthShell({
  title,
  description,
  children,
  footerText,
  footerLinkText,
  footerLinkHref,
}: AuthShellProps) {
  return (
    <main className="min-h-screen bg-cream">
      <div className="container-premium grid min-h-screen items-center gap-10 py-10 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="hidden lg:block">
          <Link href="/" className="inline-block">
            <span className="block text-3xl font-black text-petrol">{BRAND.arName}</span>
            <span className="mt-2 block text-sm font-semibold text-gold">{BRAND.tagline}</span>
          </Link>

          <div className="mt-12 rounded-[2rem] border border-sand bg-ivory/90 p-10 shadow-soft">
            <p className="mb-4 text-sm font-bold tracking-[0.25em] text-gold">
              مساحة خاصة وآمنة
            </p>

            <h1 className="text-4xl font-black leading-tight text-petrol">
              دخولك للمنصة هو بداية رحلتك الهادئة
            </h1>

            <p className="mt-6 text-sm leading-8 text-warm-gray">
              من هنا تستطيعين متابعة الكورسات، قراءة الكتب، إدارة الجلسات، ومراجعة طلباتك في تجربة
              عربية فاخرة ومحمية.
            </p>

            <div className="mt-8 grid gap-3">
              <div className="rounded-2xl border border-sand bg-cream p-4">
                <strong className="block text-sm text-charcoal">محتوى محمي</strong>
                <span className="mt-1 block text-xs leading-6 text-warm-gray">
                  الوصول للكورسات والكتب يتم بعد تسجيل الدخول وتأكيد الطلب.
                </span>
              </div>

              <div className="rounded-2xl border border-sand bg-cream p-4">
                <strong className="block text-sm text-charcoal">رحلتك محفوظة</strong>
                <span className="mt-1 block text-xs leading-6 text-warm-gray">
                  تقدمك في الكورسات وجلساتك وطلباتك تظهر داخل لوحة المستخدم.
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-md">
          <div className="mb-8 text-center lg:hidden">
            <Link href="/" className="inline-block">
              <span className="block text-2xl font-black text-petrol">{BRAND.arName}</span>
              <span className="mt-1 block text-xs font-semibold text-gold">{BRAND.tagline}</span>
            </Link>
          </div>

          <div className="rounded-[2rem] border border-sand bg-ivory/95 p-6 shadow-premium sm:p-8">
            <div className="mb-7 text-center">
              <h2 className="text-2xl font-black text-charcoal">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-warm-gray">{description}</p>
            </div>

            {children}

            <p className="mt-7 text-center text-sm text-warm-gray">
              {footerText}{' '}
              <Link href={footerLinkHref} className="font-bold text-petrol hover:text-gold">
                {footerLinkText}
              </Link>
            </p>
          </div>

          <div className="mt-6 text-center">
            <Link href="/" className="text-xs font-bold text-warm-gray transition hover:text-petrol">
              العودة للصفحة الرئيسية
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}