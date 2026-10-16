'use client'

import { useState } from 'react'
import { formatCairoLocalDateTime } from '@/lib/booking/cairo-time'
import { AdminEditorDialog } from '@/components/admin/AdminEditorDialog'
import { ActionFeedback } from '@/components/admin/ActionFeedback'
import { useAdminAction } from '@/components/admin/useAdminAction'
import { createCoupon, setCouponActive, createOffer, setOfferActive, updateCoupon, deleteCoupon, updateOffer, deleteOffer } from '@/lib/actions/marketing'
import type { AdminCoupon, AdminOffer } from '@/lib/data/admin'
import { FormField, FormSelect } from '@/components/ui/FormField'
import { Button } from '@/components/ui/Button'

type Product = { id: string; title: string }
type Target = { product_id: string | null; product_type: string | null; category: string | null }
const discounts = [{ value: 'percent', label: 'نسبة مئوية ٪' }, { value: 'fixed', label: 'مبلغ ثابت (ج.م)' }]
const campaigns = [{ value: 'flash_sale', label: 'تخفيض سريع' }, { value: 'countdown', label: 'عدّاد تنازلي' }, { value: 'seasonal', label: 'موسمية' }, { value: 'limited_seats', label: 'مقاعد محدودة' }, { value: 'bundle', label: 'حزمة' }, { value: 'coupon_campaign', label: 'حملة كوبونات' }]
const types = [{ value: '', label: 'أي نوع' }, { value: 'course', label: 'الدورات' }, { value: 'book', label: 'الكتب' }, { value: 'workshop', label: 'الورش' }, { value: 'session', label: 'الجلسات' }, { value: 'bundle', label: 'الحزم' }, { value: 'vip', label: 'VIP' }, { value: 'free_resource', label: 'الموارد المجانية' }]

function TargetsEditor({ initial = [], products }: { initial?: Target[]; products: Product[] }) {
  const [rows, setRows] = useState(initial.map((target, id) => ({ target, id })))
  const [nextId, setNextId] = useState(initial.length)
  const update = (id: number, key: keyof Target, value: string) => setRows(rows.map(row => row.id === id ? { ...row, target: { ...row.target, [key]: value || null } } : row))
  return <fieldset className="space-y-4 rounded-xl border border-line p-4 sm:col-span-2">
    <legend className="px-2 font-semibold text-deep-teal">نطاق العرض</legend>
    <p className="text-sm leading-loose text-text-soft">بلا شروط يطبّق العرض على الكل. أضيفي شرطًا لكل مجموعة مستهدفة. يكفي تطابق المنتج المحدد أو نوعه داخل أي شرط.</p>
    <input type="hidden" name="targets" value={JSON.stringify(rows.map(row => row.target))} />
    {rows.map(({ id, target }, index) => <div key={id} className="grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-2">
      <FormSelect name={`target-type-${id}`} label={`نوع المنتج — شرط ${index + 1}`} options={types} value={target.product_type ?? ''} onChange={event => update(id, 'product_type', event.target.value)} />
      <FormSelect name={`target-product-${id}`} label="منتج محدد" value={target.product_id ?? ''} onChange={event => update(id, 'product_id', event.target.value)} options={[{ value: '', label: 'أي منتج' }, ...products.map(product => ({ value: product.id, label: product.title })), ...(target.product_id && !products.some(p => p.id === target.product_id) ? [{ value: target.product_id, label: 'المنتج المرتبط سابقًا' }] : [])]} />
      {target.category && <p className="text-sm text-text-soft">وصف التصنيف المحفوظ: {target.category}. يُحدد التطبيق باختيار المنتج أو نوعه.</p>}
      <Button variant="ghost" type="button" onClick={() => setRows(rows.filter(row => row.id !== id))}>إزالة الشرط {index + 1}</Button>
    </div>)}
    <Button type="button" variant="secondary" disabled={rows.length >= 100} onClick={() => { setRows([...rows, { id: nextId, target: { product_id: null, product_type: 'course', category: null } }]); setNextId(nextId + 1) }}>إضافة شرط استهداف</Button>
  </fieldset>
}

