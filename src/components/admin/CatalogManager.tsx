'use client'

import { useState } from 'react'
import { AdminField, AdminSelect, AdminTextarea } from './AdminField'
import { CatalogScheduleControl } from './CatalogScheduleControl'
import { CatalogSavedPreview } from './CatalogSavedPreview'
import { formatCairoLocalDateTime } from '@/lib/booking/cairo-time'
import { AdminEditorDialog } from '@/components/admin/AdminEditorDialog'
import { ActionFeedback } from '@/components/admin/ActionFeedback'
import { useAdminAction } from '@/components/admin/useAdminAction'
import { changeCatalogLifecycle, deleteCatalogItem, saveCatalogItem } from '@/lib/actions/admin-control'
import { Button } from '@/components/ui/Button'
import { MediaPickerField } from '@/components/admin/MediaPickerField'
import type { MediaOption } from '@/lib/data/cms'

export type CatalogAdminItem = {
  id: string
  title: string
  slug: string
  description?: string
  subtitle?: string | null
  price: number
  compareAtPrice?: number | null
  currency?: string
  coverUrl?: string | null
  sort?: number
  isPublished: boolean
  archivedAt?:string|null
  level?: string
  durationMinutes?: number
  bookingPaymentMode?: 'payment_required' | 'free' | 'request'
  bufferBeforeMinutes?: number | null
  bufferAfterMinutes?: number | null
  minimumNoticeMinutes?: number | null
  bookingWindowDays?: number | null
  holdMinutes?: number
  cancellationNoticeHours?: number | null
  rescheduleNoticeHours?: number | null
  maxReschedules?: number
  bookingPolicyNote?: string
  author?: string
  pagesCount?: number | null
  startsAt?: string
  endsAt?: string
  seatsTotal?: number
  locationKind?: string
  locationText?: string | null
  meetingUrl?: string | null
}

type Kind = 'course' | 'book' | 'workshop' | 'service'

const labels: Record<Kind, { singular: string; create: string }> = {
  course: { singular: 'الدورة', create: 'إضافة دورة جديدة' },
  book: { singular: 'الكتاب', create: 'إضافة كتاب جديد' },
  workshop: { singular: 'الورشة', create: 'إضافة ورشة جديدة' },
  service: { singular: 'الخدمة', create: 'إضافة خدمة جلسة' },
}

const publicationRequirements: Record<Kind, string[]> = {
  course: [
    'عنوان ورابط ووصف واضح وسعر وعملة.',
    'غلاف من مكتبة الوسائط مع إثبات الحقوق.',
    'مدة ووحدة ودرس واحد على الأقل، وكل درس يملك فيديوًا أو نصًا تعليميًا كافيًا.',
  ],
  book: [
    'عنوان ورابط ووصف واضح وسعر وعملة وعدد صفحات.',
    'غلاف من مكتبة الوسائط مع إثبات الحقوق.',
    'نسخة كتاب نشطة وملف تسليم محمي مكتمل الفحص.',
  ],
  workshop: [
    'عنوان ورابط ووصف واضح وسعر وعملة.',
    'غلاف موثّق الحقوق وموعد مستقبلي ونهاية لاحقة للبداية.',
    'سعة موجبة ومكان أو رابط لقاء صالح حسب نوع الحضور.',
  ],
  service: [
    'عنوان ورابط ووصف واضح وسعر وعملة ومدة جلسة.',
    'غلاف موثّق الحقوق وسياسة حجز متسقة مع وضع الدفع.',
    'قاعدة توافر منشورة واحدة على الأقل قبل إتاحة الحجز.',
  ],
}

function PublicationChecklist({ kind }: { kind: Kind }) {
  return <details className="rounded-xl border border-antique-gold/30 bg-antique-gold/5 p-4">
    <summary className="cursor-pointer font-bold text-deep-teal">قائمة الجاهزية قبل النشر</summary>
    <p className="mt-2 text-sm leading-6 text-text-soft">يعيد الخادم فحص هذه الشروط وبيانات الربط عند كل محاولة نشر؛ لا يكفي تحديد مربع النشر.</p>
    <ul className="mt-2 list-disc space-y-1 pe-5 text-sm leading-6 text-ink">
      {publicationRequirements[kind].map((requirement) => <li key={requirement}>{requirement}</li>)}
    </ul>
  </details>
}

