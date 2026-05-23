'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import PremiumButton from '@/components/ui/PremiumButton'

function BookingConfirmationContent() {
  const searchParams = useSearchParams()
  const bookingId = searchParams.get('bookingId')

  return (
    <div className="w-full max-w-xl rounded-[2rem] border border-sand bg-ivory p-8 text-center shadow-premium">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-olive/10 text-3xl text-olive">
        ✓
      </div>

      <p className="mb-3 text-sm font-bold tracking-[0.25em] text-gold">
        تم إرسال الطلب
      </p>

      <h1 className="text-3xl font-black leading-tight text-petrol">
        تم إرسال طلب الحجز بنجاح
      </h1>

      <p className="mt-5 text-sm leading-8 text-warm-gray">
        تم استلام طلب الحجز وبيانات الدفع. ستراجع الإدارة المرجع، وبعد التأكيد ستظهر الجلسة داخل لوحة حسابك
        في صفحة “جلساتي”.
      </p>

      {bookingId ? (
        <p className="mt-4 rounded-2xl border border-sand bg-cream px-4 py-3 text-xs font-bold text-warm-gray">
          رقم مرجعي للحجز: <span dir="ltr">{bookingId}</span>
        </p>
      ) : null}

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <PremiumButton href="/dashboard/sessions" className="w-full">
          عرض جلساتي
        </PremiumButton>

        <PremiumButton href="/" variant="outline" className="w-full">
          العودة للرئيسية
        </PremiumButton>
      </div>

      <p className="mt-6 text-xs leading-6 text-warm-gray">
        يمكنك أيضًا متابعة حالة الحجز من{' '}
        <Link href="/dashboard/sessions" className="font-bold text-petrol hover:text-gold">
          لوحة المستخدم
        </Link>
        .
      </p>
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