import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { PreviewAdminLogin } from '@/components/preview-admin/PreviewAdminLogin'
import { hasPreviewAdminSession, isPreviewAdminConfigured } from '@/lib/preview/admin-session'
import { logoutPreviewAdmin } from '@/lib/actions/preview-admin'

export const metadata: Metadata = {
  title: 'معاينة لوحة الإدارة',
  robots: { index: false, follow: false, noarchive: true, nocache: true },
}

// Secret availability and the signed HttpOnly cookie are runtime facts. This
// route must never be frozen at build time while deployment secrets are absent.
export const dynamic = 'force-dynamic'

const modules = [
  { label: 'الصفحة الرئيسية', detail: 'Hero والأقسام والمسارات الظاهرة للعميلة', admin: '/admin/pages', publicHref: '/' },
  { label: 'الخدمات والحجز', detail: 'الخدمات والتوافر ورحلة اختيار الموعد', admin: '/admin/bookings', publicHref: '/booking' },
  { label: 'الدورات والتعلّم', detail: 'الكتالوج والمناهج وتجربة الدرس', admin: '/admin/courses', publicHref: '/courses/preview-clarity-journey' },
  { label: 'الكتب والتسليم', detail: 'الكتب والملفات المحمية وتجربة القارئة', admin: '/admin/books', publicHref: '/books/preview-listen-inward' },
  { label: 'الورش والبرامج', detail: 'الورش والباقات والعروض المنشورة', admin: '/admin/workshops', publicHref: '/programs' },
  { label: 'المقالات والموارد', detail: 'المحتوى التحريري والبحث العام', admin: '/admin/articles', publicHref: '/articles' },
  { label: 'الطلبات والمدفوعات', detail: 'إثبات الدفع والمراجعة والاستحقاقات', admin: '/admin/payments', publicHref: '/services' },
  { label: 'العميلات والصلاحيات', detail: 'Customer 360 والأدوار وسجل التدقيق', admin: '/admin/users', publicHref: '/auth/login' },
  { label: 'التشغيل والجاهزية', detail: 'التقارير والأمان والتنبيهات وحالة الإطلاق', admin: '/admin/system', publicHref: '/contact' },
] as const

function LoginScreen({ configured }: { configured: boolean }) {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-ivory px-5 py-10 text-ink sm:px-8">
      <Image src="/images/experience/editorial-reflection-studio.webp" alt="" fill unoptimized sizes="100vw" className="-z-20 object-cover opacity-28" />
      <span className="absolute inset-0 -z-10 bg-linear-to-l from-ivory/98 via-ivory/91 to-ivory/72" aria-hidden />
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center lg:grid-cols-[.9fr_1.1fr]">
        <section className="max-w-xl rounded-[2rem] border border-line bg-surface-raised/92 p-7 shadow-[0_28px_90px_rgb(38_56_61_/_0.14)] backdrop-blur-xl sm:p-10">
          <Link href="/" className="text-sm font-bold text-deep-teal">العودة إلى الموقع ←</Link>
          <p className="mt-8 text-xs font-bold tracking-[.17em] text-[#9A7042]">ADMIN VISUAL PREVIEW</p>
          <h1 className="mt-3 text-4xl font-bold leading-tight text-deep-teal sm:text-5xl">معاينة لوحة الإدارة</h1>
          <p className="mt-4 leading-loose text-text-soft">بوابة منفصلة لمراجعة شكل وتجربة التشغيل على Preview. لا تعرض بيانات عميلات ولا تنفّذ أي كتابة على قاعدة البيانات.</p>
          {configured ? <PreviewAdminLogin /> : <p role="status" className="mt-7 rounded-2xl border border-antique-gold/30 bg-antique-gold/8 px-4 py-4 text-sm leading-loose text-text-soft">لم تُضف أسرار بوابة المعاينة إلى هذا الـWorker بعد. الإدارة الحقيقية تظل مغلقة ولا تُفتح بكلمة مرور داخل الكود.</p>}
        </section>
      </div>
    </main>
  )
}

