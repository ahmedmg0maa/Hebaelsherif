'use client'

export const dynamic = 'force-dynamic'
import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import BrandDivider from '@/components/brand/BrandDivider'
import BrandOrnament from '@/components/brand/BrandOrnament'
import PremiumButton from '@/components/ui/PremiumButton'

function BookingConfirmationContent() {
  const searchParams = useSearchParams()
  const bookingId = searchParams.get('bookingId')

  return (
    <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1fr_380px] lg:items-center">
      <div className="premium-glow-border botanical-frame paper-texture relative overflow-hidden rounded-[2.75rem] border border-sand bg-ivory/92 p-8 text-center shadow-premium backdrop-blur-sm md:p-12">
        <div className="absolute -left-16 top-10 h-52 w-52 rounded-full bg-gold/15 blur-3xl" />
        <div className="absolute -right-20 bottom-8 h-60 w-60 rounded-full bg-petrol/12 blur-3xl" />

        <div className="relative">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-olive/20 bg-olive/10 text-4xl text-olive shadow-soft">
            ✓
          </div>

          <BrandOrnament className="mx-auto mb-4" />

          <p className="mini-label">تم إرسال الطلب</p>

          <h1 className="mt-4 text-4xl font-black leading-tight text-charcoal md:text-5xl">
            طلب الحجز وصل بنجاح
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-sm leading-8 text-warm-gray md:text-base">
            تم استلام بيانات الحجز والدفع. ستراجع الإدارة المرجع، وبعد التأكيد ستظهر الجلسة داخل لوحة حسابك في صفحة “جلساتي”.
          </p>

          {bookingId ? (
            <p className="mx-auto mt-6 max-w-xl rounded-2xl border border-sand bg-cream/70 px-4 py-3 text-xs font-bold text-warm-gray">
              رقم مرجعي للحجز: <span dir="ltr" className="latin-numerals text-petrol">{bookingId}</span>
            </p>
          ) : null}

          <BrandDivider className="my-8" />

          <div className="mx-auto grid max-w-2xl gap-3 sm:grid-cols-3">
            <NextStepCard title="1. المراجعة" text="مراجعة مرجع الدفع والموعد." />
            <NextStepCard title="2. التأكيد" text="تأكيد الجلسة داخل حسابك." />
            <NextStepCard title="3. الاستعداد" text="يصلك الموعد النهائي والمتابعة." />
          </div>

          <div className="mt-9 grid gap-3 sm:grid-cols-2">
            <PremiumButton href="/dashboard/sessions" className="w-full">
              عرض جلساتي
            </PremiumButton>

            <PremiumButton href="/" variant="outline" className="w-full">
              العودة للرئيسية
            </PremiumButton>
          </div>

          <p className="mt-6 text-xs leading-6 text-warm-gray">
            يمكنك أيضًا متابعة حالة الحجز من{' '}
            <Link href="/dashboard/sessions" className="font-black text-petrol hover:text-gold">
              لوحة المستخدم
            </Link>
            .
          </p>
        </div>
      </div>

      <aside className="space-y-4">
        <div className="rounded-[2rem] border border-sand bg-ivory/82 p-6 shadow-soft backdrop-blur-sm">
          <p className="mini-label">ما الذي يحدث الآن؟</p>
          <div className="mt-5 space-y-3">
            <InfoItem title="الطلب تحت المراجعة" text="لن يتم تثبيت الجلسة نهائيًا قبل مراجعة الدفع." />
            <InfoItem title="التحديث داخل حسابك" text="ستظهر الحالة الجديدة داخل صفحة جلساتي." />
            <InfoItem title="تواصل واضح" text="احتفظي برقم الحجز لتسهيل المتابعة عند الحاجة." />
          </div>
        </div>

        <div className="rounded-[2rem] border border-petrol/15 bg-petrol p-6 text-ivory shadow-botanical">
          <p className="text-sm font-black text-gold">رحلتك تستحق الهدوء</p>
          <p className="mt-3 text-sm leading-7 text-ivory/80">
            اكتبي قبل الجلسة أهم سؤال تريدين فهمه، وأحضري مساحة هادئة تساعدك على الإصغاء لنفسك.
          </p>
        </div>
      </aside>
    </div>
  )
}

export default function BookingConfirmationPage() {
  return (
    <>
      <Navbar />

      <main className="min-h-screen pt-20">
        <section className="container-premium flex min-h-[calc(100vh-5rem)] items-center justify-center py-16">
          <Suspense fallback={null}>
            <BookingConfirmationContent />
          </Suspense>
        </section>
      </main>

      <Footer />
    </>
  )
}

function NextStepCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-sand bg-cream/60 p-4">
      <h3 className="text-sm font-black text-charcoal">{title}</h3>
      <p className="mt-2 text-xs leading-6 text-warm-gray">{text}</p>
    </div>
  )
}

function InfoItem({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-sand bg-cream/65 p-4">
      <h3 className="text-sm font-black text-charcoal">{title}</h3>
      <p className="mt-2 text-xs leading-6 text-warm-gray">{text}</p>
    </div>
  )
}
