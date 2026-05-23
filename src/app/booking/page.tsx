'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import PremiumButton from '@/components/ui/PremiumButton'
import PremiumFormField from '@/components/ui/PremiumFormField'
import { BOOKING_DURATION_OPTIONS, BOOKING_RULES, SESSION_PRICES, getBookableTimeSlots } from '@/constants/booking'
import { PAYMENT_METHODS } from '@/constants/payments'
import { useAuth } from '@/hooks/useAuth'
import { formatEGP, formatTime12h } from '@/lib/utils/formatters'
import type { BookingDuration, PaymentMethod } from '@/types'

type BookingStep = 1 | 2 | 3 | 4 | 5

interface CouponState {
  code: string
  appliedCode: string
  discountAmount: number
  loading: boolean
  message: string
  valid: boolean
  open: boolean
}

function getDateAfterDays(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function getDateLabel(value: string) {
  const date = new Date(`${value}T12:00:00`)
  return new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date)
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

function getSessionTitle(duration: BookingDuration) {
  return duration === 90 ? 'جلسة كوتشنج عميقة' : 'جلسة كوتشنج 60 دقيقة'
}

function getSessionDescription(duration: BookingDuration) {
  return duration === 90
    ? 'مناسبة للأسئلة الأعمق، تفكيك نمط متكرر، وبناء خطة أكثر تفصيلًا.'
    : 'مناسبة لسؤال محدد، ترتيب مشهد عاطفي، والخروج بخطوة عملية واضحة.'
}

export default function BookingPage() {
  const router = useRouter()
  const { user, firebaseUser, loading } = useAuth()

  const dateOptions = useMemo(() => buildDateOptions(), [])
  const firstAvailableDate = useMemo(
    () => dateOptions.find((item) => !item.disabled)?.value || getDateAfterDays(1),
    [dateOptions],
  )

  const [step, setStep] = useState<BookingStep>(1)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [date, setDate] = useState(firstAvailableDate)
  const [time, setTime] = useState<string>('')
  const [duration, setDuration] = useState<BookingDuration>(60)
  const [notes, setNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('instapay')
  const [paymentReference, setPaymentReference] = useState('')
  const [paymentNote, setPaymentNote] = useState('')
  const [unavailableSlots, setUnavailableSlots] = useState<string[]>([])
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [coupon, setCoupon] = useState<CouponState>({
    code: '',
    appliedCode: '',
    discountAmount: 0,
    loading: false,
    message: '',
    valid: false,
    open: false,
  })

  const bookableSlots = useMemo(() => getBookableTimeSlots(duration), [duration])
  const originalPrice = SESSION_PRICES[duration]
  const finalAmount = Math.max(0, originalPrice - coupon.discountAmount)
  const selectedPayment = PAYMENT_METHODS.find((method) => method.id === paymentMethod) || PAYMENT_METHODS[0]

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
      } catch (availabilityError) {
        console.error('Availability error:', availabilityError)
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

  useEffect(() => {
    if (!bookableSlots.includes(time)) {
      setTime('')
    }
  }, [bookableSlots, time])

  function goNext() {
    setError('')

    if (step === 1) {
      setStep(2)
      return
    }

    if (step === 2) {
      if (!date || isFriday(date)) {
        setError('اختاري يومًا متاحًا للحجز.')
        return
      }
      setStep(3)
      return
    }

    if (step === 3) {
      if (!time) {
        setError('اختاري وقت الجلسة.')
        return
      }
      if (unavailableSlots.includes(time)) {
        setError('هذا الموعد محجوز بالفعل. اختاري وقتًا آخر.')
        return
      }
      setStep(4)
      return
    }

    if (step === 4) {
      if (!name.trim() || !email.trim() || !phone.trim()) {
        setError('أكملي بيانات التواصل لتأكيد الطلب.')
        return
      }
      setStep(5)
    }
  }

  async function applyCoupon() {
    const code = coupon.code.trim().toUpperCase()
    if (!code) {
      setCoupon((current) => ({ ...current, message: 'اكتبي كود الخصم أولًا.', valid: false }))
      return
    }

    setCoupon((current) => ({ ...current, loading: true, message: '' }))

    try {
      const response = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, amount: originalPrice, scope: 'sessions' }),
      })
      const data = (await response.json()) as {
        valid?: boolean
        discountAmount?: number
        reason?: string
      }

      if (!response.ok || !data.valid || !data.discountAmount) {
        setCoupon((current) => ({
          ...current,
          loading: false,
          valid: false,
          appliedCode: '',
          discountAmount: 0,
          message: 'الكود غير صالح أو لا ينطبق على هذه الجلسة.',
        }))
        return
      }

      setCoupon((current) => ({
        ...current,
        loading: false,
        valid: true,
        appliedCode: code,
        discountAmount: Number(data.discountAmount || 0),
        message: `تم تطبيق خصم ${formatEGP(Number(data.discountAmount || 0))}.`,
      }))
    } catch (couponError) {
      console.error('Coupon error:', couponError)
      setCoupon((current) => ({
        ...current,
        loading: false,
        valid: false,
        message: 'تعذر التحقق من الكود الآن. حاولي مرة أخرى.',
      }))
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
      setStep(4)
      return
    }

    if (!date || !time || isFriday(date)) {
      setError('اختاري موعدًا صحيحًا للجلسة.')
      setStep(2)
      return
    }

    if (unavailableSlots.includes(time)) {
      setError('هذا الموعد تم حجزه بالفعل. اختاري وقتًا آخر.')
      setStep(3)
      return
    }

    if (!paymentReference.trim()) {
      setError('اكتبي رقم العملية أو مرجع الدفع حتى تتم مراجعة الحجز.')
      setStep(5)
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
          paymentMethod,
          paymentReference: paymentReference.trim(),
          paymentNote: paymentNote.trim(),
          couponCode: coupon.valid ? coupon.appliedCode : '',
          discountAmount: coupon.valid ? coupon.discountAmount : 0,
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
          <div className="ambient-orb ambient-orb-olive bottom-12 right-16 h-64 w-64" />

          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <aside className="luxury-shell rounded-[2.5rem] p-8 lg:sticky lg:top-28">
              <p className="mini-label">جلسة خاصة</p>
              <h1 className="mt-4 text-4xl font-black leading-tight text-charcoal md:text-5xl">
                حجز بسيط وواضح بدون تعقيد
              </h1>
              <p className="mt-5 text-sm leading-8 text-warm-gray">
                اختاري نوع الجلسة، اليوم، الوقت، ثم أرسلي بيانات الدفع. النظام يمنع الأيام السابقة، الجمعة، وتكرار نفس الموعد.
              </p>

              <div className="mt-8 grid gap-3">
                <StepBadge number={1} active={step === 1} done={step > 1} title="نوع الجلسة" />
                <StepBadge number={2} active={step === 2} done={step > 2} title="اختيار اليوم" />
                <StepBadge number={3} active={step === 3} done={step > 3} title="اختيار الوقت" />
                <StepBadge number={4} active={step === 4} done={step > 4} title="بيانات التواصل" />
                <StepBadge number={5} active={step === 5} done={false} title="الدفع والمراجعة" />
              </div>

              <div className="mt-8 rounded-[1.5rem] border border-sand bg-cream/55 p-5">
                <p className="text-xs font-black text-gold">ملخص الحجز</p>
                <h2 className="mt-2 text-xl font-black text-charcoal">{getSessionTitle(duration)}</h2>
                <p className="mt-2 text-sm leading-7 text-warm-gray">
                  {date ? getDateLabel(date) : 'اختاري اليوم'} · {time ? formatTime12h(time) : 'اختاري الوقت'}
                </p>
                <div className="mt-4 rounded-2xl border border-sand bg-ivory/70 p-4 text-sm font-black text-charcoal">
                  <div className="flex justify-between gap-4">
                    <span>السعر</span>
                    <span className="latin-numerals">{formatEGP(originalPrice)}</span>
                  </div>
                  {coupon.discountAmount > 0 ? (
                    <div className="mt-2 flex justify-between gap-4 text-olive">
                      <span>الخصم</span>
                      <span className="latin-numerals">- {formatEGP(coupon.discountAmount)}</span>
                    </div>
                  ) : null}
                  <div className="mt-3 flex justify-between gap-4 border-t border-sand pt-3 text-petrol">
                    <span>الإجمالي</span>
                    <span className="latin-numerals">{formatEGP(finalAmount)}</span>
                  </div>
                </div>
              </div>
            </aside>

            <form onSubmit={handleSubmit} className="premium-glow-border rounded-[2.5rem] border border-sand bg-ivory/90 p-6 shadow-premium backdrop-blur-sm md:p-8">
              {step === 1 ? (
                <div>
                  <p className="mini-label">الخطوة الأولى</p>
                  <h2 className="mt-3 text-3xl font-black text-charcoal">اختاري نوع الجلسة</h2>
                  <p className="mt-3 text-sm leading-7 text-warm-gray">اختاري المدة الأنسب للسؤال أو المرحلة الحالية.</p>

                  <div className="mt-7 grid gap-4 md:grid-cols-2">
                    {BOOKING_DURATION_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setDuration(option.value)}
                        className={`rounded-[2rem] border p-5 text-right transition ${
                          duration === option.value
                            ? 'border-petrol bg-petrol text-ivory shadow-soft'
                            : 'border-sand bg-cream/60 text-charcoal hover:border-gold hover:bg-ivory'
                        }`}
                      >
                        <p className="text-xl font-black">{getSessionTitle(option.value)}</p>
                        <p className="mt-3 text-sm leading-7 opacity-80">{getSessionDescription(option.value)}</p>
                        <p className="mt-5 text-lg font-black latin-numerals">{formatEGP(SESSION_PRICES[option.value])}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {step === 2 ? (
                <div>
                  <p className="mini-label">الخطوة الثانية</p>
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
                        <p className="mt-1 text-xs opacity-75">{item.disabled ? 'الجمعة غير متاحة' : item.value}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {step === 3 ? (
                <div>
                  <p className="mini-label">الخطوة الثالثة</p>
                  <h2 className="mt-3 text-3xl font-black text-charcoal">اختاري الوقت</h2>
                  <p className="mt-3 text-sm leading-7 text-warm-gray">فترة العمل من 7:00 AM إلى 9:00 PM. الأوقات المحجوزة تظهر غير متاحة.</p>

                  <div className="mt-7 grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
                    {bookableSlots.map((slot) => {
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
                          <span className="latin-numerals">{formatTime12h(slot)}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}

              {step === 4 ? (
                <div>
                  <p className="mini-label">الخطوة الرابعة</p>
                  <h2 className="mt-3 text-3xl font-black text-charcoal">بيانات التواصل</h2>
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

              {step === 5 ? (
                <div>
                  <p className="mini-label">الخطوة الخامسة</p>
                  <h2 className="mt-3 text-3xl font-black text-charcoal">الدفع والمراجعة</h2>
                  <p className="mt-3 text-sm leading-7 text-warm-gray">اختاري طريقة الدفع، ثم اكتبي رقم العملية ليتم تأكيد الحجز من الإدارة.</p>

                  <div className="mt-7 grid gap-3 md:grid-cols-3">
                    {PAYMENT_METHODS.map((method) => (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setPaymentMethod(method.id)}
                        className={`rounded-[1.5rem] border p-4 text-right transition ${
                          paymentMethod === method.id
                            ? 'border-petrol bg-petrol text-ivory shadow-soft'
                            : 'border-sand bg-cream/60 text-charcoal hover:border-gold hover:bg-ivory'
                        }`}
                      >
                        <p className="font-black">{method.title}</p>
                        <p className="mt-2 text-xs leading-6 opacity-75">{method.accountLabel}</p>
                      </button>
                    ))}
                  </div>

                  <div className="mt-5 rounded-[1.5rem] border border-sand bg-cream/70 p-5">
                    <p className="text-sm font-black text-charcoal">{selectedPayment.title}</p>
                    <p className="mt-2 text-xs leading-6 text-warm-gray">{selectedPayment.description}</p>
                    <p className="mt-3 rounded-2xl border border-sand bg-ivory/80 px-4 py-3 text-sm font-black text-petrol latin-numerals">
                      {selectedPayment.accountValue}
                    </p>
                  </div>

                  <div className="mt-5">
                    {!coupon.open ? (
                      <button
                        type="button"
                        onClick={() => setCoupon((current) => ({ ...current, open: true }))}
                        className="text-sm font-black text-petrol transition hover:text-gold"
                      >
                        لديك كود خصم؟
                      </button>
                    ) : (
                      <div className="rounded-[1.5rem] border border-sand bg-cream/65 p-4">
                        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                          <input
                            className="premium-input"
                            value={coupon.code}
                            onChange={(event) => setCoupon((current) => ({ ...current, code: event.target.value, message: '' }))}
                            placeholder="اكتبي كود الخصم"
                          />
                          <PremiumButton type="button" variant="outline" onClick={applyCoupon} disabled={coupon.loading}>
                            {coupon.loading ? 'جاري التحقق...' : 'تطبيق'}
                          </PremiumButton>
                        </div>
                        {coupon.message ? (
                          <p className={`mt-3 text-xs font-bold ${coupon.valid ? 'text-olive' : 'text-burgundy'}`}>{coupon.message}</p>
                        ) : null}
                      </div>
                    )}
                  </div>

                  <div className="mt-5 grid gap-5 md:grid-cols-2">
                    <PremiumFormField label="رقم العملية أو مرجع الدفع" required hint="لا يظهر هذا الحقل إلا للإدارة لمراجعة الدفع.">
                      <input className="premium-input" value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} placeholder="مثال: 123456789" />
                    </PremiumFormField>
                    <PremiumFormField label="ملاحظة الدفع">
                      <input className="premium-input" value={paymentNote} onChange={(event) => setPaymentNote(event.target.value)} placeholder="اسم المحول أو وقت التحويل" />
                    </PremiumFormField>
                  </div>
                </div>
              ) : null}

              {error ? <div className="mt-6 rounded-2xl border border-burgundy/20 bg-burgundy/10 px-4 py-3 text-sm leading-7 text-burgundy">{error}</div> : null}

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
                {step > 1 ? <PremiumButton type="button" variant="outline" onClick={() => setStep((current) => (current - 1) as BookingStep)}>السابق</PremiumButton> : <span />}
                {step < 5 ? (
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
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ivory/20 text-sm font-black latin-numerals">{done ? '✓' : number}</span>
      <span className="text-sm font-black">{title}</span>
    </div>
  )
}
