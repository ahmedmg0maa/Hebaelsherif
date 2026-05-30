'use client'

export const dynamic = 'force-dynamic'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import ImageSlot from '@/components/ui/ImageSlot'
import { IMAGE_SLOTS } from '@/constants/content'
import PremiumButton from '@/components/ui/PremiumButton'
import PremiumFormField from '@/components/ui/PremiumFormField'
import BrandDivider from '@/components/brand/BrandDivider'
import BrandOrnament from '@/components/brand/BrandOrnament'
import {
  BOOKING_DURATION_OPTIONS,
  BOOKING_RULES,
  SESSION_PRICES,
  getBookableTimeSlots,
} from '@/constants/booking'
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

interface DateOption {
  value: string
  label: string
  dayName: string
  dayNumber: string
  monthName: string
  disabled: boolean
}

const stepItems: { value: BookingStep; title: string; hint: string }[] = [
  { value: 1, title: 'نوع الجلسة', hint: 'اختاري المساحة المناسبة' },
  { value: 2, title: 'التاريخ', hint: 'اليوم الأنسب لكِ' },
  { value: 3, title: 'الوقت', hint: 'وقت واضح ومتاح' },
  { value: 4, title: 'البيانات', hint: 'للتواصل والتأكيد' },
  { value: 5, title: 'الدفع', hint: 'إرسال المرجع للمراجعة' },
]

const weekDays = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة']

