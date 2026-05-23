'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import PremiumButton from '@/components/ui/PremiumButton'
import PremiumFormField from '@/components/ui/PremiumFormField'
import { BOOKING_DURATION_OPTIONS, BOOKING_RULES, TIME_SLOTS } from '@/constants/booking'
import { useAuth } from '@/hooks/useAuth'

type BookingStep = 1 | 2 | 3

function getDateAfterDays(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function getDateLabel(value: string) {
  const date = new Date(`${value}T12:00:00`)
  return new Intl.DateTimeFormat('ar-EG-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long' }).format(date)
}

function isFriday(dateValue: string) {
  const date = new Date(`${dateValue}T12:00:00`)
  return date.getDay() === 5
}

function buildDateOptions() {
  return Array.from({ length: BOOKING_RULES.maxDaysAhead }, (_, index) => {
    const value = getDateAfterDays(index + BOOKING_RULES.minDaysAhead)
    return {
      value,
      label: getDateLabel(value),
      disabled: isFriday(value),
    }
  })
}

export default function BookingPage() {
  const router = useRouter()
  const { user, firebaseUser, loading } = useAuth()

  const dateOptions = useMemo(() => buildDateOptions(), [])
  const firstAvailableDate = useMemo(() => dateOptions.find((item) => !item.disabled)?.value || getDateAfterDays(1), [dateOptions])

  const [step, setStep] = useState<BookingStep>(1)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [date, setDate] = useState(firstAvailableDate)
  const [time, setTime] = useState<string>('')
  const [duration, setDuration] = useState<60 | 90>(60)
  const [notes, setNotes] = useState('')
  const [unavailableSlots, setUnavailableSlots] = useState<string[]>([])
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    setName((current) => current || user.name || '')
    setEmail((current) => current || user.email || '')
    setPhone((current) => current || user.phone || '')
  }, [user])

  useEffect(() => {
    let cancelled = false

    async function loadAvailability() {
      setAvailabilityLoading(true)
      setTime('')
      try {
        const response = await fetch(`/api/bookings?date=${encodeURIComponent(date)}`)
        const data = (await response.json()) as { unavailableSlots?: string[] }
        if (!cancelled) setUnavailableSlots(data.unavailableSlots || [])
      } catch (error) {
        console.error('Availability error:', error)
        if (!cancelled) setUnavailableSlots([])
      } finally {
        if (!cancelled) setAvailabilityLoading(false)
      }
    }

    loadAvailability()

    return () => {
      cancelled = true
    }
  }, [date])

  function goNext() {
    setError('')

    if (step === 1) {
      if (!date || isFriday(date)) {
        setError('اختاري يومًا متاحًا للحجز.')
        return
      }
      setStep(2)
      return
    }

    if (step === 2) {
      if (!time) {
        setError('اختاري وقت الجلسة.')
        return
      }
      setStep(3)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (loading) return

    if (!user || !firebaseUser) {
      router.push(`/auth/login?next=${encodeURIComponent('/booking')}`)
      return
    }

    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError('أكملي بيانات التواصل لتأكيد الطلب.')
      return
    }

    if (!date || !time || isFriday(date)) {
      setError('اختاري موعدًا صحيحًا للجلسة.')
      return
    }

    if (unavailableSlots.includes(time)) {
      setError('هذا الموعد تم حجزه بالفعل. اختاري وقتًا آخر.')
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

      const data = (await response.json()) as { success?: boolean; bookingId?: string; error?: string }

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
        <section className="container-premium relative overflow-hidden py-14">
          <div className="ambient-orb ambient-orb-gold left-10 top-14 h-56 w-56" />
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <aside className="luxury-shell rounded-[2.5rem] p-8 lg:sticky lg:top-28">
              <p className="mini-label">جلسة خاصة</p>
              <h1 className="mt-4 text-4xl font-black leading-tight text-charcoal md:text-5xl">
                حجز بسيط وواضح بدون تعقيد
              </h1>
              <p className="mt-5 text-sm leading-8 text-warm-gray">
                اختاري اليوم، ثم الوقت المتاح، ثم اتركي بيانات التواصل. النظام يمنع اختيار الأيام السابقة ويمنع تكرار الموعد المحجوز.
              </p>

              <div className="mt-8 grid gap-3">
                <StepBadge number={1} active={step === 1} done={step > 1} title="اختيار اليوم" />
                <StepBadge number={2} active={step === 2} done={step > 2} title="اختيار الوقت" />
                <StepBadge number={3} active={step === 3} done={false} title="بيانات التأكيد" />
              </div>

              <div className="mt-8 rounded-[1.5rem] border border-sand bg-cream/55 p-5">
                <p className="text-xs font-black text-gold">ملخص الحجز</p>
                <h2 className="mt-2 text-xl font-black text-charcoal">جلسة فردية {duration} دقيقة</h2>
                <p className="mt-2 text-sm leading-7 text-warm-gray">{date ? getDateLabel(date) : 'اختاري اليوم'} · {time || 'اختاري الوقت'}</p>
                <p className="mt-4 text-xs leading-6 text-warm-gray">بعد الإرسال، تظهر الجلسة داخل لوحة حسابك بحالة بانتظار التأكيد.</p>
              </div>
            </aside>

            <form onSubmit={handleSubmit} className="premium-glow-border rounded-[2.5rem] border border-sand bg-ivory/90 p-6 shadow-premium backdrop-blur-sm md:p-8">
              {step === 1 ? (
                <div>
                  <p className="mini-label">الخطوة الأولى</p>
                  <h2 className="mt-3 text-3xl font-black text-charcoal">اختاري يوم الجلسة</h2>
                  <p className="mt-3 text-sm leading-7 text-warm-gray">الحجز متاح من الغد وحتى 30 يومًا. يوم الجمعة غير متاح.</p>

                  <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {dateOptions.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        disabled={item.disabled}
                        onClick={() => setDate(item.value)}
                        className={`rounded-2xl border p-4 text-right transition ${
                          date === item.value
                            ? 'border-petrol bg-petrol text-ivory shadow-soft'
                            : item.disabled
                              ? 'cursor-not-allowed border-sand bg-sand/40 text-warm-gray opacity-50'
                              : 'border-sand bg-cream/60 text-charcoal hover:border-gold hover:bg-ivory'
                        }`}
                      >
                        <p className="text-sm font-black">{item.label}</p>
                        <p className="mt-1 text-xs opacity-75">{item.disabled ? 'غير متاح' : item.value}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {step === 2 ? (
                <div>
                  <p className="mini-label">الخطوة الثانية</p>
                  <h2 className="mt-3 text-3xl font-black text-charcoal">اختاري الوقت والمدة</h2>
                  <p className="mt-3 text-sm leading-7 text-warm-gray">الأوقات المحجوزة تظهر غير متاحة. النظام يعيد التحقق عند الإرسال.</p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {BOOKING_DURATION_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setDuration(option.value)}
                        className={`rounded-2xl border p-4 text-right text-sm font-black transition ${duration === option.value ? 'border-petrol bg-petrol text-ivory' : 'border-sand bg-cream/60 text-charcoal hover:border-gold'}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-7 grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
                    {TIME_SLOTS.map((slot) => {
                      const unavailable = unavailableSlots.includes(slot)
                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={unavailable || availabilityLoading}
                          onClick={() => setTime(slot)}
                          className={`rounded-2xl border px-4 py-4 text-center font-black transition ${
                            time === slot
                              ? 'border-petrol bg-petrol text-ivory shadow-soft'
                              : unavailable
                                ? 'cursor-not-allowed border-sand bg-sand/40 text-warm-gray opacity-55 line-through'
                                : 'border-sand bg-cream/60 text-charcoal hover:border-gold hover:bg-ivory'
                          }`}
                        >
                          {slot}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}

              {step === 3 ? (
                <div>
                  <p className="mini-label">الخطوة الثالثة</p>
                  <h2 className="mt-3 text-3xl font-black text-charcoal">بيانات التأكيد</h2>
                  <p className="mt-3 text-sm leading-7 text-warm-gray">اكتبي بيانات التواصل حتى يتم تأكيد الموعد من الإدارة.</p>

                  <div className="mt-7 grid gap-5 md:grid-cols-2">
                    <PremiumFormField label="الاسم" required>
                      <input className="premium-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="اكتبي اسمك" />
                    </PremiumFormField>
                    <PremiumFormField label="رقم الهاتف" required>
                      <input className="premium-input" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="01xxxxxxxxx" />
                    </PremiumFormField>
                    <PremiumFormField label="البريد الإلكتروني" required>
                      <input className="premium-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" />
                    </PremiumFormField>
                    <PremiumFormField label="ملاحظات مختصرة">
                      <input className="premium-input" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="ما السؤال الأقرب للجلسة؟" />
                    </PremiumFormField>
                  </div>
                </div>
              ) : null}

              {error ? <div className="mt-6 rounded-2xl border border-petrol/20 bg-petrol/10 px-4 py-3 text-sm leading-7 text-petrol">{error}</div> : null}

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
                {step > 1 ? <PremiumButton type="button" variant="outline" onClick={() => setStep((current) => (current - 1) as BookingStep)}>السابق</PremiumButton> : <span />}
                {step < 3 ? (
                  <PremiumButton type="button" onClick={goNext}>التالي</PremiumButton>
                ) : (
                  <PremiumButton type="submit" disabled={loading || submitting}>{submitting ? 'جاري إرسال الطلب...' : 'إرسال طلب الحجز'}</PremiumButton>
                )}
              </div>
            </form>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}

function StepBadge({ number, title, active, done }: { number: number; title: string; active: boolean; done: boolean }) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl border p-4 ${active ? 'border-petrol bg-petrol text-ivory' : done ? 'border-olive/30 bg-olive/10 text-olive' : 'border-sand bg-cream/55 text-warm-gray'}`}>
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ivory/20 text-sm font-black">{done ? '✓' : number}</span>
      <span className="text-sm font-black">{title}</span>
    </div>
  )
}
