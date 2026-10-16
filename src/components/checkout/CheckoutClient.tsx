'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/cn'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { formatPrice } from '@/lib/format'
import type { CheckoutProduct, PaymentSettings } from '@/lib/data/checkout'
import { createOrder, validateCoupon, type CreatedOrder } from '@/lib/actions/checkout'
import { createPaymentProofUploader } from '@/lib/payment-proof-upload'
import { track } from '@/lib/analytics'

type Method = 'instapay' | 'wallet' | 'bank_transfer'

const allMethods: { id: Method; label: string; hint: string }[] = [
  { id: 'instapay', label: 'إنستاباي', hint: 'تحويل فوري من أي بنك مصري' },
  { id: 'wallet', label: 'محفظة إلكترونية', hint: 'فودافون كاش وغيرها' },
  { id: 'bank_transfer', label: 'تحويل بنكي', hint: 'من حسابك البنكي مباشرة' },
]

function StepDots({ step }: { step: 1 | 2 | 3 }) {
  const labels = ['الطلب والدفع', 'إرفاق الإيصال', 'التأكيد']
  return (
    <ol className="mb-8 grid grid-cols-3 gap-3">
      {labels.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3
        const state = n < step ? 'done' : n === step ? 'active' : 'next'
        return (
          <li key={label} aria-current={n === step ? 'step' : undefined} className="flex min-w-0 items-center justify-center gap-2">
            <span className="flex flex-col items-center gap-2 text-center">
              <span
                className={cn(
                  'tnum flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold',
                  state === 'done' && 'bg-deep-teal text-on-dark',
                  state === 'active' && 'bg-antique-gold text-[#263238]',
                  state === 'next' && 'border border-line bg-surface-raised text-taupe',
                )}
              >
                {state === 'done' ? '✓' : n.toLocaleString('ar-EG')}
              </span>
              <span className={cn('text-sm font-semibold', state === 'active' ? 'text-deep-teal' : 'text-taupe')}>
                {label}
              </span>
            </span>

          </li>
        )
      })}
    </ol>
  )
}

