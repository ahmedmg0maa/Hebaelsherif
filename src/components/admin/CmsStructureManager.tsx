'use client'
import {AdminField,AdminSelect} from './AdminField'
import {ProseContentFields} from './ProseContentFields'
import {MediaPickerField} from './MediaPickerField'
import type {MediaOption} from '@/lib/data/cms'

import {useAdminAction} from './useAdminAction'
import {ActionFeedback} from './ActionFeedback'
import { createCmsPage, deleteNavigationItem, deletePageSection, saveCmsPage, saveNavigationItem, savePageSection } from '@/lib/actions/cms'
import { Button } from '@/components/ui/Button'
import { formatCairoLocalDateTime } from '@/lib/booking/cairo-time'

const sectionKinds = [
  ['hero', 'واجهة رئيسية'], ['intro', 'مقدمة'], ['pathways', 'مسارات'],
  ['featured_services', 'خدمات مميزة'], ['books', 'كتب'], ['courses', 'دورات'],
  ['workshops', 'ورش'], ['availability_preview', 'مواعيد متاحة'], ['testimonials', 'آراء موثقة'],
  ['press', 'ظهور إعلامي'], ['articles', 'مقالات'], ['resources', 'موارد'],
  ['newsletter', 'نشرة'], ['cta', 'دعوة لاتخاذ إجراء'], ['rich_text', 'نص منظم'],
] as const

function Status({ value }: { value: string }) {
  return <AdminSelect label="حالة الصفحة" name="status" defaultValue={value} required><option value="draft">مسودة</option><option value="scheduled">مجدولة</option><option value="published">منشورة</option><option value="archived">مؤرشفة</option></AdminSelect>
}

export function CmsPageCreator() {
  const {busy,feedback,run}=useAdminAction()
  return <form className="grid gap-3 rounded-2xl border border-antique-gold/30 bg-surface-raised p-5 sm:grid-cols-[1fr_1fr_auto]" onSubmit={async (event) => {
    event.preventDefault();const form=event.currentTarget,data=new FormData(form);if(await run(()=>createCmsPage(data),'أُنشئت الصفحة كمسودة.'))form.reset()
  }} aria-busy={busy}>
    <fieldset disabled={busy} className="contents">
    <AdminField label="عنوان الصفحة" name="title" required minLength={3} maxLength={160} />
    <AdminField label="رابط الصفحة المختصر" name="slug" required minLength={3} maxLength={80} dir="ltr" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" />
    <Button type="submit" size="sm" disabled={busy}>إنشاء مسودة</Button>
    <ActionFeedback feedback={feedback} className="sm:col-span-3" />
    </fieldset>
  </form>
}

export function CmsPageEditor({ page,media=[] }: { media?:MediaOption[]; page: { id: string; title: string; status: string; publish_at: string | null; seo_title: string | null; seo_description: string | null; canonical_url: string | null; og_image_url: string | null; legal_review_status: string; legal_version: string | null; effective_at: string | null } }) {
  const {busy,feedback,run}=useAdminAction()
  return <form className="grid gap-3 md:grid-cols-2" onSubmit={async (event) => {
    event.preventDefault();const data=new FormData(event.currentTarget);await run(()=>saveCmsPage(page.id,data),'حُفظت الصفحة ونسخة المراجعة.')
  }} aria-busy={busy}>
    <fieldset disabled={busy} className="contents">
    <AdminField label="عنوان الصفحة" name="title" required minLength={3} maxLength={160} defaultValue={page.title} />
    <Status value={page.status} />
    <AdminField label="موعد النشر بتوقيت القاهرة" name="publish_at" type="datetime-local" defaultValue={page.publish_at ? formatCairoLocalDateTime(page.publish_at) ?? '' : ''} />
    <AdminField label="الرابط الأساسي للصفحة في البحث" name="canonical_url" maxLength={500} pattern="https://.*" defaultValue={page.canonical_url ?? ''} dir="ltr" />
    <AdminField label="عنوان نتائج البحث" name="seo_title" maxLength={70} defaultValue={page.seo_title ?? ''} />
    <AdminField label="وصف نتائج البحث" name="seo_description" maxLength={180} defaultValue={page.seo_description ?? ''} />
    <MediaPickerField label="صورة مشاركة الصفحة" assets={media} name="og_image_url" assetName="og_image_asset_id" defaultValue={page.og_image_url}/>
    <AdminSelect label="مراجعة السياسة القانونية" name="legal_review_status" defaultValue={page.legal_review_status} required hint="لا يُسمح بنشر صفحة قانونية قبل اعتماد مراجعتها وتحديد الإصدار وتاريخ السريان." example="بانتظار المراجعة حتى اعتماد النص"><option value="not_applicable">ليست صفحة قانونية</option><option value="draft">مسودة قانونية</option><option value="pending">بانتظار المراجعة</option><option value="approved">معتمدة</option></AdminSelect>
    <AdminField label="إصدار السياسة" name="legal_version" maxLength={40} defaultValue={page.legal_version ?? ''} />
    <AdminField className="text-xs font-semibold text-deep-teal md:col-span-2" label="تاريخ السريان" name="effective_at" type="date" defaultValue={page.effective_at ?? ''} />
    <ActionFeedback feedback={feedback} className="md:col-span-2" />
    <Button type="submit" size="sm" disabled={busy}>حفظ الصفحة</Button>
    </fieldset>
  </form>
}

