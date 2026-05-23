'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import PremiumButton from '@/components/ui/PremiumButton'
import PremiumFormField from '@/components/ui/PremiumFormField'
import { BOOKING_DURATION_OPTIONS, BOOKING_RULES, TIME_SLOTS } from '@/constants/booking'
import { useAuth } from '@/hooks/useAuth'

function getDateAfterDays(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function isFriday(dateValue: string) {
  const date = new Date(`${dateValue}T12:00:00`)
  return date.getDay() === 5
}

export default function BookingPage() {
  const router = useRouter()
  const { user, firebaseUser, loading } = useAuth()

  const minDate = useMemo(() => getDateAfterDays(BOOKING_RULES.minDaysAhead), [])
  const maxDate = useMemo(() => getDateAfterDays(BOOKING_RULES.maxDaysAhead), [])

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [date, setDate] = useState(minDate)
  const [time, setTime] = useState<string>(TIME_SLOTS[0])
  const [duration, setDuration] = useState<60 | 90>(60)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return

    setName((current) => current || user.name || '')
    setEmail((current) => current || user.email || '')
    setPhone((current) => current || user.phone || '')
  }, [user])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (loading) return

    if (!user || !firebaseUser) {
      router.push(`/auth/login?next=${encodeURIComponent('/booking')}`)
      return
    }

    if (!name.trim()) {
      setError('اكتبي الاسم بشكل صحيح.')
      return
    }

    if (!email.trim()) {
      setError('اكتبي البريد الإلكتروني.')
      return
    }

    if (!phone.trim()) {
      setError('اكتبي رقم الهاتف لتأكيد الحجز.')
      return
    }

    if (!date) {
      setError('اختاري تاريخ الجلسة.')
      return
    }

    if (isFriday(date)) {
      setError('لا تتوفر حجوزات يوم الجمعة. اختاري يومًا آخر.')
      return
    }

    setSubmitting(true)

    try {
      const token = await firebaseUser.getIdToken()

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          date,
          time,
          duration,
          notes: notes.trim(),
        }),
      })

      const data = (await response.json()) as {
        success?: boolean
        bookingId?: string
        error?: string
      }

      if (!response.ok || !data.success) {
        setError(data.error || 'تعذر إرسال طلب الحجز الآن.')
        return
      }

      router.push(`/booking/confirmation?bookingId=${encodeURIComponent(data.bookingId || '')}`)
    } catch (submitError) {
      console.error('Booking submit error:', submitError)
      setError('حدث خطأ أثناء إرسال طلب الحجز. حاولي مرة أخرى.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen pt-20">
        <section className="border-b border-sand bg-ivory/60">
          <div className="container-premium py-16">
            <p className="mb-3 text-sm font-bold tracking-[0.25em] text-gold">
              حجز جلسة فردية
            </p>

            <h1 className="max-w-3xl text-4xl font-black leading-tight text-petrol md:text-6xl">
              اختاري موعدًا هادئًا لجلسة خاصة
            </h1>

            <p className="mt-6 max-w-2xl text-sm leading-8 text-warm-gray">
              املئي البيانات التالية، وبعد إرسال الطلب ستقوم الإدارة بمراجعة الموعد وتأكيده من
              لوحة الإدارة.
            </p>
          </div>
        </section>

        <section className="container-premium grid gap-8 py-12 lg:grid-cols-[1fr_380px]">
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-sand bg-ivory p-6 shadow-soft sm:p-8"
          >
            <div className="mb-8">
              <h2 className="text-2xl font-black text-charcoal">بيانات الحجز</h2>

              <p className="mt-3 text-sm leading-7 text-warm-gray">
                كل البيانات مطلوبة لتأكيد الجلسة والتواصل معك بوضوح.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <PremiumFormField label="الاسم" required>
                <input
                  className="premium-input"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="اكتبي اسمك"
                  required
                />
              </PremiumFormField>

              <PremiumFormField label="رقم الهاتف" required>
                <input
                  className="premium-input"
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="01xxxxxxxxx"
                  required
                />
              </PremiumFormField>

              <PremiumFormField label="البريد الإلكتروني" required>
                <input
                  className="premium-input"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@example.com"
                  required
                />
              </PremiumFormField>

              <PremiumFormField label="مدة الجلسة" required>
                <select
                  className="premium-input"
                  value={duration}
                  onChange={(event) => setDuration(Number(event.target.value) as 60 | 90)}
                  required
                >
                  {BOOKING_DURATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </PremiumFormField>

              <PremiumFormField
                label="تاريخ الجلسة"
                required
                hint="الحجز متاح من الغد وحتى 30 يومًا مقدمًا. الجمعة غير متاحة."
              >
                <input
                  className="premium-input"
                  type="date"
                  value={date}
                  min={minDate}
                  max={maxDate}
                  onChange={(event) => setDate(event.target.value)}
                  required
                />
              </PremiumFormField>

              <PremiumFormField label="وقت الجلسة" required>
                <select
                  className="premium-input"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  required
                >
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </PremiumFormField>
            </div>

            <div className="mt-5">
              <PremiumFormField label="ملاحظات قبل الجلسة">
                <textarea
                  className="premium-input min-h-32 resize-y"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="اكتبي أي شيء تحبين توضيحه قبل الجلسة..."
                />
              </PremiumFormField>
            </div>

            {error ? (
              <div className="mt-6 rounded-2xl border border-burgundy/20 bg-burgundy/10 px-4 py-3 text-sm leading-7 text-burgundy">
                {error}
              </div>
            ) : null}

            <PremiumButton
              type="submit"
              size="lg"
              className="mt-7 w-full"
              disabled={loading || submitting}
            >
              {submitting ? 'جاري إرسال الطلب...' : 'إرسال طلب الحجز'}
            </PremiumButton>
          </form>

          <aside className="h-fit rounded-3xl border border-sand bg-ivory p-6 shadow-premium lg:sticky lg:top-28">
            <p className="text-sm font-bold text-gold">قواعد الحجز</p>

            <h2 className="mt-3 text-2xl font-black text-petrol">جلسة خاصة بوضوح وهدوء</h2>

            <div className="mt-6 space-y-3">
              <InfoItem title="المنطقة الزمنية" value="توقيت القاهرة" />
              <InfoItem title="الأيام غير المتاحة" value="الجمعة" />
              <InfoItem title="مدة الجلسة" value="60 أو 90 دقيقة" />
              <InfoItem title="هامش بين الجلسات" value="30 دقيقة" />
              <InfoItem title="حالة الطلب" value="بانتظار تأكيد الإدارة" />
            </div>

            <p className="mt-6 text-xs leading-6 text-warm-gray">
              بعد التأكيد، ستظهر الجلسة داخل لوحة حسابك في صفحة “جلساتي”.
            </p>
          </aside>
        </section>
      </main>

      <Footer />
    </>
  )
}

function InfoItem({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-sand bg-cream px-4 py-3">
      <p className="text-xs font-bold text-warm-gray">{title}</p>
      <p className="mt-1 text-sm font-black text-charcoal">{value}</p>
    </div>
  )
}