export function CheckoutClient({ product, settings }: { product: CheckoutProduct; settings: PaymentSettings }) {
  // only methods the admin actually configured are offered (§8 — accounts come from site_settings)
  const methods = allMethods.filter((m) =>
    m.id === 'instapay' ? Boolean(settings.instapay) : m.id === 'wallet' ? Boolean(settings.wallet) : Boolean(settings.bank),
  )
  const [proofUploader] = useState(createPaymentProofUploader)
  const uploadPaymentProofDirect = proofUploader.upload
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [method, setMethod] = useState<Method>(methods[0]?.id ?? 'instapay')
  const [variantId, setVariantId] = useState(product.variants[0]?.id ?? '')
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null)
  const [couponMsg, setCouponMsg] = useState<string | null>(null)
  const [order, setOrder] = useState<CreatedOrder | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null)
  const orderAttempt = useRef<Parameters<typeof createOrder>[0] | null>(null)
  const [now, setNow] = useState(0)
  useEffect(() => { if (!order?.expiresAt) return; const timer=window.setInterval(()=>setNow(Date.now()),1000); return ()=>window.clearInterval(timer) }, [order?.expiresAt])
  const actionLock = useRef(false)
  const stage = useRef<HTMLDivElement>(null)
  const previousStep = useRef(step)
  useEffect(() => { if (previousStep.current !== step) { stage.current?.focus({ preventScroll: true }); previousStep.current = step } }, [step])
  async function guarded(action: () => Promise<void>) {
    if (actionLock.current) return
    actionLock.current = true
    try { await action() }
    catch { setError('تعذر الاتصال. بيانات طلبك محفوظة في هذه الصفحة؛ حاولي مرة أخرى. يمكنك متابعة أي طلب تم إنشاؤه من حسابك.') }
    finally { actionLock.current = false; setBusy(false) }
  }


  const selectedVariant = product.variants.find((variant) => variant.id === variantId)
  const selectedPrice = selectedVariant?.price ?? product.price
  const selectedCompareAtPrice = selectedVariant?.compareAtPrice ?? product.compareAtPrice
  const selectedOfferLabel = selectedVariant?.offerLabel ?? product.offerLabel
  const total = Math.max(0, selectedPrice - (coupon?.discount ?? 0))
  const demoMode = product.id === null
  const paymentExpired = Boolean(order?.expiresAt && now > 0 && new Date(order.expiresAt).getTime() <= now)

  async function applyCoupon(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!product.id || checkoutRequestId) return
    const code = String(new FormData(e.currentTarget).get('coupon') ?? '').trim()
    if (!code) return
    setBusy(true)
    setCouponMsg(null)
    const res = await validateCoupon(code, product.id, variantId || undefined)
    if (res.ok) {
      setCoupon({ code: res.data.code, discount: res.data.discount })
      setCouponMsg(`تم تطبيق الكوبون — وفّرتِ ${formatPrice(res.data.discount)}`)
      setCheckoutRequestId(null)
    } else {
      setCoupon(null)
      setCouponMsg(res.error)
      setCheckoutRequestId(null)
    }
    setBusy(false)
  }

  async function createCheckoutOrder() {
    if (!product.id) {
      setError('إتمام الطلبات غير متاح في بيئة العرض التجريبية.')
      return
    }
    setBusy(true)
    setError(null)
    const requestId = checkoutRequestId ?? crypto.randomUUID()
    if (!checkoutRequestId) setCheckoutRequestId(requestId)
    orderAttempt.current ??= { productId:product.id, variantId:variantId || undefined, couponCode:coupon?.code, method, requestId }
    const res = await createOrder(orderAttempt.current)
    if (res.ok) {
      setOrder(res.data)
      setNow(Date.now())
      setStep(res.data.status === 'pending_payment' ? 2 : 3)
      track('order_created', { product: product.slug, type: product.type, method, total: res.data.total })
    } else {
      setError(res.error)
      if (res.terminal) { orderAttempt.current=null; setCheckoutRequestId(null) }
    }
    setBusy(false)
  }

  async function submitCheckoutProof(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!order) return
    setBusy(true)
    setError(null)
    const file = new FormData(e.currentTarget).get('proof')
    if (!(file instanceof File)) { setError('أرفقي صورة الإيصال أولًا.'); setBusy(false); return }
    const res = await uploadPaymentProofDirect(order.orderId, method, file)
    if (res.ok) {
      setOrder({ ...order, status:'awaiting_review' })
      setStep(3)
      track('proof_submitted', { product: product.slug, method })
    } else setError(res.error)
    setBusy(false)
  }

  async function onApplyCoupon(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); await guarded(() => applyCoupon(event)) }
  async function onCreateOrder() { await guarded(createCheckoutOrder) }
  async function onSubmitProof(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); await guarded(() => submitCheckoutProof(event)) }

  const instructions: Record<Method, { title: string; rows: { label: string; value: string | undefined }[] }> = {
    instapay: {
      title: 'حوّلي عبر إنستاباي',
      rows: [
        { label: 'العنوان', value: settings.instapay?.handle },
        { label: 'باسم', value: settings.instapay?.name },
        { label: 'المبلغ', value: formatPrice(order?.total ?? total) },
      ],
    },
    wallet: {
      title: 'حوّلي إلى المحفظة',
      rows: [
        { label: 'الرقم', value: settings.wallet?.number },
        { label: 'المحفظة', value: settings.wallet?.provider },
        { label: 'المبلغ', value: formatPrice(order?.total ?? total) },
      ],
    },
    bank_transfer: {
      title: 'حوّلي إلى الحساب البنكي',
      rows: [
        { label: 'البنك', value: settings.bank?.bank },
        { label: 'IBAN', value: settings.bank?.iban },
        { label: 'باسم', value: settings.bank?.name },
        { label: 'المبلغ', value: formatPrice(order?.total ?? total) },
      ],
    },
  }

  return (
    <div ref={stage} tabIndex={-1} aria-label={`الدفع: الخطوة ${step} من 3`} aria-busy={busy} className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
      <StepDots step={step} />
      {step > 1 && order && <dl aria-label="ملخص الطلب" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface-raised px-5 py-4 text-sm"><div><dt className="text-taupe">طلبك</dt><dd className="mt-1 font-bold text-deep-teal">{product.title}{selectedVariant ? ` — ${selectedVariant.name}` : ''}</dd></div><div><dt className="text-taupe">الإجمالي المسجل</dt><dd className="tnum mt-1 font-bold text-burgundy">{formatPrice(order.total)}</dd></div></dl>}

      {step === 1 && (
        <Card className="space-y-6 p-5 sm:p-8">
          <div className="flex items-start justify-between gap-4 border-b border-line pb-6">
            <div>
              <p className="text-xs font-semibold tracking-wide text-antique-gold">{product.subtitle}</p>
              <h1 className="mt-1 font-heading text-3xl font-bold leading-snug text-deep-teal">{product.title}</h1>
              {selectedOfferLabel && (
                <span className="mt-2 inline-block rounded-full bg-burgundy/10 px-3 py-1 text-xs font-bold text-burgundy">
                  {selectedOfferLabel}
                </span>
              )}
            </div>
            <div className="text-end">
              <p className="tnum text-2xl font-bold text-burgundy">{formatPrice(total)}</p>
              {(selectedCompareAtPrice || coupon) && (
                <p className="tnum text-sm text-taupe line-through">
                  {formatPrice(selectedCompareAtPrice ?? selectedPrice)}
                </p>
              )}
            </div>
          </div>

          {product.variants.length > 0 && <label className="block text-sm font-bold text-deep-teal">اختاري النسخة<select disabled={busy || Boolean(checkoutRequestId)} value={variantId} onChange={(event) => { setVariantId(event.target.value); setCoupon(null); setCouponMsg(null); setCheckoutRequestId(null) }} className="mt-2 min-h-11 w-full rounded-xl border border-line bg-surface-raised px-4 text-ink">{product.variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.name} — {formatPrice(variant.price)}</option>)}</select></label>}

          <form onSubmit={onApplyCoupon} className="flex items-end gap-3">
            <FormField label="كوبون خصم (اختياري)" name="coupon" disabled={busy || Boolean(checkoutRequestId)} dir="ltr" className="flex-1" />
            <Button type="submit" variant="secondary" disabled={busy || demoMode || Boolean(checkoutRequestId)}>
              تطبيق
            </Button>
          </form>
          {couponMsg && (
            <p className={cn('text-sm font-medium', coupon ? 'text-deep-teal' : 'text-burgundy')} role="status">
              {couponMsg}
            </p>
          )}

          <fieldset disabled={busy || Boolean(checkoutRequestId)}>
            <legend className="mb-3 text-sm font-bold text-deep-teal">اختاري وسيلة الدفع</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              {methods.map((m) => (
                <label
                  key={m.id}
                  className={cn(
                    'cursor-pointer rounded-2xl border p-4 text-center transition-all focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-deep-teal',
                    method === m.id
                      ? 'border-deep-teal bg-deep-teal/5 shadow-card'
                      : 'border-line bg-surface-raised hover:border-taupe',
                  )}
                >
                  <input
                    type="radio"
                    name="method"
                    value={m.id}
                    checked={method === m.id}
                    onChange={() => { setMethod(m.id); setCheckoutRequestId(null) }}
                    className="sr-only"
                  />
                  <span className="block font-bold text-deep-teal">{m.label}</span>
                  <span className="mt-1 block text-xs text-taupe">{m.hint}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {error && (
            <p className="rounded-xl bg-burgundy/10 px-4 py-3 text-sm font-medium text-burgundy" role="alert">
              {error}
            </p>
          )}

          {checkoutRequestId && <p role="status" className="text-sm leading-relaxed text-text-soft">ثبّتنا اختيارات هذه المحاولة حتى نتأكد من نتيجتها. يمكنك إعادة التحقق أو <Link href="/dashboard/orders" className="underline">متابعة طلباتك</Link>.</p>}
          {methods.length === 0 && total > 0 && <p className="rounded-xl bg-burgundy/10 px-4 py-3 text-sm font-medium text-burgundy" role="status">لا توجد وسيلة دفع يدوية مهيأة حاليًا، لذلك لن ننشئ طلبًا غير قابل للإكمال.</p>}
          <Button size="lg" className="w-full" onClick={onCreateOrder} disabled={busy || (methods.length === 0 && total > 0)}>
            {busy ? 'لحظات…' : checkoutRequestId ? 'التحقق من نتيجة المحاولة السابقة' : total === 0 ? 'تأكيد الطلب المجاني' : 'متابعة لتعليمات الدفع'}
          </Button>
          <p className="text-center text-xs text-taupe">
            بإتمام الطلب فأنتِ توافقين على <Link href="/terms" className="underline">الشروط والأحكام</Link>
          </p>
        </Card>
      )}

      {step === 2 && order && (
        <Card className="space-y-6 p-5 sm:p-8">
          <div className="text-center">
            <h1 className="font-heading text-3xl font-bold leading-snug text-deep-teal">{paymentExpired ? 'انتهت مهلة الدفع' : instructions[method].title}</h1>
            <p className="mt-2 text-sm text-text-soft">
              {paymentExpired ? 'راجعي حالة الطلب من حسابك قبل أي تحويل. إذا أرسلتِ إيصالًا بالفعل، يمكنك إعادة التحقق من المحاولة نفسها.' : 'بعد التحويل صوّري الإيصال وأرفقيه هنا — يراجعه الفريق ضمن أوقات العمل ثم يفعّل وصولك.'}
            </p>
          </div>

          {!paymentExpired && <dl className="divide-y divide-line rounded-2xl border border-line bg-ivory/60">
            {instructions[method].rows.filter((row) => row.value).map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <dt className="text-sm font-semibold text-taupe">{row.label}</dt>
                <dd dir="ltr" className="tnum font-bold text-deep-teal">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>}

          <Badge tone="pending" className="mx-auto">
            {order.expiresAt ? (now > 0 && new Date(order.expiresAt).getTime() <= now ? 'انتهت مهلة الدفع؛ راجعي حالة الطلب من حسابك.' : `مهلة الدفع حتى ${new Intl.DateTimeFormat('ar-EG',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Cairo'}).format(new Date(order.expiresAt))} بتوقيت القاهرة`) : 'راجعي حالة الطلب من حسابك قبل الدفع.'}
          </Badge>

          {(!paymentExpired || proofUploader.pending()) ? <form onSubmit={onSubmitProof} className="space-y-5">
            <div>
              <label htmlFor="proof" className="mb-2 block text-sm font-bold text-deep-teal">
                صورة إيصال التحويل
              </label>
              <input
                id="proof"
                name="proof"
                disabled={busy}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                required
                className="w-full rounded-xl border border-dashed border-taupe bg-surface-raised px-4 py-6 text-sm text-text-soft file:me-4 file:rounded-full file:border-0 file:bg-deep-teal file:px-5 file:py-2 file:text-sm file:font-semibold file:text-on-dark"
              />
              <p className="mt-2 text-xs text-taupe">JPG أو PNG أو WebP — بحد أقصى ٥ ميجابايت</p>
            </div>
            {error && (
              <p className="rounded-xl bg-burgundy/10 px-4 py-3 text-sm font-medium text-burgundy" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? 'جارٍ الرفع…' : 'أرسلي الإيصال للمراجعة'}
            </Button>
          </form> : <Button href="/dashboard/orders" className="w-full">متابعة حالة الطلب</Button>}
        </Card>
      )}

      {step === 3 && (
        <Card className="space-y-5 p-10 text-center">
          <svg viewBox="0 0 48 48" className="mx-auto h-16 w-16 text-deep-teal" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="24" cy="24" r="21" strokeOpacity="0.3" />
            <path d="M15 25l6 6 12-13" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h1 className="font-heading text-3xl font-bold leading-snug text-deep-teal">{order?.status === 'paid' ? 'تم تفعيل وصولك' : order?.status === 'awaiting_review' ? 'استلمنا إيصالك' : 'استعدنا حالة طلبك'}</h1>
          <p className="mx-auto max-w-sm leading-loose text-text-soft">
            {order?.status === 'paid'
              ? 'طلبك مكتمل. يمكنك الوصول إلى مشترياتك من حسابك دون دفع جديد.'
              : order?.status === 'awaiting_review' ? 'طلبك الآن قيد المراجعة. سنفعّل وصولك ونرسل لك إشعارًا فور اعتماد الإيصال.' : 'لم يعد الطلب في انتظار الدفع. راجعي حالته وتفاصيله داخل حسابك قبل إجراء أي تحويل.'}
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Button href="/dashboard/payments">تابعي حالة الدفع</Button>
            <Button href="/dashboard" variant="secondary">
              لوحتي
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
