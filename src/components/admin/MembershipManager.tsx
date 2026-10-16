'use client'

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

function PlanForm({ plan, services, packageProducts }: { plan?: PlanAdmin; services: { id: string; title: string }[]; packageProducts: { id: string; title: string }[] }) {
  const { busy, feedback, run } = useAdminAction()
  const input = 'min-h-12 w-full rounded-xl border border-line bg-surface-raised px-4 py-2 text-ink focus:border-deep-teal focus:outline-2 focus:outline-deep-teal/15'
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
    ].map(([name,label,type,value]) => <label key={String(name)} htmlFor={`${prefix}-${name}`} className="flex flex-col gap-1.5 text-sm font-semibold text-deep-teal">
      {label}<input id={`${prefix}-${name}`} name={String(name)} type={String(type)} defaultValue={value} min={type === 'number' ? 0 : undefined} step={name === 'price' ? '0.01' : undefined} required={['title','slug','price','duration_days'].includes(String(name))} className={input} dir={['slug','currency'].includes(String(name)) ? 'ltr' : 'rtl'} />
    </label>)}
    <label className="flex flex-col gap-1.5 text-sm font-semibold text-deep-teal">دورية الباقة
      <select name="billing_interval" defaultValue={plan?.billing_interval ?? 'month'} className={input}>
        <option value="month">شهري</option><option value="quarter">ربع سنوي</option><option value="year">سنوي</option><option value="one_time">مرة واحدة</option>
      </select>
    </label>
    <label className="flex flex-col gap-1.5 text-sm font-semibold text-deep-teal">منتج الشراء المرتبط
      <select name="product_id" defaultValue={plan?.product_id ?? ''} className={input}><option value="">تفعيل إداري فقط</option>{packageProducts.map(product=><option key={product.id} value={product.id}>{product.title}</option>)}</select>
      <span className="text-sm font-normal text-text-soft">عند دفع هذا المنتج تُفعّل الباقة تلقائيًا.</span>
    </label>
    <label className="flex flex-col gap-1.5 text-sm font-semibold text-deep-teal">تبدأ في — توقيت القاهرة
      <input name="starts_at" type="datetime-local" defaultValue={(plan?.starts_at ? formatCairoLocalDateTime(plan.starts_at) : '') ?? ''} className={input} dir="ltr" />
    </label>
    <label className="flex flex-col gap-1.5 text-sm font-semibold text-deep-teal">تنتهي في — توقيت القاهرة
      <input name="ends_at" type="datetime-local" defaultValue={(plan?.ends_at ? formatCairoLocalDateTime(plan.ends_at) : '') ?? ''} className={input} dir="ltr" />
    </label>
    <label className="flex flex-col gap-1.5 text-sm font-semibold text-deep-teal md:col-span-2">الوصف
      <textarea name="description" rows={3} defaultValue={plan?.description} className={input} />
    </label>
    <label className="flex flex-col gap-1.5 text-sm font-semibold text-deep-teal md:col-span-2">المزايا — ميزة في كل سطر
      <textarea name="features" rows={5} defaultValue={plan?.features.join('\n')} className={input} />
    </label>
    <p className="text-sm leading-loose text-text-soft md:col-span-2">تعديل المدة والجلسات والخدمات يطبّق على الاشتراكات الجديدة. الاشتراكات القائمة تحتفظ بالحقوق المسجلة لها. أوقفي نشر منتج الشراء المرتبط قبل تعديل الباقة.</p>
    <fieldset className="space-y-3 rounded-xl border border-line bg-ivory/50 p-4 md:col-span-2">
      <legend className="px-2 text-sm font-bold text-deep-teal">الخدمات التي يمكن حجزها برصيد هذه الباقة</legend>
      {services.length === 0 ? <p className="text-sm text-text-soft">أضيفي خدمة نشطة أولًا، ثم اربطيها بالباقة.</p> : <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => <label key={service.id} className="flex min-h-12 items-center gap-2 rounded-lg border border-line bg-surface-raised px-3 text-sm text-ink">
          <input type="checkbox" name="eligible_service_ids" value={service.id} defaultChecked={plan?.eligibleServiceIds.includes(service.id)} className="accent-deep-teal" />
          {service.title}
        </label>)}
      </div>}
    </fieldset>
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
    <label className="grid gap-2 text-sm font-semibold text-deep-teal">حالة الاشتراك
      <select value={status} disabled={busy} onChange={event => { const value = event.target.value; void run(() => updateSubscriptionStatus(id, value), 'حُدّثت حالة الاشتراك.') }} className="min-h-12 rounded-xl border border-line bg-surface-raised px-3 text-base text-ink">
        <option value="pending">بانتظار التفعيل</option><option value="active">نشط</option><option value="paused">موقوف مؤقتًا</option><option value="cancelled">ملغي</option><option value="expired">منتهي</option>
      </select>
    </label>
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

export function SubscriptionCreate({ plans, customers }: { plans: { id: string; title: string }[]; customers: { id: string; name: string; email: string }[] }) {
  const { busy, feedback, run } = useAdminAction()
  const input = 'min-h-12 w-full rounded-xl border border-line bg-surface-raised px-3 text-base text-ink'
  return <form className="space-y-5 rounded-2xl border border-line bg-surface-raised p-6" aria-busy={busy} onSubmit={async event => {
    event.preventDefault()
    const form = event.currentTarget, data = new FormData(form)
    if (await run(() => createSubscription(data), 'تم إنشاء الاشتراك بالحالة المختارة.')) form.reset()
  }}>
    <fieldset disabled={busy} className="grid gap-5 md:grid-cols-2">
      <legend className="mb-5 font-heading text-2xl text-deep-teal">إضافة اشتراك يدوي</legend>
      <label className="grid gap-2 text-sm font-bold text-deep-teal">العميلة<select name="user_id" required className={input}><option value="">اختاري العميلة</option>{customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name} — {customer.email}</option>)}</select></label>
      <label className="grid gap-2 text-sm font-bold text-deep-teal">الباقة<select name="plan_id" required className={input}><option value="">اختاري الباقة</option>{plans.map(plan => <option key={plan.id} value={plan.id}>{plan.title}</option>)}</select></label>
      <label className="grid gap-2 text-sm font-bold text-deep-teal">الحالة<select name="status" className={input}><option value="active">نشط</option><option value="pending">بانتظار التفعيل</option></select></label>
      <label className="grid gap-2 text-sm font-bold text-deep-teal">ملاحظات داخلية<input name="admin_notes" maxLength={4000} className={input} /></label>
    </fieldset>
    <ActionFeedback feedback={feedback} />
    <Button type="submit" disabled={busy || !plans.length || !customers.length}>{busy ? 'جاري الإنشاء…' : 'إنشاء الاشتراك'}</Button>
  </form>
}