function CouponFields({ coupon }: { coupon?: AdminCoupon }) {
  return <>
    <FormField label="الكود" name="code" required maxLength={24} dir="ltr" defaultValue={coupon?.code} hint="3–24 حرفًا لاتينيًا أو رقمًا أو - أو _" />
    <FormSelect label="نوع الخصم" name="kind" options={discounts} defaultValue={coupon?.kind ?? 'percent'} />
    <FormField label="قيمة الخصم" name="value" type="number" min={0.01} max={99999999.99} step="0.01" required dir="ltr" defaultValue={coupon?.value} />
    <FormField label="حد الاستخدام الكلي (اختياري)" name="max_uses" type="number" min={1} max={1000000} dir="ltr" defaultValue={coupon?.maxUses ?? ''} />
    <FormField label="حد الاستخدام لكل عميلة" name="max_uses_per_user" type="number" min={1} max={1000000} defaultValue={coupon?.maxUsesPerUser ?? 1} dir="ltr" />
    <Dates startsAt={coupon?.startsAt} endsAt={coupon?.endsAt} />
  </>
}
function Dates({ startsAt, endsAt }: { startsAt?: string | null; endsAt?: string | null }) {
  return <>
    <FormField label="يبدأ في — توقيت القاهرة (اختياري)" name="starts_at" type="datetime-local" dir="ltr" defaultValue={startsAt ? formatCairoLocalDateTime(startsAt) ?? '' : ''} />
    <FormField label="ينتهي في — توقيت القاهرة (اختياري)" name="ends_at" type="datetime-local" dir="ltr" defaultValue={endsAt ? formatCairoLocalDateTime(endsAt) ?? '' : ''} />
  </>
}
function OfferFields({ offer, products }: { offer?: AdminOffer; products: Product[] }) {
  return <>
    <FormField label="عنوان العرض" name="title" required maxLength={180} defaultValue={offer?.title} />
    <FormField label="الوصف" name="description" maxLength={10000} defaultValue={offer?.description} />
    <FormSelect label="نوع الحملة" name="kind" options={campaigns} defaultValue={offer?.kind ?? 'flash_sale'} />
    <FormField label="نص الشارة" name="badge_text" maxLength={100} defaultValue={offer?.badgeText ?? ''} />
    <FormSelect label="نوع الخصم" name="discount_kind" options={discounts} defaultValue={offer?.discountKind ?? 'percent'} />
    <FormField label="قيمة الخصم" name="discount_value" type="number" min={0.01} max={99999999.99} step="0.01" required dir="ltr" defaultValue={offer?.discountValue ?? ''} />
    <FormField label="حد الاستخدام الكلي (اختياري)" name="usage_limit" type="number" min={1} max={1000000} dir="ltr" defaultValue={offer?.usageLimit ?? ''} />
    <Dates startsAt={offer?.startsAt} endsAt={offer?.endsAt} />
    <TargetsEditor initial={offer?.targets} products={products} />
  </>
}
function MarketingEditor({ kind, coupon, offer, products = [] }: { kind: 'coupon' | 'offer'; coupon?: AdminCoupon; offer?: AdminOffer; products?: Product[] }) {
  const { busy, feedback, run } = useAdminAction()
  const [confirm, setConfirm] = useState(false), [generation, setGeneration] = useState(0)
  const id = coupon?.id ?? offer?.id
  return <form className="space-y-5" aria-busy={busy} onSubmit={async event => {
    event.preventDefault(); const form = event.currentTarget, data = new FormData(form)
    const operation = kind === 'coupon' ? () => id ? updateCoupon(id, data) : createCoupon(data) : () => id ? updateOffer(id, data) : createOffer(data)
    if (await run(operation, 'تم حفظ التعديلات.')) { setConfirm(false); if (!id) { form.reset(); setGeneration(generation + 1) } }
  }}>
    <fieldset key={generation} disabled={busy} className="grid gap-4 sm:grid-cols-2">{kind === 'coupon' ? <CouponFields coupon={coupon} /> : <OfferFields offer={offer} products={products} />}</fieldset>
    <ActionFeedback feedback={feedback} />
    <div className="flex flex-wrap gap-3">
      <Button type="submit" disabled={busy}>{busy ? 'جاري الحفظ…' : id ? 'حفظ التعديلات' : 'إنشاء وتفعيل'}</Button>
      {id && <Button type="button" variant="burgundy" disabled={busy} onClick={async () => { if (!confirm) { setConfirm(true); return }; if (await run(() => kind === 'coupon' ? deleteCoupon(id) : deleteOffer(id), 'حُذف السجل غير المستخدم.')) setConfirm(false) }}>{confirm ? 'تأكيد الحذف النهائي' : 'حذف'}</Button>}
      {confirm && <Button type="button" variant="ghost" disabled={busy} onClick={() => setConfirm(false)}>تراجع</Button>}
    </div>
    {confirm && <p className="text-sm text-burgundy">يُحذف السجل غير المستخدم فقط. السجل المرتبط بطلبات يمكن إيقافه مع بقاء تاريخه.</p>}
  </form>
}
export function CouponForm() { return <MarketingEditor kind="coupon" /> }
export function OfferForm({ products = [] }: { products?: Product[] }) { return <MarketingEditor kind="offer" products={products} /> }
export function CouponEdit({ coupon }: { coupon: AdminCoupon }) { return <AdminEditorDialog title="تعديل الكوبون" triggerLabel="تعديل وحذف"><MarketingEditor kind="coupon" coupon={coupon} /></AdminEditorDialog> }
export function OfferEdit({ offer, products = [] }: { offer: AdminOffer; products?: Product[] }) { return <AdminEditorDialog title="تعديل العرض" triggerLabel="تعديل وحذف"><MarketingEditor kind="offer" offer={offer} products={products} /></AdminEditorDialog> }
export function ActiveToggle({ id, active, kind }: { id: string; active: boolean; kind: 'coupon' | 'offer' }) {
  const { busy, feedback, run } = useAdminAction()
  return <div className="space-y-3"><Button variant={active ? 'secondary' : 'primary'} disabled={busy} onClick={() => run(() => kind === 'coupon' ? setCouponActive(id, !active) : setOfferActive(id, !active), active ? 'تم الإيقاف.' : 'تم التفعيل.')}>{busy ? 'جاري التنفيذ…' : active ? 'إيقاف' : 'تفعيل'}</Button><ActionFeedback feedback={feedback} /></div>
}
