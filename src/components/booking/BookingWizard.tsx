'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getBrowserClient } from '@/lib/supabase/client'
import { BookingIdentity } from './BookingIdentity'
import { parseCairoLocalDateTime } from '@/lib/booking/cairo-time'
import { useEffect, useMemo, useRef, useState } from 'react'
import { completeBookingFromHold, createBookingHold, releaseBookingHold, type BookingInput } from '@/lib/actions/booking'
import { createPaymentProofUploader } from '@/lib/payment-proof-upload'
import type { BookingExperience, BookingService } from '@/lib/data/booking'
import { formatPrice } from '@/lib/format'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'

type PaymentMethod = 'instapay' | 'wallet' | 'bank_transfer'

const steps = [
  ['نوع الجلسة', 'اختاري المساحة المناسبة'],
  ['الموعد', 'اليوم والساعة بتوقيت القاهرة'],
  ['البيانات', 'للتواصل والتأكيد'],
  ['مراجعة', 'راجعي تفاصيل الموعد'],
  ['الدفع', 'إرسال الإيصال للمراجعة'],
] as const

const dateFormatter = new Intl.DateTimeFormat('ar-EG', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'Africa/Cairo',
})
const longDateFormatter = new Intl.DateTimeFormat('ar-EG', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'Africa/Cairo',
})

function toMinutes(value: string) {
  const [hours, mins] = value.slice(0, 5).split(':').map(Number)
  return hours * 60 + mins
}