export function CmsSectionEditor({ pageId, section }: { pageId: string; section?: { id: string; name: string; kind: string; sort: number; is_visible: boolean; content: unknown } }) {
  const {busy,feedback,run}=useAdminAction()
  return <form className="grid gap-2 rounded-xl border border-line p-3" onSubmit={async (event) => {
    event.preventDefault();const data=new FormData(event.currentTarget);await run(()=>savePageSection(pageId,section?.id??null,data),'حُفظ القسم ونسخة المراجعة.')
  }} aria-busy={busy}>
    <fieldset disabled={busy} className="contents">
    <div className="grid gap-2 sm:grid-cols-3">
      <AdminField label="اسم القسم داخل الإدارة" name="name" required minLength={2} maxLength={100} defaultValue={section?.name ?? ''} />
      <AdminSelect label="نوع القسم" name="kind" defaultValue={section?.kind??'rich_text'} required>{sectionKinds.filter(([value])=>['intro','rich_text',section?.kind].includes(value)).map(([value,label])=><option key={value} value={value}>{label}</option>)}</AdminSelect>
      <AdminField label="ترتيب الظهور" name="sort" type="number" min="0" max="1000" step="1" defaultValue={section?.sort ?? 0} />
    </div>
<ProseContentFields initial={section?.content??{heading:'',body:''}}/>
    <p className="text-[11px] text-text-soft">راجعي معاينة النص قبل الحفظ. الإخفاء يحتفظ بالقسم، ويمكن إظهاره لاحقًا دون إعادة كتابته.</p>
    <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="is_visible" defaultChecked={section?.is_visible ?? true} />ظاهر <span className="text-sm text-text-soft">اختياري · أزيلي العلامة للإخفاء مع الاحتفاظ بالبيانات. أعيديها لاستعادة الظهور بعد الحفظ.</span></label>
    <div className="flex flex-wrap gap-2">
      <Button type="submit" size="sm" disabled={busy}>حفظ القسم</Button>
      {section && <Button type="button" size="sm" variant="burgundy" disabled={busy} onClick={async () => {
        if (!window.confirm(`حذف قسم «${section.name}»؟ ستُحفظ نسخة مراجعة قبل الحذف.`)) return
        await run(()=>deletePageSection(pageId,section.id),'حُذف القسم مع حفظ نسخة المراجعة وسجل العملية.')
      }}>حذف</Button>}
    </div>
    <ActionFeedback feedback={feedback} />
    </fieldset>
  </form>
}

export function NavigationEditor({ item }: { item?: { id: string; menu: string; label: string; href: string; sort: number; is_visible: boolean } }) {
  const {busy,feedback,run}=useAdminAction()
  return <form className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-5" onSubmit={async (event) => {
    event.preventDefault();const data=new FormData(event.currentTarget);await run(()=>saveNavigationItem(item?.id??null,data),'حُفظ الرابط.')
  }} aria-busy={busy}>
    <fieldset disabled={busy} className="contents">
    <AdminSelect label="مكان ظهور الرابط" name="menu" defaultValue={item?.menu??'header'} required hint="اختاري قائمة الرأس أو مجموعة التذييل المناسبة للصفحة." example="الرأس لرابط رئيسي يسهل الوصول إليه"><option value="header">الرأس</option><option value="footer_platform">تذييل المنصة</option><option value="footer_about">تذييل التعريف</option><option value="footer_legal">تذييل قانوني</option></AdminSelect>
    <AdminField label="اسم الرابط في القائمة" name="label" required minLength={2} maxLength={80} defaultValue={item?.label ?? ''} />
    <AdminField label="وجهة الرابط الداخلية" name="href" required maxLength={180} pattern="/(?!/).*" defaultValue={item?.href ?? ''} dir="ltr" />
    <AdminField label="ترتيب الظهور" name="sort" type="number" min="0" max="1000" step="1" defaultValue={item?.sort ?? 0} />
    <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="is_visible" defaultChecked={item?.is_visible ?? true} />ظاهر <span className="text-sm text-text-soft">اختياري · أزيلي العلامة للإخفاء مع الاحتفاظ بالبيانات. أعيديها لاستعادة الظهور بعد الحفظ.</span></label>
    <div className="flex flex-wrap gap-2 sm:col-span-5">
      <Button type="submit" size="sm" disabled={busy}>حفظ</Button>
      {item && <Button type="button" size="sm" variant="burgundy" disabled={busy} onClick={async () => {
        if (!window.confirm(`حذف رابط «${item.label}» من القوائم؟`)) return
        await run(()=>deleteNavigationItem(item.id),'حُذف الرابط من القائمة؛ بقيت الصفحة المرتبطة كما هي.')
      }}>حذف</Button>}
      <ActionFeedback feedback={feedback} />
    </div>
    </fieldset>
  </form>
}