function Field({prefix,defaultValue,...props}: {prefix:string;label:string;name:string;defaultValue?:string|number|null;type?:string;required?:boolean;min?:number;step?:number|string;dir?:'ltr'|'rtl'}) {
 const limits:Record<string,{max?:number;maxLength?:number;minLength?:number}>={title:{minLength:2,maxLength:180},slug:{minLength:3,maxLength:80},subtitle:{maxLength:240},currency:{minLength:3,maxLength:3},duration_minutes:{max:props.min===15?1440:100000},buffer_before_minutes:{max:525600},buffer_after_minutes:{max:525600},minimum_notice_minutes:{max:525600},booking_window_days:{max:365},hold_minutes:{max:30},max_reschedules:{max:12}}
 return <AdminField {...props} {...limits[props.name]} id={`${prefix}-${props.name}`} defaultValue={defaultValue??''}/>
}
function Select({prefix,...props}: {prefix:string;label:string;name:string;defaultValue?:string;options:{value:string;label:string}[]}) {
 return <AdminSelect {...props} id={`${prefix}-${props.name}`} required/>
}

function CatalogForm({ kind, item, onDone, media = [], controller }: { kind: Kind; item?: CatalogAdminItem; onDone?: () => void; media?: MediaOption[]; controller?: ReturnType<typeof useAdminAction> }) {
  const prefix = `${kind}-${item?.id ?? 'new'}`
  const ownController = useAdminAction()
  const { busy, feedback, run } = controller ?? ownController
  const [formVersion, setFormVersion] = useState(0)
  return (
    <form className="grid gap-5" aria-busy={busy} onSubmit={async (event) => {
      event.preventDefault()
      const data = new FormData(event.currentTarget)
      if (await run(() => saveCatalogItem(kind, item?.id ?? null, data))) {
        if (!item) setFormVersion(version => version + 1)
        onDone?.()
      }
    }}>
      <fieldset key={formVersion} disabled={busy} className="grid min-w-0 gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field prefix={prefix} label="العنوان" name="title" defaultValue={item?.title} required />
        <Field prefix={prefix} label="رابط الصفحة المختصر" name="slug" defaultValue={item?.slug} required dir="ltr" />
        <Field prefix={prefix} label="العنوان الفرعي" name="subtitle" defaultValue={item?.subtitle} />
        <MediaPickerField assets={media} defaultValue={item?.coverUrl} label={`غلاف ${labels[kind].singular}`} />
        <Field prefix={prefix} label="السعر" name="price" type="number" min={0} step="0.01" defaultValue={item?.price ?? 0} required />
        <Field prefix={prefix} label="السعر قبل الخصم" name="compare_at_price" type="number" min={0} step="0.01" defaultValue={item?.compareAtPrice} />
        <Field prefix={prefix} label="العملة" name="currency" defaultValue={item?.currency ?? 'EGP'} dir="ltr" />
        <Field prefix={prefix} label="الترتيب" name="sort" type="number" defaultValue={item?.sort ?? 0} />
      </div>

      <AdminTextarea label="الوصف والجمهور المناسب" name="description" id={`${prefix}-description`} rows={5} maxLength={30000} defaultValue={item?.description}/>

      {kind === 'course' && <div className="grid gap-4 md:grid-cols-2">
        <Select prefix={prefix} label="المستوى" name="level" defaultValue={item?.level ?? 'all'} options={[
          { value: 'all', label: 'كل المستويات' }, { value: 'beginner', label: 'مبتدئ' },
          { value: 'intermediate', label: 'متوسط' }, { value: 'advanced', label: 'متقدم' },
        ]} />
        <Field prefix={prefix} label="المدة بالدقائق" name="duration_minutes" type="number" min={0} defaultValue={item?.durationMinutes ?? 0} />
      </div>}

      {kind === 'book' && <div className="grid gap-4 md:grid-cols-2">
        <Field prefix={prefix} label="المؤلفة" name="author" defaultValue={item?.author ?? 'هبة الشريف'} />
        <Field prefix={prefix} label="عدد الصفحات" name="pages_count" type="number" min={1} defaultValue={item?.pagesCount} />
      </div>}

      {kind === 'service' && <>
        <div className="grid gap-4 md:grid-cols-2">
          <Field prefix={prefix} label="مدة الجلسة بالدقائق" name="duration_minutes" type="number" min={15} defaultValue={item?.durationMinutes ?? 60} required />
          <Select prefix={prefix} label="الدفع عند الحجز" name="booking_payment_mode" defaultValue={item?.bookingPaymentMode ?? 'payment_required'} options={[
            { value: 'payment_required', label: 'يتطلب وسيلة دفع مهيأة' },
            { value: 'request', label: 'طلب موعد بالسعر المحدد — مراجعة وتنسيق الدفع بعد الطلب' },
            { value: 'free', label: 'حجز مجاني بلا دفع' },
          ]} />
          <Field prefix={prefix} label="فاصل قبل الجلسة (دقائق)" name="buffer_before_minutes" type="number" min={0} defaultValue={item?.bufferBeforeMinutes} />
          <Field prefix={prefix} label="فاصل بعد الجلسة (دقائق)" name="buffer_after_minutes" type="number" min={0} defaultValue={item?.bufferAfterMinutes} />
          <Field prefix={prefix} label="أقل مهلة للحجز (دقائق)" name="minimum_notice_minutes" type="number" min={0} defaultValue={item?.minimumNoticeMinutes} />
          <Field prefix={prefix} label="نافذة الحجز (أيام)" name="booking_window_days" type="number" min={1} defaultValue={item?.bookingWindowDays} />
          <Field prefix={prefix} label="مدة تثبيت الموعد (دقائق)" name="hold_minutes" type="number" min={2} defaultValue={item?.holdMinutes ?? 10} />
          <Field prefix={prefix} label="مهلة الإلغاء الذاتي (ساعات)" name="cancellation_notice_hours" type="number" min={0} defaultValue={item?.cancellationNoticeHours} />
          <Field prefix={prefix} label="مهلة تغيير الموعد (ساعات)" name="reschedule_notice_hours" type="number" min={0} defaultValue={item?.rescheduleNoticeHours} />
          <Field prefix={prefix} label="الحد الأقصى للتغييرات" name="max_reschedules" type="number" min={0} defaultValue={item?.maxReschedules ?? 2} />
        </div>
        <AdminTextarea label="سياسة الحجز المعروضة للعميلة" name="booking_policy_note" maxLength={4000} defaultValue={item?.bookingPolicyNote} />
      </>}

      {kind === 'workshop' && <div className="grid gap-4 md:grid-cols-2">
        <Field prefix={prefix} label="تبدأ في — توقيت القاهرة" name="starts_at" type="datetime-local" defaultValue={(item?.startsAt ? formatCairoLocalDateTime(item.startsAt) : '') ?? ''} required dir="ltr" />
        <Field prefix={prefix} label="تنتهي في — توقيت القاهرة" name="ends_at" type="datetime-local" defaultValue={(item?.endsAt ? formatCairoLocalDateTime(item.endsAt) : '') ?? ''} required dir="ltr" />
        <Field prefix={prefix} label="عدد المقاعد" name="seats_total" type="number" min={0} defaultValue={item?.seatsTotal ?? 0} required />
        <Select prefix={prefix} label="نوع المكان" name="location_kind" defaultValue={item?.locationKind ?? 'online'} options={[
          { value: 'online', label: 'أونلاين' }, { value: 'in_person', label: 'حضوري' }, { value: 'hybrid', label: 'هجين' },
        ]} />
        <Field prefix={prefix} label="وصف المكان" name="location_text" defaultValue={item?.locationText} />
        <Field prefix={prefix} label="رابط اللقاء" name="meeting_url" defaultValue={item?.meetingUrl} dir="ltr" />
      </div>}

      <PublicationChecklist kind={kind} />
      <p className="text-sm leading-7 text-text-soft">حفظ النموذج دون اختيار النشر يحفظه مسودة مخفية. الإخفاء يوقف الظهور والطلبات الجديدة مع بقاء حقوق العميلات وسجلاتهن.</p>

      <label className="flex min-h-12 items-center gap-3 rounded-xl border border-line bg-ivory/55 px-4 text-sm font-bold text-deep-teal">
        <input type="checkbox" name="is_published" defaultChecked={item?.isPublished} className="h-4 w-4 accent-deep-teal" />
        {kind === 'service' ? 'الخدمة مفعّلة ومتاحة للحجز' : 'نشر العنصر فور الحفظ'}
      </label>

      </fieldset>
      <ActionFeedback feedback={feedback} />
      <Button type="submit" disabled={busy} className="justify-self-start">{busy ? 'جاري الحفظ…' : item ? `حفظ تعديلات ${labels[kind].singular}` : labels[kind].create}</Button>
    </form>
  )
}