function timeLabel(value: string) {
  const [hours, mins] = value.split(':').map(Number)
  const date = new Date(Date.UTC(2020, 0, 1, hours, mins))
  return new Intl.DateTimeFormat('ar-EG', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(date)
}

function availableDate(service: BookingService, date: string) {
  return (service.availableSlots[date] ?? []).length > 0
}

export function BookingWizard({ experience, initialServiceId }: { experience: BookingExperience; initialServiceId?: string }) {
  const router = useRouter()
  const [signedIn, setSignedIn] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [draftLoaded, setDraftLoaded] = useState(false)
  const [localZone, setLocalZone] = useState('Africa/Cairo')
  const isPreview = experience.runtime.status === 'preview'
  const [proofUploader] = useState(createPaymentProofUploader)
  const uploadPaymentProofDirect = proofUploader.upload
  const [step, setStep] = useState(0)
  const [serviceId, setServiceId] = useState(initialServiceId ?? experience.services[0]?.id ?? '')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const notes = ''
  const [subscriptionId, setSubscriptionId] = useState('')
  const [method, setMethod] = useState<PaymentMethod>(
    experience.paymentSettings.instapay ? 'instapay' : experience.paymentSettings.wallet ? 'wallet' : 'bank_transfer',
  )
  const [order, setOrder] = useState<{ orderId: string; total: number; expiresAt?: string | null } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [complete, setComplete] = useState(false)
  const [packageComplete, setPackageComplete] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [closed, setClosed] = useState(false)
  const [pendingAttempt, setPendingAttempt] = useState(false)
  const bookingAttempt = useRef<{ input:BookingInput; holdId:string; isFree:boolean; requestOnly:boolean } | null>(null)
  const [hold, setHold] = useState<{ id: string; expiresAt: string } | null>(null)
  const [now, setNow] = useState(0)
  const actionLock = useRef(false)
  const stepHeading = useRef<HTMLParagraphElement>(null)
  const previousStep = useRef(step)
  useEffect(() => { if (previousStep.current !== step) { stepHeading.current?.focus({ preventScroll: true }); previousStep.current = step } }, [step])

  const service = experience.services.find((item) => item.id === serviceId) ?? experience.services[0]
  const slots = useMemo(() => (service && date ? service.availableSlots[date] ?? [] : []), [service, date])
  const eligibleCredits = experience.credits.filter((credit) => service?.id && credit.eligibleServiceIds.includes(service.id))
  const paymentMethods = [
    experience.paymentSettings.instapay && { id: 'instapay' as const, label: 'InstaPay', detail: experience.paymentSettings.instapay.handle },
    experience.paymentSettings.wallet && { id: 'wallet' as const, label: experience.paymentSettings.wallet.provider, detail: experience.paymentSettings.wallet.number },
    experience.paymentSettings.bank && { id: 'bank_transfer' as const, label: 'تحويل بنكي', detail: experience.paymentSettings.bank.iban },
  ].filter(Boolean) as { id: PaymentMethod; label: string; detail: string }[]
  const canCreateBooking = isPreview || service?.paymentMode === 'free' || service?.paymentMode === 'request' || paymentMethods.length > 0 || eligibleCredits.some(credit => credit.subscriptionId === subscriptionId)
  const paymentExpired = Boolean(order?.expiresAt && now > 0 && new Date(order.expiresAt).getTime() <= now)
  const secondsRemaining = hold ? Math.max(0, Math.ceil((new Date(hold.expiresAt).getTime() - now) / 1_000)) : 0

  useEffect(() => {
    if (!hold && !order?.expiresAt) return
    const timer = window.setInterval(() => setNow(Date.now()), 1_000)
    return () => window.clearInterval(timer)
  }, [hold, order?.expiresAt])

  useEffect(() => {
    let mounted = true
    queueMicrotask(() => {
    if (!mounted) return
    setLocalZone(Intl.DateTimeFormat().resolvedOptions().timeZone)
    try {
      const raw = sessionStorage.getItem('heba-booking-selection')
      const draft = raw ? JSON.parse(raw) : null
      const selected = experience.services.find(item => item.id === draft?.serviceId)
      if (selected && (!initialServiceId || initialServiceId === selected.id) && Date.now() - draft.savedAt < 86_400_000) {
        setServiceId(selected.id!); setDate(draft.date ?? '')
        if ((selected.availableSlots[draft.date] ?? []).includes(draft.time)) { setTime(draft.time); setStep(2) }
        else setStep(1)
      }
    } catch { /* Storage is optional; booking remains usable. */ }
    setDraftLoaded(true)
    })
    if (isPreview || experience.runtime.status !== 'ready') return () => { mounted = false }
    const auth = getBrowserClient().auth
    void auth.getUser().then(({data}) => { setSignedIn(Boolean(data.user)); setAuthChecked(true) }).catch(() => setAuthChecked(true))
    const {data} = auth.onAuthStateChange((_event, session) => { setSignedIn(Boolean(session?.user)); setAuthChecked(true) })
    return () => { mounted = false; data.subscription.unsubscribe() }
  // Restore only once; later server refreshes must not reset the selected step.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (!draftLoaded) return
    try {
      if (complete) sessionStorage.removeItem('heba-booking-selection')
      else sessionStorage.setItem('heba-booking-selection', JSON.stringify({serviceId,date,time,savedAt:Date.now()}))
    } catch { /* Never store passwords, payment proofs or personal details. */ }
  }, [draftLoaded,serviceId,date,time,complete])
  const selectedInstant = date && time ? parseCairoLocalDateTime(`${date}T${time.slice(0,5)}`) : null
  const localTime = selectedInstant && localZone !== 'Africa/Cairo' ? new Intl.DateTimeFormat('ar-EG',{dateStyle:'medium',timeStyle:'short',timeZone:localZone}).format(selectedInstant) : null

  function chooseService(item: BookingService) {
    if (hold && !isPreview) void releaseBookingHold(hold.id).catch(() => undefined)
    setHold(null)
    setSubscriptionId('')
    setServiceId(item.id ?? '')
    setDate('')
    setTime('')
    setOrder(null)
  }

  function validateCurrent() {
    if (step === 0 && !service?.id) return 'اختاري جلسة متاحة.'
    if (step === 1 && !date) return 'اختاري تاريخ الجلسة.'
    if (step === 1 && !time) return 'اختاري وقت الجلسة.'
    if (step === 2 && (fullName.trim().length < 2 || !/^\+?[0-9\s-]{8,18}$/.test(phone.trim())))
      return 'راجعي الاسم ورقم الهاتف قبل المتابعة.'
    return null
  }

  async function next() {
    if (actionLock.current) return
    actionLock.current = true
    try { await advanceStep() }
    catch { setError('تعذر الاتصال. احتفظنا باختياراتك؛ حاولي المتابعة مرة أخرى أو راجعي حجوزاتك إذا أُرسلت الخطوة بالفعل.') }
    finally { actionLock.current = false; setLoading(false) }
  }

  async function advanceStep() {
    const validation = validateCurrent()
    if (validation) {
      setError(validation)
      return
    }
    setError(null)
    if (step < 2) {
      setStep((value) => value + 1)
      return
    }
    if (step === 2) {
      if (!service?.id) return
      if (!isPreview && !signedIn) { setError('أكملي الدخول من النموذج داخل هذه الخطوة للمتابعة.'); return }
      if (isPreview) {
        setHold({ id: 'preview-hold', expiresAt: new Date(Date.now() + 10 * 60_000).toISOString() })
        setNow(Date.now())
        setStep(3)
        return
      }
      setLoading(true)
      const result = await createBookingHold({ serviceId: service.id, date, time })
      setLoading(false)
      if (!result.ok) {
        setError(result.error)
        if (result.code === 'SLOT_TAKEN') { setTime(''); setStep(1) }
        return
      }
      setHold({ id: result.data.holdId, expiresAt: result.data.expiresAt })
      setNow(Date.now())
      setStep(3)
      return
    }
    if (!service?.id || order || complete) {
      setStep(4)
      return
    }
    if (!canCreateBooking) {
      setError('الدفع لهذه الجلسة غير متاح حاليًا. يمكنك التواصل معنا لمساعدتك في الحجز.')
      return
    }
    setLoading(true)
    if (!bookingAttempt.current && (!hold || secondsRemaining <= 0)) {
      setError('انتهت مهلة تثبيت الموعد. اختاري الوقت مرة أخرى.')
      setHold(null); setTime(''); setStep(1)
      return
    }
    if (isPreview) {
      setHold(null)
      setOrder({ orderId: 'preview-order', total: service.price })
      setLoading(false)
      setStep(4)
      return
    }
    const bookingInput = { serviceId: service.id, date, time, fullName, phone, notes, subscriptionId: subscriptionId || undefined }
    if (!bookingAttempt.current && hold) bookingAttempt.current = { input:bookingInput, holdId:hold.id, isFree:service.paymentMode === 'free', requestOnly:service.paymentMode === 'request' }
    const attempt = bookingAttempt.current
    if (!attempt) return
    setPendingAttempt(true)
    const result = await completeBookingFromHold(attempt.input, attempt.holdId, attempt.isFree, attempt.requestOnly)
    setLoading(false)
    if (!result.ok) {
      setError(result.error)
      if (result.terminal) { bookingAttempt.current=null; setPendingAttempt(false) }
      if (result.code === 'SLOT_TAKEN') {
        setTime('')
        setStep(1)
      }
      return
    }
    bookingAttempt.current=null; setPendingAttempt(false)
    setHold(null)
    setConfirmed(Boolean(result.data.confirmed))
    const closedResult = ['cancelled','completed','no_show'].includes(result.data.bookingStatus ?? '') || ['cancelled','expired','refund_pending','refunded'].includes(result.data.orderStatus ?? '')
    setClosed(closedResult)
    setOrder(result.data.orderId ? { orderId: result.data.orderId, total: result.data.total, expiresAt: result.data.expiresAt } : null)
    if (closedResult || result.data.orderStatus === 'awaiting_review' || result.data.confirmed || result.data.requested) { setPackageComplete(Boolean(result.data.packageBacked)); setComplete(true) } else setStep(4)
  }

  async function submitProof(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (actionLock.current) return
    actionLock.current = true
    try { await sendProof(event) }
    catch { setError('تعذر إرسال الإيصال. لم نفقد بيانات الطلب؛ أعيدي المحاولة.') }
    finally { actionLock.current = false; setLoading(false) }
  }

  async function sendProof(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!order) return
    setLoading(true)
    setError(null)
    const file = new FormData(event.currentTarget).get('proof')
    if (!(file instanceof File)) { setLoading(false); setError('أرفقي صورة الإيصال أولًا.'); return }
    if (isPreview) {
      setLoading(false)
      setComplete(true)
      return
    }
    const result = await uploadPaymentProofDirect(order.orderId, method, file)
    setLoading(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setComplete(true)
  }

  if (!service) {
    return (
      <div className="rounded-3xl border border-dashed border-line bg-surface-raised px-6 py-16 text-center">
        <h2 className="text-2xl font-bold text-deep-teal">{experience.runtime.status !== 'ready' ? 'الحجز غير متاح حاليًا' : 'لا توجد جلسات مفتوحة للحجز الآن'}</h2>
        <p className="mt-2 text-text-soft">{experience.runtime.status !== 'ready' ? 'تعذّر تحميل المواعيد الآن. حاولي لاحقًا أو تواصلي معنا.' : 'يمكنك زيارة صفحة الخدمات أو التواصل معنا لاختيار موعد مناسب.'}</p>
        <Button href="/services" variant="secondary" className="mt-6">استكشفي المسارات</Button>
      </div>
    )
  }

  if (complete) {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-antique-gold/40 bg-surface-raised p-8 text-center shadow-card sm:p-12">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-deep-teal text-2xl text-on-dark">✓</span>
        <h2 className="mt-5 text-3xl font-bold text-deep-teal">{isPreview ? 'اكتملت محاكاة الحجز بنجاح' : closed ? 'استعدنا نتيجة حجزك السابق' : confirmed ? 'حجزك مؤكد' : 'وصل طلب حجزك بنجاح'}</h2>
        <p className="mt-3 leading-relaxed text-text-soft">{isPreview ? 'لم يُنشأ حجز أو طلب أو دفع، ولم تُرفع الصورة المختارة إلى أي خادم. هذه هي تجربة واجهة المسار فقط.' : closed ? 'تغيّرت حالة الحجز منذ إرسال المحاولة. راجعي التفاصيل داخل حسابك قبل أي دفع جديد.' : confirmed && !packageComplete ? 'تم تأكيد الجلسة. يمكنك متابعة الموعد وتفاصيله داخل حسابك.' : packageComplete ? 'استُخدمت جلسة من رصيدك المستحق وثُبّت الطلب دون حاجة إلى إثبات دفع.' : service.paymentMode === 'request' ? 'طلب الموعد قيد المراجعة وليس تأكيدًا أو إثبات دفع. ننسق التفاصيل والدفع قبل تأكيد اللقاء؛ يُلغى طلب الموعد بعد 24 ساعة إن لم يُراجع. تابعي حالته من حسابك.' : 'وصل إثبات الدفع للمراجعة. تابعي حالة الحجز من حسابك حتى تأكيده.'}</p>
        <Button href={isPreview ? '/booking' : '/dashboard/bookings'} className="mt-6">{isPreview ? 'تجربة الحجز مرة أخرى' : 'متابعة حجوزاتي'}</Button>
      </div>
    )
  }

  return (
    <div className="space-y-7">
      {isPreview && (
        <div className="relative overflow-hidden rounded-2xl border border-aqua/35 bg-deep-teal px-5 py-4 text-on-dark shadow-card" role="status">
          <span className="absolute -end-8 -top-10 h-28 w-28 rounded-full bg-aqua/13 blur-2xl" aria-hidden />
          <p className="relative text-sm font-bold text-aqua">تجربة عرض آمنة — لا حجز ولا دفع حقيقي</p>
          <p className="relative mt-1 text-xs leading-relaxed text-on-dark/70">كل الخطوات التالية تعمل داخل المتصفح. لا تُحفظ بياناتك ولا تُرسل صورة الإيصال ولا يُنشأ أي سجل في Supabase.</p>
        </div>
      )}
      <ol className={cn('grid gap-1 sm:gap-2', service.paymentMode === 'request' && !subscriptionId ? 'grid-cols-4' : 'grid-cols-5')} aria-label="خطوات الحجز">
        {steps.filter((_,index)=>service.paymentMode!=='request'||Boolean(subscriptionId)||index<4).map(([title, subtitle], index) => (
          <li key={title}>
            <button
              type="button"
              aria-current={index === step ? 'step' : undefined}
              disabled={loading || pendingAttempt || index > step || Boolean(order)}
              onClick={() => { if (index < step) { if (hold && index < 3) { if (!isPreview) void releaseBookingHold(hold.id).catch(() => undefined); setHold(null) }; setStep(index) } }}
              className={cn(
                'flex min-h-20 w-full flex-col items-center justify-center gap-1 rounded-2xl border px-1 text-start transition-colors sm:block sm:text-center',
                index === step ? 'border-antique-gold bg-surface-raised shadow-card' : index < step ? 'border-deep-teal/20 bg-deep-teal/5' : 'border-line bg-ivory/40 opacity-65',
              )}
            >
              <span className={cn('tnum inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold', index <= step ? 'bg-deep-teal text-on-dark' : 'bg-sand/60 text-taupe')}>
                {index < step ? '✓' : (index + 1).toLocaleString('ar-EG')}
              </span>
              <span className="mt-2 block">
                <strong className="block text-xs sm:text-sm text-deep-teal">{title}</strong>
              <span className="hidden text-xs text-taupe xl:block">{subtitle}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-3xl border border-line bg-surface-raised p-5 shadow-card sm:p-8">
          <p ref={stepHeading} tabIndex={-1} className="text-sm font-bold text-burgundy">الخطوة {(step + 1).toLocaleString('ar-EG')}</p>

          {step === 0 && (
            <div className="mt-3">
              <h2 className="text-3xl font-bold text-deep-teal">اختاري نوع الجلسة</h2>
              <p className="mt-1 text-text-soft">اختاري المساحة الأقرب لاحتياجك الحالي؛ يمكنك الرجوع قبل إرسال الطلب.</p>
              <div className="mt-6 grid gap-4">
                {experience.services.map((item) => (
                  <button
                    key={item.slug}
                    type="button"
                    aria-pressed={service.id === item.id}
                    onClick={() => chooseService(item)}
                    className={cn('rounded-2xl border p-5 text-start transition-all', item.id === service.id ? 'border-antique-gold bg-antique-gold/5 shadow-card' : 'border-line hover:border-deep-teal/30')}
                  >
                    <span className="text-xs font-bold text-burgundy">{isPreview ? 'خدمة تجربة غير منشورة' : item.paymentMode === 'free' ? 'حجز مجاني' : 'خدمة منشورة'}</span>
                    <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-deep-teal">{item.title}</h3>
                        <p className="mt-1 max-w-xl text-sm leading-relaxed text-text-soft">{item.description}</p>
                      </div>
                      <div className="shrink-0 text-start sm:text-end">
                        <strong className="tnum block text-xl text-burgundy">{formatPrice(item.price, item.currency)}</strong>
                        <span className="text-xs text-taupe">{item.durationMinutes.toLocaleString('ar-EG')} دقيقة</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="mt-3">
              <h2 className="text-3xl font-bold text-deep-teal">اختاري تاريخ الجلسة</h2>
              <p className="mt-1 text-text-soft">{isPreview ? 'مواعيد خيالية محصورة في Preview لتجربة الواجهة حسب توقيت القاهرة.' : 'تعكس الأيام المعروضة نافذة الحجز المنشورة حاليًا حسب توقيت القاهرة.'}</p>
              <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-7">
                {experience.calendarDates.map((item) => {
                  const enabled = availableDate(service, item)
                  return (
                    <button
                      key={item}
                      type="button"
                      disabled={!enabled}
                      aria-pressed={date === item}
                      onClick={() => { setDate(item); setTime('') }}
                      className={cn('min-h-20 rounded-2xl border px-2 py-3 text-center transition-all', date === item ? 'border-antique-gold bg-antique-gold/10 shadow-card' : enabled ? 'border-line hover:border-deep-teal/40' : 'border-line bg-sand/15 text-taupe opacity-45')}
                    >
                      <span className="block text-sm font-bold">{dateFormatter.format(new Date(`${item}T12:00:00Z`))}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="mt-3">
              <h2 className="text-3xl font-bold text-deep-teal">اختاري وقت الجلسة</h2>
              <p className="mt-1 text-text-soft">كل الأوقات بتوقيت القاهرة. يُعاد التحقق من التوافر عند تثبيت الموعد.</p>
              {slots.length === 0 ? (
                <div className="mt-6 rounded-2xl bg-ivory p-6 text-center text-text-soft">لا توجد أوقات متاحة في هذا اليوم؛ اختاري تاريخًا آخر.</div>
              ) : (
                <div className="mt-6 space-y-5">
                  {[
                    ['الصباح', slots.filter((slot) => toMinutes(slot) < 12 * 60)],
                    ['بعد الظهر', slots.filter((slot) => toMinutes(slot) >= 12 * 60 && toMinutes(slot) < 17 * 60)],
                    ['المساء', slots.filter((slot) => toMinutes(slot) >= 17 * 60)],
                  ].filter(([, values]) => (values as string[]).length > 0).map(([label, values]) => (
                    <div key={label as string}>
                      <h3 className="mb-2 font-bold text-deep-teal">{label as string}</h3>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {(values as string[]).map((slot) => (
                          <button key={slot} type="button" aria-pressed={time === slot} onClick={() => setTime(slot)} className={cn('tnum min-h-12 rounded-xl border px-3 font-semibold transition-colors', time === slot ? 'border-deep-teal bg-deep-teal text-on-dark' : 'border-line hover:border-deep-teal/40')}>
                            {timeLabel(slot)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="mt-3">
              <h2 className="text-3xl font-bold text-deep-teal">بيانات التواصل</h2>
              <p className="mt-1 text-text-soft">بيانات التواصل اللازمة لتأكيد جلستك ومتابعتها.</p>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <FormField label="الاسم الكامل" name="full_name" required maxLength={160} disabled={loading} value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="اكتبي اسمك" />
                <FormField label="رقم الهاتف" name="phone" type="tel" required maxLength={19} disabled={loading} dir="ltr" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="01xxxxxxxxx" />
              </div>
              <p className="mt-4 rounded-xl bg-ivory px-4 py-3 text-sm text-text-soft">قد يُطلب تسجيل الدخول عند تثبيت الموعد حتى يُربط الطلب بحسابك.</p>
              {service.paymentMode !== 'free' && eligibleCredits.length > 0 && <fieldset disabled={loading} className="mt-5 rounded-2xl border border-antique-gold/35 bg-antique-gold/5 p-4"><legend className="px-2 text-sm font-bold text-deep-teal">استخدام باقة جلسات (اختياري)</legend><label className="block text-sm text-text-soft">اختاري باقة أو اتركي الدفع العادي<select value={subscriptionId} onChange={(event)=>setSubscriptionId(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-line bg-surface-raised px-4 text-ink"><option value="">الدفع لهذه الجلسة</option>{eligibleCredits.map((credit)=><option key={credit.subscriptionId} value={credit.subscriptionId}>{credit.planTitle} — {credit.balance.toLocaleString('ar-EG')} جلسة متبقية</option>)}</select></label></fieldset>}
              {!isPreview && authChecked && !signedIn && <BookingIdentity fullName={fullName} onReady={() => { setSignedIn(true); setError(null); router.refresh() }} />}
              {!isPreview && signedIn && <p className="mt-4 text-sm text-deep-teal" role="status">تم تسجيل الدخول. يمكنك متابعة تثبيت الموعد.</p>}
            </div>
          )}

          {step === 3 && (
            <div className="mt-3">
              <h2 className="text-3xl font-bold text-deep-teal">راجعي الحجز قبل تثبيته</h2>
              {pendingAttempt && <p role="status" className="mt-4 rounded-xl bg-ivory p-4 text-sm leading-relaxed text-text-soft">نحتفظ ببيانات هذه المحاولة حتى نتحقق من نتيجتها. يمكنك إعادة التحقق حتى لو انتهى العداد، أو <Link href="/dashboard/bookings" className="underline">مراجعة حجوزاتك</Link>.</p>}
              {hold && !pendingAttempt && <p className={cn('mt-4 rounded-xl px-4 py-3 text-sm font-bold', secondsRemaining > 0 ? 'bg-aqua/10 text-deep-teal' : 'bg-burgundy/10 text-burgundy')}>{isPreview ? 'تُحاكى مهلة تثبيت الموعد' : 'تم تثبيت الموعد مؤقتًا'} لمدة {Math.floor(secondsRemaining / 60).toLocaleString('ar-EG')}:{String(secondsRemaining % 60).padStart(2, '0')} دقيقة. {isPreview ? 'لا يوجد حجز في قاعدة البيانات.' : 'ينتهي الحجز المؤقت تلقائيًا إن لم يكتمل التأكيد.'}</p>}
              <dl className="mt-6 grid gap-3 rounded-2xl bg-ivory p-5 text-sm sm:grid-cols-2"><div><dt className="text-text-soft">الخدمة</dt><dd className="mt-1 font-bold text-deep-teal">{service.title}</dd></div><div><dt className="text-text-soft">الموعد بتوقيت القاهرة</dt><dd className="mt-1 font-bold text-deep-teal">{date ? longDateFormatter.format(new Date(`${date}T12:00:00Z`)) : ''} — {time ? timeLabel(time) : ''}</dd></div><div><dt className="text-text-soft">التواصل</dt><dd className="mt-1 font-bold text-deep-teal">{fullName} · <span dir="ltr">{phone}</span></dd></div><div><dt className="text-text-soft">آلية الحجز</dt><dd className="mt-1 font-bold text-deep-teal">{service.paymentMode === 'request' && !subscriptionId ? 'طلب موعد بالسعر المحدد ينتظر المراجعة؛ تنسيق الدفع بعد الطلب' : service.paymentMode === 'free' ? 'تأكيد فوري بلا دفع' : subscriptionId ? 'خصم من رصيد الباقة' : 'دفع ثم مراجعة'}</dd></div></dl>
              {service.bookingPolicyNote && <p className="mt-4 rounded-xl border border-antique-gold/30 bg-antique-gold/5 px-4 py-3 text-sm text-text-soft">{service.bookingPolicyNote}</p>}
              {!canCreateBooking && <p className="mt-4 rounded-xl bg-burgundy/10 px-4 py-3 text-sm font-semibold text-burgundy">الدفع لهذه الجلسة غير متاح حاليًا. تواصلي معنا لمساعدتك في اختيار موعد.</p>}
            </div>
          )}

          {step === 4 && (
            <div className="mt-3">
              <h2 className="text-3xl font-bold text-deep-teal">الدفع وإرسال الإيصال</h2>
              <p className="mt-1 text-text-soft">{isPreview ? 'اختاري صورة من جهازك لمحاكاة الخطوة؛ لن تغادر الصورة المتصفح.' : 'اختاري الطريقة، حوّلي الإجمالي، ثم ارفعي صورة الإيصال للمراجعة.'}</p>
              {order && paymentExpired && !proofUploader.pending() ? <div className="mt-5 rounded-xl bg-ivory p-5"><p className="text-sm text-text-soft">انتهت مهلة الدفع. راجعي حالة طلبك قبل أي تحويل جديد.</p><Button href="/dashboard/bookings" className="mt-4">متابعة حجوزاتي</Button></div> : order ? (
                <form onSubmit={submitProof} className="mt-6 space-y-5">
                  {isPreview ? (
                    <div className="rounded-2xl border border-aqua/30 bg-aqua/8 p-4">
                      <strong className="block text-deep-teal">محاكاة الدفع اليدوي</strong>
                      <span className="mt-1 block text-xs leading-relaxed text-text-soft">لا يظهر حساب تحويل ولا رقم مالي، ولا يُطلب منك إجراء تحويل في هذه التجربة.</span>
                    </div>
                  ) : <div className="grid gap-3 sm:grid-cols-3">
                    {paymentMethods.map((item) => (
                      <label key={item.id} className={cn('cursor-pointer rounded-2xl border p-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-deep-teal', method === item.id ? 'border-antique-gold bg-antique-gold/5' : 'border-line')}>
                        <input type="radio" disabled={loading || proofUploader.pending()} name="payment_method" value={item.id} checked={method === item.id} onChange={() => setMethod(item.id)} className="sr-only" />
                        <strong className="block text-deep-teal">{item.label}</strong>
                        <span className="tnum mt-1 block break-all text-xs text-text-soft" dir="ltr">{item.detail}</span>
                      </label>
                    ))}
                  </div>}
                  {order.expiresAt && <p className="text-sm text-text-soft">مهلة الدفع حتى {new Intl.DateTimeFormat('ar-EG',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Cairo'}).format(new Date(order.expiresAt))} بتوقيت القاهرة.</p>}
                  <div className="rounded-2xl bg-deep-teal p-5 text-on-dark">
                    <span className="text-sm text-on-dark/70">المبلغ المطلوب</span>
                    <strong className="tnum mt-1 block text-3xl">{formatPrice(order.total, service.currency)}</strong>
                  </div>
                  <label className="block rounded-2xl border border-dashed border-antique-gold bg-ivory p-5 text-center">
                    <span className="block font-bold text-deep-teal">{isPreview ? 'اختاري صورة لمحاكاة إرفاق الإيصال' : 'ارفعي صورة إيصال التحويل'}</span>
                    <span className="mt-1 block text-xs text-taupe">JPG أو PNG أو WebP — بحد أقصى 5MB{isPreview ? ' — لا تُرفع الصورة' : ''}</span>
                    <input className="mt-4 block w-full text-sm text-text-soft file:me-3 file:rounded-full file:border-0 file:bg-deep-teal file:px-4 file:py-2 file:text-on-dark" type="file" disabled={loading} name="proof" accept="image/png,image/jpeg,image/webp" required />
                  </label>
                  <Button type="submit" disabled={loading || (!isPreview && paymentMethods.length === 0)} className="w-full">
                    {loading ? 'جارٍ إرسال الإيصال…' : isPreview ? 'إكمال المحاكاة بأمان' : 'إرسال الحجز للمراجعة'}
                  </Button>
                </form>
              ) : (
                <div className="mt-6 rounded-2xl bg-burgundy/10 p-5 text-burgundy">تعذّر إنشاء الطلب. ارجعي خطوة وحاولي مرة أخرى.</div>
              )}
            </div>
          )}

          {error && (
            <div className="mt-5 rounded-xl bg-burgundy/10 px-4 py-3 text-sm font-medium text-burgundy" role="alert">
              {error}
              {error.includes('دخولك') && <Link href={`/auth/login?redirect=${encodeURIComponent('/booking')}`} className="ms-2 underline">تسجيل الدخول</Link>}
            </div>
          )}

          {step < 4 && (
            <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-5">
              <Button variant="secondary" disabled={step === 0 || loading || pendingAttempt} onClick={() => { if (step === 3 && hold) { if (!isPreview) void releaseBookingHold(hold.id).catch(() => undefined); setHold(null) }; setError(null); setStep((value) => Math.max(0, value - 1)) }}>رجوع</Button>
              <Button disabled={loading || (step === 2 && !isPreview && (!authChecked || !signedIn))} onClick={next}>{loading ? 'جارٍ تثبيت الموعد…' : pendingAttempt ? 'التحقق من نتيجة المحاولة السابقة' : step === 3 ? (service.paymentMode === 'request' && !subscriptionId ? 'إرسال طلب الموعد' : service.paymentMode === 'free' || subscriptionId ? 'تأكيد الحجز' : 'تثبيت الموعد والانتقال للدفع') : 'متابعة'}</Button>
            </div>
          )}
        </section>

        <aside aria-label="ملخص الحجز" className="lg:sticky lg:top-24 rounded-3xl border border-line bg-deep-teal p-6 text-on-dark shadow-card">
          <p className="text-xs font-bold text-antique-gold">ملخص الحجز</p>
          <h2 className="mt-2 text-2xl font-bold">{service.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-on-dark/70">{service.description}</p>
          <dl className="mt-6 space-y-3 border-y border-on-dark/15 py-5 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-on-dark/60">التاريخ</dt><dd className="font-semibold">{date ? longDateFormatter.format(new Date(`${date}T12:00:00Z`)) : 'اختاري التاريخ'}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-on-dark/60">الوقت</dt><dd className="tnum font-semibold">{time ? timeLabel(time) : 'اختاري الوقت'}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-on-dark/60">المدة</dt><dd className="font-semibold">{service.durationMinutes.toLocaleString('ar-EG')} دقيقة</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-on-dark/60">الحالة</dt><dd className="font-semibold">{isPreview ? 'محاكاة غير محفوظة' : service.paymentMode === 'request' && !subscriptionId ? 'طلب جلسة بانتظار المراجعة' : service.paymentMode === 'free' || subscriptionId ? 'تأكيد بعد تثبيت الموعد' : 'تأكيد بعد مراجعة الدفع'}</dd></div>
          </dl>
          <div className="mt-5 flex items-end justify-between gap-4">
            <span className="text-sm text-on-dark/60">الإجمالي</span>
            <strong className="tnum text-2xl text-antique-gold">{formatPrice(order?.total ?? (subscriptionId || service.paymentMode === 'free' ? 0 : service.price), service.currency)}</strong>
          </div>
          {localTime && <p className="mt-3 text-sm text-on-dark">في توقيت جهازك: {localTime} ({localZone})</p>}
          <p className="mt-5 rounded-xl bg-on-dark/8 p-3 text-xs leading-relaxed text-on-dark/70">{isPreview ? 'هذه المواعيد والأسعار خيالية للعرض فقط ولا تُعد توافرًا أو عرضًا تجاريًا.' : 'لا يُعد الطلب مؤكدًا إلا بعد اكتمال شروط الحجز المنشورة وتحديث حالته.'}</p>
        </aside>
      </div>
    </div>
  )
}