export default async function PreviewAdminPage() {
  const configured = isPreviewAdminConfigured()
  if (!configured || !await hasPreviewAdminSession()) return <LoginScreen configured={configured} />

  return (
    <main className="min-h-screen bg-ivory text-ink">
      <header className="border-b border-line bg-surface-raised/94 px-5 py-4 shadow-card backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-4">
          <div><p className="text-xs font-bold tracking-[.15em] text-aqua-deep">ADMIN PREVIEW</p><h1 className="mt-1 text-2xl font-bold text-deep-teal">مركز تشغيل هبة الشريف</h1></div>
          <div className="flex items-center gap-2"><Link href="/" className="rounded-full border border-line px-4 py-2 text-sm font-bold text-deep-teal">عرض الموقع</Link><form action={logoutPreviewAdmin}><button className="rounded-full bg-deep-teal px-4 py-2 text-sm font-bold text-on-dark">خروج</button></form></div>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1500px] gap-7 px-5 py-8 sm:px-8 xl:grid-cols-[260px_1fr]">
        <aside className="h-fit rounded-[1.75rem] bg-deep-teal p-6 text-on-dark shadow-card">
          <p className="text-xs font-bold text-aqua">وضع مراجعة آمن</p>
          <p className="mt-3 text-sm leading-loose text-on-dark/72">هذه الصفحة مرآة مرئية فقط. الأزرار التشغيلية الحقيقية تبقى داخل `/admin` خلف Supabase وMFA وصلاحيات الخادم.</p>
          <div className="mt-6 rounded-2xl border border-on-dark/12 bg-on-dark/6 p-4"><strong className="text-aqua">لا كتابة خارجية</strong><p className="mt-2 text-xs leading-relaxed text-on-dark/62">لا بيانات حقيقية · لا migrations · لا Production</p></div>
        </aside>
        <section>
          <div className="grid gap-4 sm:grid-cols-3">
            {[['٩', 'وحدات تشغيل'], ['٣', 'رحلات تفاعلية'], ['٠', 'عمليات كتابة']].map(([value, label]) => <div key={label} className="rounded-3xl border border-line bg-surface-raised p-6 shadow-card"><strong className="text-4xl text-deep-teal">{value}</strong><p className="mt-2 text-sm text-text-soft">{label}</p></div>)}
          </div>
          <div className="mt-7 flex items-end justify-between gap-4"><div><p className="text-xs font-bold tracking-[.14em] text-[#9A7042]">OPERATIONS MAP</p><h2 className="mt-2 text-3xl font-bold text-deep-teal">ما الذي تديره المالكة؟</h2></div><span className="hidden rounded-full border border-aqua/35 bg-aqua/8 px-4 py-2 text-xs font-bold text-deep-teal sm:block">Preview read-only</span></div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {modules.map((module, index) => <article key={module.label} className="group flex min-h-52 flex-col rounded-[1.6rem] border border-line bg-surface-raised p-6 shadow-card transition hover:-translate-y-1 hover:border-aqua hover:shadow-card-hover"><div className="flex items-center justify-between"><span className="font-heading text-sm text-[#9A7042]">{String(index + 1).padStart(2, '0')}</span><code className="rounded-full bg-ivory px-2.5 py-1 text-[10px] text-text-soft" dir="ltr">{module.admin}</code></div><h3 className="mt-7 text-xl font-bold text-deep-teal">{module.label}</h3><p className="mt-2 flex-1 text-sm leading-relaxed text-text-soft">{module.detail}</p><Link href={module.publicHref} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-burgundy">راجعي الأثر المرئي <span className="transition group-hover:-translate-x-1" aria-hidden>←</span></Link></article>)}
          </div>
        </section>
      </div>
    </main>
  )
}