export function CatalogCreatePanel({ kind, media = [] }: { kind: Kind; media?: MediaOption[] }) {
  return (
    <details className="group rounded-2xl border border-antique-gold/30 bg-surface-raised shadow-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 font-heading text-xl font-bold text-deep-teal">
        {labels[kind].create}
        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-antique-gold/30 text-antique-gold transition group-open:rotate-45">+</span>
      </summary>
      <div className="border-t border-line p-6"><CatalogForm kind={kind} media={media} /></div>
    </details>
  )
}

export function CatalogEditPanel({ kind, item, media = [] }: { kind: Kind; item: CatalogAdminItem; media?: MediaOption[] }) {
  const [confirmArchive,setConfirmArchive]=useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const controller = useAdminAction()
  const { busy: deleting, run } = controller
  return (
    <AdminEditorDialog title={`تعديل ${labels[kind].singular}: ${item.title}`} triggerLabel="تعديل وإدارة">
      <div className="space-y-5 border-t border-line p-4">
        <CatalogSavedPreview item={item}/>{kind!=='service'&&!item.archivedAt&&<CatalogScheduleControl kind={kind} id={item.id}/>}
        {item.archivedAt?<div className="rounded-xl bg-sand/25 p-5"><p className="mb-4 leading-loose text-text-soft">العنصر مؤرشف. تظل مشتريات العميلات وملفاتهن محفوظة. الاستعادة تعيده إلى المسودات دون نشر تلقائي.</p><Button disabled={deleting} onClick={()=>void run(()=>changeCatalogLifecycle(kind,item.id,'restore',item.archivedAt??null),'استُعيد إلى المسودات.')}>استعادة إلى المسودات</Button><ActionFeedback feedback={controller.feedback}/></div>:<><CatalogForm kind={kind} item={item} media={media} controller={controller}/><div className="rounded-xl border border-line p-4">{!confirmArchive?<Button variant="secondary" disabled={deleting} onClick={()=>setConfirmArchive(true)}>أرشفة وإيقاف البيع</Button>:<><p className="mb-3 text-sm leading-loose">توقف الأرشفة البيع والحجز الجديد، وتحتفظ بالمشتريات والمواعيد القائمة. يمكن استعادة العنصر لاحقًا إلى المسودات.</p><div className="flex flex-wrap gap-3"><Button disabled={deleting} onClick={async()=>{if(await run(()=>changeCatalogLifecycle(kind,item.id,'archive',null),'أُرشف العنصر.'))setConfirmArchive(false)}}>تأكيد الأرشفة</Button><Button variant="ghost" disabled={deleting} onClick={()=>setConfirmArchive(false)}>تراجع</Button></div></>}</div></>}
        <div className="border-t border-line pt-4">
          {!confirmDelete ? <Button size="sm" variant="burgundy" disabled={deleting} onClick={() => setConfirmDelete(true)}>حذف نهائي</Button> :
            <div className="rounded-xl border border-burgundy/25 bg-burgundy/5 p-3">
              <p className="text-sm font-semibold text-burgundy">سيُحذف العنصر وكل تفاصيله. الطلبات السابقة تمنع الحذف حفاظًا على السجلات.</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="burgundy" disabled={deleting} onClick={async () => {
                  if (await run(() => deleteCatalogItem(kind, item.id), 'حُذف العنصر.')) setConfirmDelete(false)
                }}>{deleting ? 'جاري الحذف…' : 'تأكيد الحذف'}</Button>
                <Button size="sm" variant="ghost" disabled={deleting} onClick={() => setConfirmDelete(false)}>تراجع</Button>
              </div>

            </div>}
        </div>
      </div>
    </AdminEditorDialog>
  )
}
