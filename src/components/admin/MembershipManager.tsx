'use client'
import {AdminChoicePicker,BundleChildrenPicker} from './AdminChoicePicker'
import {AdminField,AdminSelect,AdminTextarea} from './AdminField'

import { useState } from 'react'
import { formatCairoLocalDateTime } from '@/lib/booking/cairo-time'
import { ActionFeedback } from '@/components/admin/ActionFeedback'
import { useAdminAction } from '@/components/admin/useAdminAction'
import { adjustSubscriptionCredit, createSubscription, deleteSubscription, deleteSubscriptionPlan, restoreSubscriptionPlan, removeUnusedSubscriptionPlan, saveSubscriptionPlan, updateSubscriptionStatus } from '@/lib/actions/admin-control'
import { Button } from '@/components/ui/Button'

export type PlanAdmin = {
  id: string
  archived_at: string | null
  title: string
  slug: string
  description: string
  price: number
  currency: string
  billing_interval: string
  duration_days: number
  sessions_included: number
  max_subscribers: number | null
  features: string[]
  starts_at: string | null
  ends_at: string | null
  is_active: boolean
  is_published: boolean
  sort: number
  activeCount: number
  eligibleServiceIds: string[]
  product_id: string | null
}

function PlanForm({ plan, packageProducts }: { plan?: PlanAdmin; services: { id: string; title: string }[]; packageProducts: { id: string; title: string }[] }) {
  const { busy, feedback, run } = useAdminAction()
  const prefix = `plan-${plan?.id ?? 'new'}`
  return <form className="grid gap-4 md:grid-cols-2" onSubmit={async (event) => {
    event.preventDefault()
    const form = event.currentTarget, data = new FormData(form)
    if (await run(() => saveSubscriptionPlan(plan?.id ?? null, data), 'تم حفظ الباقة.')) { if (!plan) form.reset() }
  }} aria-busy={busy}>
    <fieldset disabled={busy} className="grid min-w-0 gap-4 md:col-span-2 md:grid-cols-2">
    {[
      ['title','اسم الباقة','text',plan?.title ?? ''], ['slug','الرابط','text',plan?.slug ?? ''],
      ['price','السعر','number',plan?.price ?? 0], ['currency','العملة','text',plan?.currency ?? 'EGP'],
      ['duration_days','المدة بالأيام','number',plan?.duration_days ?? 30],
      ['sessions_included','الجلسات المشمولة','number',plan?.sessions_included ?? 0],
      ['max_subscribers','الحد الأقصى للمشتركات','number',plan?.max_subscribers ?? ''],
      ['sort','الترتيب','number',plan?.sort ?? 0],
    ].map(([name,label,type,value])=><AdminField key={String(name)} id={`${prefix}-${name}`} name={String(name)} label={String(label)} type={String(type)} defaultValue={value} min={type==='number'?(['duration_days','max_subscribers'].includes(String(name))?1:0):undefined} max={type==='number'?(name==='price'?99999999.99:name==='duration_days'?3650:name==='max_subscribers'?1000000:100000):undefined} step={name==='price'?'0.01':undefined} required={['title','slug','price','currency','duration_days'].includes(String(name))} dir={['slug','currency'].includes(String(name))?'ltr':'rtl'}/>)}
    <AdminSelect label="دورية الباقة" name="billing_interval" defaultValue={plan?.billing_interval??'month'} required hint="وصف مدة الباقة للعميلة. اختيار دوري لا ينشئ خصمًا بنكيًا تلقائيًا؛ التجديد بحسب آلية الموقع الحالية." example="شهري لباقة شهر واحد"><option value="month">شهري</option><option value="quarter">ربع سنوي</option><option value="year">سنوي</option><option value="one_time">مرة واحدة</option></AdminSelect>
    <AdminChoicePicker kind="package" name="product_id" label="منتج شراء الباقة — اختياري" defaultValue={plan?.product_id??''} initialLabel={packageProducts.find(product=>product.id===plan?.product_id)?.title}/>
    <p className="text-sm text-text-soft">المنتج المرتبط يفعّل الباقة عند الدفع. دون اختيار تكون الإتاحة إدارية فقط. مثال: منتج الحزمة المعتمد.</p>
    <AdminField label="تبدأ في — القاهرة" name="starts_at" type="datetime-local" defaultValue={(plan?.starts_at?formatCairoLocalDateTime(plan.starts_at):'')??''} dir="ltr"/>
    <AdminField label="تنتهي في — القاهرة" name="ends_at" type="datetime-local" defaultValue={(plan?.ends_at?formatCairoLocalDateTime(plan.ends_at):'')??''} dir="ltr"/>
    <AdminTextarea label="وصف الباقة" name="description" defaultValue={plan?.description} maxLength={30000} rows={4} className="md:col-span-2"/>
    <AdminTextarea label="المزايا — ميزة في كل سطر" name="features" defaultValue={plan?.features.join('\n')} maxLength={10000} rows={5} className="md:col-span-2" hint="اكتبي المزايا المعتمدة فقط. تظهر كقائمة في تفاصيل الباقة." example="متابعة التقدم ثم أوراق تطبيق في سطر آخر" limits="حتى 50 ميزة؛ كل ميزة حتى 300 حرف"/>
    <p className="text-sm leading-loose text-text-soft md:col-span-2">تعديل المدة والجلسات والخدمات يطبّق على الاشتراكات الجديدة. الاشتراكات القائمة تحتفظ بالحقوق المسجلة لها. أوقفي نشر منتج الشراء المرتبط قبل تعديل الباقة.</p>
    <BundleChildrenPicker initial={plan?.eligibleServiceIds??[]} kind="service" name="eligible_service_ids" label="الخدمات التي يمكن حجزها برصيد الباقة"/>
    <div className="flex flex-wrap gap-4 md:col-span-2">
      <label className="flex items-center gap-2 text-sm font-bold text-deep-teal"><input type="checkbox" name="is_active" defaultChecked={plan?.is_active ?? true} className="accent-deep-teal" /> مفعّلة للبيع</label>
      <label className="flex items-center gap-2 text-sm font-bold text-deep-teal"><input type="checkbox" name="is_published" defaultChecked={plan?.is_published} className="accent-deep-teal" /> منشورة للزوار</label>
    </div>
    </fieldset><ActionFeedback feedback={feedback} className="md:col-span-2" />
    <Button type="submit" disabled={busy} className="justify-self-start">{busy ? 'جاري الحفظ…' : plan ? 'حفظ تعديلات الباقة' : 'إنشاء الباقة'}</Button>
  </form>
}