function getDateAfterDays(days: number) {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
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

function getDayName(value: string) {
  const date = new Date(`${value}T12:00:00`)
  return new Intl.DateTimeFormat('ar-EG', { weekday: 'short' }).format(date)
}

function getDayNumber(value: string) {
  const date = new Date(`${value}T12:00:00`)
  return new Intl.DateTimeFormat('en-US', { day: 'numeric' }).format(date)
}

function getMonthName(value: string) {
  const date = new Date(`${value}T12:00:00`)
  return new Intl.DateTimeFormat('ar-EG', { month: 'long' }).format(date)
}

function isFriday(dateValue: string) {
  const date = new Date(`${dateValue}T12:00:00`)
  return date.getDay() === 5
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function getSaturdayFirstIndex(date: Date) {
  return (date.getDay() + 1) % 7
}

function buildDateOptions(): DateOption[] {
  return Array.from({ length: BOOKING_RULES.maxDaysAhead }, (_, index) => {
    const value = getDateAfterDays(index + BOOKING_RULES.minDaysAhead)
    return {
      value,
      label: getDateLabel(value),
      dayName: getDayName(value),
      dayNumber: getDayNumber(value),
      monthName: getMonthName(value),
      disabled: isFriday(value),
    }
  })
}

function buildCalendarCells(dateOptions: DateOption[]) {
  if (dateOptions.length === 0) return []

  const optionMap = new Map(dateOptions.map((item) => [item.value, item]))
  const first = new Date(`${dateOptions[0].value}T12:00:00`)
  const last = new Date(`${dateOptions[dateOptions.length - 1].value}T12:00:00`)
  const start = addDays(first, -getSaturdayFirstIndex(first))
  const endPadding = 6 - getSaturdayFirstIndex(last)
  const end = addDays(last, endPadding)

  const cells: { value: string; option?: DateOption; outside: boolean }[] = []
  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
    const value = toIsoDate(cursor)
    cells.push({
      value,
      option: optionMap.get(value),
      outside: !optionMap.has(value),
    })
  }

  return cells
}

function getSessionTitle(duration: BookingDuration) {
  return duration === 90 ? 'جلسة عميقة 90 دقيقة' : 'جلسة فردية 60 دقيقة'
}

function getSessionDescription(duration: BookingDuration) {
  return duration === 90
    ? 'جلسة ممتدة لمساحة أعمق: فهم نمط متكرر، تفكيك سؤال مركّب، ووضع خطة واضحة.'
    : 'جلسة مركزة لسؤال محدد: ترتيب المشاعر، وضوح القرار، وخطوة عملية بعد الجلسة.'
}

function getSessionTag(duration: BookingDuration) {
  return duration === 90 ? 'للتحولات الأعمق' : 'الأكثر اختيارًا'
}

function getSlotPeriod(slot: string) {
  const hour = Number(slot.split(':')[0])
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}

function getPeriodLabel(period: string) {
  const labels: Record<string, string> = {
    morning: 'الصباح',
    afternoon: 'بعد الظهر',
    evening: 'المساء',
  }
  return labels[period] || period
}

export default function BookingPage() {
  const router = useRouter()
  const { user, firebaseUser, loading } = useAuth()

  const dateOptions = useMemo(() => buildDateOptions(), [])
  const calendarCells = useMemo(() => buildCalendarCells(dateOptions), [dateOptions])
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
  const slotsByPeriod = useMemo(() => {
    return bookableSlots.reduce<Record<string, string[]>>(
      (groups, slot) => {
        const period = getSlotPeriod(slot)
        groups[period].push(slot)
        return groups
      },
      { morning: [], afternoon: [], evening: [] },
    )
  }, [bookableSlots])

  const selectedDateOption = dateOptions.find((item) => item.value === date)
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
        const response = await fetch(
          `/api/bookings?date=${encodeURIComponent(date)}&duration=${encodeURIComponent(String(duration))}`,
        )
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
  }, [date, duration])

  useEffect(() => {
    if (!bookableSlots.includes(time)) {
      setTime('')
    }
  }, [bookableSlots, time])

  function goToStep(nextStep: BookingStep) {
    setError('')
    setStep(nextStep)
  }

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

  function goBack() {
    setError('')
    setStep((current) => Math.max(1, current - 1) as BookingStep)
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

    if (step !== 5) {
      goNext()
      return
    }

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
      setError('لم نتمكن من إرسال طلب الحجز الآن. حاولي مرة أخرى.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen pt-20">
        <section className="container-premium relative overflow-hidden py-12 lg:py-16">
          <div className="ambient-orb ambient-orb-gold left-4 top-24 h-56 w-56" />
          <div className="ambient-orb ambient-orb-olive bottom-20 right-10 h-64 w-64" />

          <div className="mx-auto mb-10 max-w-4xl text-center">
            <div className="mx-auto mb-4 flex justify-center">
              <BrandOrnament />
            </div>
            <p className="mini-label">احجزي جلستك الخاصة</p>
            <h1 className="mt-4 text-balance text-4xl font-black leading-tight text-charcoal md:text-6xl">
              اختاري وقتًا هادئًا يناسب رحلتك
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-8 text-warm-gray md:text-base">
              تجربة حجز واضحة من خمس خطوات: نوع الجلسة، التاريخ، الوقت، البيانات، ثم الدفع والمراجعة. النظام يمنع الأيام السابقة، الجمعة، وتكرار نفس الموعد.
            </p>
          </div>

          <div className="mb-8 rounded-[2.5rem] border border-sand bg-ivory/78 p-4 shadow-soft backdrop-blur-sm lg:p-5">
            <div className="grid gap-3 md:grid-cols-5">
              {stepItems.map((item) => {
                const active = step === item.value
                const done = step > item.value
                const clickable = item.value < step
                return (
                  <button
                    key={item.value}
                    type="button"
                    disabled={!clickable}
                    onClick={() => clickable && goToStep(item.value)}
                    className={`relative rounded-[1.5rem] border p-4 text-right transition ${
                      active
                        ? 'border-petrol bg-petrol text-ivory shadow-soft'
                        : done
                          ? 'border-gold/30 bg-gold/10 text-petrol hover:border-gold'
                          : 'border-sand bg-cream/55 text-warm-gray'
                    }`}
                  >
                    <span className={`mb-3 flex h-9 w-9 items-center justify-center rounded-full text-sm font-black ${active ? 'bg-ivory text-petrol' : done ? 'bg-gold text-deep-teal' : 'bg-ivory text-warm-gray'}`}>
                      {done ? '✓' : item.value}
                    </span>
                    <strong className="block text-sm font-black">{item.title}</strong>
                    <span className="mt-1 block text-xs leading-5 opacity-75">{item.hint}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-8 xl:grid-cols-[310px_1fr_360px] xl:items-start">
            <aside className="luxury-shell rounded-[2.5rem] p-6 xl:sticky xl:top-28">
              <p className="mini-label">ملخص الحجز</p>
              <h2 className="mt-3 text-2xl font-black text-charcoal">{getSessionTitle(duration)}</h2>
              <p className="mt-3 text-sm leading-7 text-warm-gray">{getSessionDescription(duration)}</p>

              <div className="mt-6 space-y-3">
                <SummaryRow label="التاريخ" value={selectedDateOption?.label || 'اختاري اليوم'} />
                <SummaryRow label="الوقت" value={time ? formatTime12h(time) : 'اختاري الوقت'} ltr />
                <SummaryRow label="المدة" value={`${duration} دقيقة`} ltr />
                <SummaryRow label="طريقة الدفع" value={selectedPayment.title} />
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-sand bg-ivory/65 p-4 text-sm font-black text-charcoal">
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

              <div className="mt-5 rounded-[1.5rem] border border-petrol/10 bg-petrol/5 p-4 text-xs leading-6 text-warm-gray">
                <strong className="mb-1 block text-petrol">جلسات خاصة وآمنة</strong>
                يتم تأكيد الموعد بعد مراجعة بيانات الدفع. ستظهر الجلسة داخل لوحة حسابك بعد التأكيد.
              </div>
            </aside>

            <section className="premium-glow-border rounded-[2.75rem] border border-sand bg-ivory/90 p-5 shadow-premium backdrop-blur-sm md:p-8">
              {step === 1 ? (
                <StepPanel eyebrow="الخطوة الأولى" title="اختاري نوع الجلسة" description="ابدئي بالمساحة الأقرب لاحتياجك الحالي. يمكنك تغيير الاختيار قبل التأكيد.">
                  <div className="grid gap-4 md:grid-cols-2">
                    {BOOKING_DURATION_OPTIONS.map((option) => {
                      const active = duration === option.value
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setDuration(option.value)}
                          className={`group relative overflow-hidden rounded-[2rem] border p-6 text-right transition ${
                            active
                              ? 'border-petrol bg-petrol text-ivory shadow-premium'
                              : 'border-sand bg-cream/60 text-charcoal hover:-translate-y-1 hover:border-gold hover:bg-ivory hover:shadow-soft'
                          }`}
                        >
                          <span className={`mb-5 inline-flex rounded-full border px-3 py-1 text-xs font-black ${active ? 'border-ivory/20 bg-ivory/10 text-ivory' : 'border-gold/25 bg-gold/10 text-gold'}`}>
                            {getSessionTag(option.value)}
                          </span>
                          <h3 className="text-2xl font-black">{getSessionTitle(option.value)}</h3>
                          <p className="mt-4 text-sm leading-7 opacity-80">{getSessionDescription(option.value)}</p>
                          <div className="mt-6 flex items-end justify-between gap-4">
                            <span className="text-xs font-bold opacity-70">دعم عميق ومتابعة واضحة</span>
                            <strong className="text-xl font-black latin-numerals">{formatEGP(SESSION_PRICES[option.value])}</strong>
                          </div>
                        </button>
                      )
                    })}

                    <div className="rounded-[2rem] border border-dashed border-gold/45 bg-gold/8 p-6 text-right">
                      <span className="mb-5 inline-flex rounded-full border border-gold/25 bg-gold/10 px-3 py-1 text-xs font-black text-gold">
                        قريبًا
                      </span>
                      <h3 className="text-2xl font-black text-charcoal">باقة 3 جلسات</h3>
                      <p className="mt-4 text-sm leading-7 text-warm-gray">
                        رحلة متابعة أعمق لمن تريد خطة ممتدة، ويتم تفعيلها من إعدادات الجلسات عند اعتمادها.
                      </p>
                    </div>
                  </div>
                </StepPanel>
              ) : null}

              {step === 2 ? (
                <StepPanel eyebrow="الخطوة الثانية" title="اختاري تاريخ الجلسة" description="الأيام المتاحة خلال 30 يومًا تظهر بوضوح. يوم الجمعة والأيام خارج النطاق غير قابلة للاختيار.">
                  <div className="rounded-[2rem] border border-sand bg-cream/45 p-4 md:p-5">
                    <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-black text-charcoal">تقويم الحجز</p>
                        <p className="mt-1 text-xs text-warm-gray">جميع الأوقات حسب توقيت القاهرة</p>
                      </div>
                      <span className="rounded-full border border-petrol/15 bg-petrol/8 px-4 py-2 text-xs font-black text-petrol">
                        {selectedDateOption?.monthName || 'الشهر الحالي'}
                      </span>
                    </div>

                    <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-black text-warm-gray">
                      {weekDays.map((day) => <span key={day}>{day}</span>)}
                    </div>
                    <div className="mt-3 grid grid-cols-7 gap-2">
                      {calendarCells.map((cell) => {
                        const option = cell.option
                        const active = option?.value === date
                        const disabled = !option || option.disabled
                        return (
                          <button
                            key={cell.value}
                            type="button"
                            disabled={disabled}
                            onClick={() => option && setDate(option.value)}
                            className={`min-h-16 rounded-2xl border p-2 text-center transition md:min-h-20 ${
                              active
                                ? 'border-petrol bg-petrol text-ivory shadow-soft'
                                : disabled
                                  ? 'cursor-not-allowed border-sand/60 bg-sand/20 text-warm-gray/45'
                                  : 'border-sand bg-ivory/70 text-charcoal hover:-translate-y-0.5 hover:border-gold hover:bg-cream'
                            }`}
                          >
                            <span className="block text-lg font-black latin-numerals">{option ? option.dayNumber : new Date(`${cell.value}T12:00:00`).getDate()}</span>
                            <span className="mt-1 block text-[10px] font-bold opacity-75">{option ? option.dayName : ''}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </StepPanel>
              ) : null}

              {step === 3 ? (
                <StepPanel eyebrow="الخطوة الثالثة" title="اختاري وقت الجلسة" description="الأوقات المحجوزة تظهر غير متاحة تلقائيًا. يتم إضافة هامش بين الجلسات لمنع التداخل.">
                  {availabilityLoading ? (
                    <div className="rounded-[2rem] border border-sand bg-cream/50 p-6 text-center text-sm font-bold text-warm-gray">
                      جاري تحديث الأوقات المتاحة...
                    </div>
                  ) : null}

                  <div className="space-y-5">
                    {(['morning', 'afternoon', 'evening'] as const).map((period) => {
                      const slots = slotsByPeriod[period]
                      if (slots.length === 0) return null
                      return (
                        <div key={period} className="rounded-[2rem] border border-sand bg-cream/45 p-4">
                          <div className="mb-4 flex items-center justify-between gap-4">
                            <h3 className="text-sm font-black text-charcoal">{getPeriodLabel(period)}</h3>
                            <span className="text-xs font-bold text-warm-gray">{slots.length} موعد</span>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-4">
                            {slots.map((slot) => {
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
                                        ? 'cursor-not-allowed border-sand bg-sand/35 text-warm-gray opacity-55 line-through'
                                        : 'border-sand bg-ivory/78 text-charcoal hover:-translate-y-0.5 hover:border-gold hover:bg-cream'
                                  }`}
                                >
                                  <span className="latin-numerals">{formatTime12h(slot)}</span>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </StepPanel>
              ) : null}

              {step === 4 ? (
                <StepPanel eyebrow="الخطوة الرابعة" title="بيانات التواصل" description="نستخدم هذه البيانات فقط لتأكيد الحجز والمتابعة الخاصة بالجلسة.">
                  <div className="grid gap-5 md:grid-cols-2">
                    <PremiumFormField label="الاسم" required>
                      <input className="premium-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="اكتبي اسمك" required />
                    </PremiumFormField>
                    <PremiumFormField label="رقم الهاتف" required>
                      <input className="premium-input" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="01xxxxxxxxx" required />
                    </PremiumFormField>
                    <PremiumFormField label="البريد الإلكتروني" required>
                      <input className="premium-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" required />
                    </PremiumFormField>
                    <PremiumFormField label="سؤال أو ملاحظة قبل الجلسة">
                      <input className="premium-input" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="ما الذي تريدين فهمه أو ترتيبه؟" />
                    </PremiumFormField>
                  </div>
                </StepPanel>
              ) : null}

              {step === 5 ? (
                <StepPanel eyebrow="الخطوة الخامسة" title="الدفع والمراجعة" description="اختاري طريقة الدفع، ثم اكتبي رقم العملية أو المرجع. يتم تأكيد الحجز بعد المراجعة من الإدارة.">
                  <div className="grid gap-3 md:grid-cols-3">
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

                  <div className="mt-5 rounded-[1.5rem] border border-sand bg-cream/55 p-4">
                    {!coupon.open ? (
                      <button
                        type="button"
                        onClick={() => setCoupon((current) => ({ ...current, open: true }))}
                        className="text-sm font-black text-petrol transition hover:text-gold"
                      >
                        لديك كود خصم؟
                      </button>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                        <input
                          className="premium-input"
                          value={coupon.code}
                          onChange={(event) => setCoupon((current) => ({ ...current, code: event.target.value }))}
                          placeholder="كود الخصم"
                        />
                        <PremiumButton type="button" variant="outline" disabled={coupon.loading} onClick={applyCoupon}>
                          {coupon.loading ? 'جاري التحقق...' : 'تطبيق'}
                        </PremiumButton>
                      </div>
                    )}
                    {coupon.message ? (
                      <p className={`mt-3 text-xs font-bold ${coupon.valid ? 'text-olive' : 'text-burgundy'}`}>{coupon.message}</p>
                    ) : null}
                  </div>

                  <div className="mt-5 rounded-2xl border border-gold/20 bg-gold/10 p-4 text-sm font-bold leading-7 text-deepTeal dark:text-ivory">
                    يمكنكِ إرسال مرجع الدفع الآن لتسريع المراجعة، أو تأكيد طلب الحجز أولًا ثم إرسال الإثبات لاحقًا من صفحة جلساتي.
                  </div>

                  <div className="mt-5 grid gap-5 md:grid-cols-2">
                    <PremiumFormField label="رقم العملية / مرجع الدفع">
                      <input
                        className="premium-input"
                        value={paymentReference}
                        onChange={(event) => setPaymentReference(event.target.value)}
                        placeholder="مثال: رقم العملية أو آخر 4 أرقام — يمكنكِ تركه وإرساله لاحقًا من جلساتي"
                      />
                    </PremiumFormField>
                    <PremiumFormField label="ملاحظة الدفع">
                      <input
                        className="premium-input"
                        value={paymentNote}
                        onChange={(event) => setPaymentNote(event.target.value)}
                        placeholder="أي تفاصيل تساعد في المراجعة"
                      />
                    </PremiumFormField>
                  </div>
                </StepPanel>
              ) : null}

              {error ? (
                <div className="mt-6 rounded-2xl border border-burgundy/20 bg-burgundy/10 px-4 py-3 text-sm font-bold leading-7 text-burgundy">
                  {error}
                </div>
              ) : null}

              <div className="mt-8 flex flex-col-reverse gap-3 border-t border-sand pt-6 sm:flex-row sm:items-center sm:justify-between">
                <PremiumButton type="button" variant="soft" disabled={step === 1 || submitting} onClick={goBack}>
                  رجوع
                </PremiumButton>
                {step < 5 ? (
                  <PremiumButton type="button" onClick={goNext}>
                    متابعة
                  </PremiumButton>
                ) : (
                  <PremiumButton type="submit" disabled={submitting || loading}>
                    {submitting ? 'جاري إرسال الحجز...' : 'إرسال طلب الحجز'}
                  </PremiumButton>
                )}
              </div>
            </section>

            <aside className="space-y-5 xl:sticky xl:top-28">
              <ImageSlot
                fallbackSrc={IMAGE_SLOTS.session}
                ratio="portrait"
                variant="session"
                label="صورة مساحة الجلسة"
                hint="تكوين بصري هادئ من هوية الجلسات."
                className="min-h-[420px]"
              />

              <div className="rounded-[2rem] border border-sand bg-ivory/82 p-5 shadow-soft backdrop-blur-sm">
                <p className="mini-label">لماذا هذه التجربة؟</p>
                <div className="mt-5 space-y-4">
                  <TrustItem title="خصوصية ووضوح" text="بياناتك ومحتوى الجلسة مساحة خاصة لا تُستخدم إلا للمتابعة." />
                  <TrustItem title="منع تداخل المواعيد" text="النظام يقرأ الحجوزات الحالية ويغلق الأوقات المتعارضة." />
                  <TrustItem title="تأكيد بشري قبل الجلسة" text="الإدارة تراجع الدفع والموعد ثم تؤكد الحالة داخل حسابك." />
                </div>
              </div>
            </aside>
          </form>

          <div className="mt-10 rounded-[2.5rem] border border-sand bg-ivory/70 p-6 shadow-soft backdrop-blur-sm">
            <div className="grid gap-5 md:grid-cols-3">
              <TrustStripItem title="جلسات خاصة وسرية" text="خصوصيتك أولًا، وكل شيء يبقى بيننا." />
              <TrustStripItem title="دعم مخصص لكِ" text="الجلسة مصممة حول احتياجك وسؤالك." />
              <TrustStripItem title="رحلة تغيير حقيقية" text="خطوة صغيرة واضحة بعد كل جلسة." />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}

function StepPanel({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="mini-label">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-black text-charcoal md:text-4xl">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-8 text-warm-gray">{description}</p>
      <BrandDivider className="my-7" />
      {children}
    </div>
  )
}

function SummaryRow({ label, value, ltr = false }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-sand bg-cream/55 px-4 py-3 text-sm">
      <span className="font-bold text-warm-gray">{label}</span>
      <strong className={`text-charcoal ${ltr ? 'latin-numerals' : ''}`}>{value}</strong>
    </div>
  )
}

function TrustItem({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-sand bg-cream/55 p-4">
      <h3 className="text-sm font-black text-charcoal">{title}</h3>
      <p className="mt-2 text-xs leading-6 text-warm-gray">{text}</p>
    </div>
  )
}

function TrustStripItem({ title, text }: { title: string; text: string }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-gold/25 bg-gold/10 text-gold">
        ✦
      </div>
      <h3 className="text-sm font-black text-charcoal">{title}</h3>
      <p className="mt-2 text-xs leading-6 text-warm-gray">{text}</p>
    </div>
  )
}