export function MembershipPlansManager({ plans, services, packageProducts }: { plans: PlanAdmin[]; services: { id: string; title: string }[]; packageProducts: { id: string; title: string }[] }) {
  const [confirm, setConfirm] = useState<string | null>(null)
  const { busy, feedback, run } = useAdminAction()
  return <div className="space-y-5">
    <details className="rounded-2xl border border-antique-gold/30 bg-surface-raised shadow-card">
      <summary className="cursor-pointer list-none px-6 py-5 font-heading text-xl font-bold text-deep-teal">إضافة باقة شهرية أو سنوية جديدة</summary>
      <div className="border-t border-line p-6"><PlanForm services={services} packageProducts={packageProducts} /></div>
    </details>
    {plans.map((plan) => <details key={plan.id} className="rounded-2xl border border-line bg-surface-raised shadow-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5">
        <div><h3 className="font-heading text-xl font-bold text-deep-teal">{plan.title}</h3><p className="mt-1 text-sm text-text-soft">{plan.price.toLocaleString('ar-EG')} {plan.currency} · {plan.activeCount.toLocaleString('ar-EG')} اشتراك نشط</p></div>
        <span className={`rounded-full px-3 py-1 text-sm font-bold ${plan.is_published ? 'bg-aqua/15 text-deep-teal' : 'bg-sand/50 text-text-soft'}`}>{plan.archived_at ? 'مؤرشفة' : !plan.is_active ? 'موقوفة' : plan.is_published ? 'منشورة' : 'مسودة'}</span>
      </summary>
      <div className="space-y-5 border-t border-line p-6">{!plan.archived_at && <PlanForm plan={plan} services={services} packageProducts={packageProducts} />}
        <div className="border-t border-line pt-4">
          <div className="flex flex-wrap gap-3">
            {plan.archived_at && <Button variant="secondary" disabled={busy} onClick={() => run(() => restoreSubscriptionPlan(plan.id), 'استُعيدت الباقة كمسودة موقوفة؛ راجعيها قبل إعادة فتح البيع.')}>استعادة كمسودة</Button>}
            {!plan.archived_at && <Button variant="secondary" disabled={busy} onClick={() => setConfirm(`archive:${plan.id}`)}>أرشفة الباقة</Button>}
            <Button variant="burgundy" disabled={busy} onClick={() => setConfirm(`delete:${plan.id}`)}>حذف غير المستخدمة</Button>
          </div>
          {(confirm === `archive:${plan.id}` || confirm === `delete:${plan.id}`) && <div className="mt-4 space-y-3 rounded-xl border border-burgundy/25 p-4">
            <p className="text-sm text-burgundy">{confirm.startsWith('delete:') ? 'حذف نهائي متاح فقط للباقة التي لا ترتبط بأي اشتراك. استخدمي الأرشفة لحفظ التاريخ.' : 'ستتوقف الباقة عن البيع والنشر. تظل حقوق الاشتراكات القائمة محفوظة.'}</p>
            <div className="flex gap-3"><Button variant="burgundy" disabled={busy} onClick={async () => { if (await run(() => confirm.startsWith('delete:') ? removeUnusedSubscriptionPlan(plan.id) : deleteSubscriptionPlan(plan.id), 'تم تنفيذ الإجراء.')) setConfirm(null) }}>تأكيد</Button><Button variant="ghost" disabled={busy} onClick={() => setConfirm(null)}>تراجع</Button></div>
          </div>}
        </div>
      </div>
    </details>)}
    <ActionFeedback feedback={feedback} />
  </div>
}

export function SubscriptionStatusControl({ id, status }: { id: string; status: string }) {
  const { busy, feedback, run } = useAdminAction()
  const [confirm, setConfirm] = useState(false)
  return <div className="space-y-3">
    <AdminSelect  label={`حالة الاشتراك`} required hint="يُحفظ التغيير فورًا. الإيقاف أو الإلغاء يمنع الاستفادة الجديدة وفق السياسة، مع حفظ التاريخ؛ لا ينفّذ استردادًا ماليًا." example="موقوف مؤقتًا عند الاتفاق على إيقاف الاستفادة" value={status} disabled={busy} onChange={event => { const value = event.target.value; void run(() => updateSubscriptionStatus(id, value), 'حُدّثت حالة الاشتراك.') }} name="admin_field_110">
        <option value="pending">بانتظار التفعيل</option><option value="active">نشط</option><option value="paused">موقوف مؤقتًا</option><option value="cancelled">ملغي</option><option value="expired">منتهي</option>
      </AdminSelect>
    {!confirm ? <Button variant="ghost" disabled={busy} onClick={() => setConfirm(true)}>إلغاء وأرشفة</Button> : <div className="space-y-3 rounded-xl border border-burgundy/25 p-4">
      <p className="text-sm text-burgundy">هل تريدين إلغاء هذا الاشتراك وأرشفته؟</p>
      <div className="flex flex-wrap gap-2"><Button variant="burgundy" disabled={busy} onClick={async () => { if (await run(() => deleteSubscription(id), 'أُلغي الاشتراك وأُرشف.')) setConfirm(false) }}>تأكيد الإلغاء</Button><Button variant="ghost" disabled={busy} onClick={() => setConfirm(false)}>تراجع</Button></div>
    </div>}
    <ActionFeedback feedback={feedback} />
  </div>
}

export function SubscriptionCreditControl({ id, balance, included }: { id: string; balance: number; included: number }) {
  const { busy, feedback, run } = useAdminAction()
  return <div className="space-y-3"><p className="font-bold text-deep-teal">{balance.toLocaleString('ar-EG')} / {included.toLocaleString('ar-EG')} متبقية</p>
    <div className="flex flex-wrap gap-2"><Button disabled={busy || balance <= 0} onClick={() => run(() => adjustSubscriptionCredit(id, -1, 'استهلاك جلسة يدوي'), 'سُجّل استهلاك الجلسة.')}>استهلاك</Button><Button variant="secondary" disabled={busy || balance >= included} onClick={() => run(() => adjustSubscriptionCredit(id, 1, 'استرجاع جلسة يدوي'), 'سُجّل استرجاع الجلسة.')}>استرجاع</Button></div>
    <ActionFeedback feedback={feedback} />
  </div>
}

export function SubscriptionCreate() {
  const { busy, feedback, run } = useAdminAction()
  const [formVersion,setFormVersion]=useState(0)
  return <form className="space-y-5 rounded-2xl border border-line bg-surface-raised p-6" aria-busy={busy} onSubmit={async event => {
    event.preventDefault()
    const form = event.currentTarget, data = new FormData(form)
    if (await run(() => createSubscription(data), 'تم إنشاء الاشتراك بالحالة المختارة.')) {form.reset();setFormVersion(version=>version+1)}
  }}>
    <fieldset key={formVersion} disabled={busy} className="grid gap-5 md:grid-cols-2">
      <legend className="mb-5 font-heading text-2xl text-deep-teal">إضافة اشتراك يدوي</legend>
      <AdminChoicePicker kind="customer" name="user_id" label="صاحبة الاشتراك" required/>
      <AdminChoicePicker kind="plan" name="plan_id" label="الباقة المعتمدة" required/>
      <AdminSelect  label={`الحالة`} name="status" required hint="التفعيل يتيح حقوق الباقة للعميلة. الانتظار يُنشئ سجلًا دون تفعيل الحقوق، ولا ينشئ دفعًا تلقائيًا." example="بانتظار التفعيل حتى اعتماد الاستحقاق"><option value="active">نشط</option><option value="pending">بانتظار التفعيل</option></AdminSelect>
      <AdminField  label={`ملاحظات داخلية`} name="admin_notes" maxLength={4000}/>
    </fieldset>
    <ActionFeedback feedback={feedback} />
    <Button type="submit" disabled={busy}>{busy ? 'جاري الإنشاء…' : 'إنشاء الاشتراك'}</Button>
  </form>
}
