'use client'

import { useState } from 'react'
import { createCmsPage, deleteNavigationItem, deletePageSection, saveCmsPage, saveNavigationItem, savePageSection } from '@/lib/actions/cms'
import { Button } from '@/components/ui/Button'
import { formatCairoLocalDateTime } from '@/lib/booking/cairo-time'

const input = 'min-h-10 w-full rounded-xl border border-line bg-surface-raised px-3 py-2 text-sm text-ink'
const sectionKinds = [
  ['hero', 'واجهة رئيسية'], ['intro', 'مقدمة'], ['pathways', 'مسارات'],
  ['featured_services', 'خدمات مميزة'], ['books', 'كتب'], ['courses', 'دورات'],
  ['workshops', 'ورش'], ['availability_preview', 'مواعيد متاحة'], ['testimonials', 'آراء موثقة'],
  ['press', 'ظهور إعلامي'], ['articles', 'مقالات'], ['resources', 'موارد'],
  ['newsletter', 'نشرة'], ['cta', 'دعوة لاتخاذ إجراء'], ['rich_text', 'نص منظم'],
] as const

function Feedback({ message, failed, className = '' }: { message: string | null; failed: boolean; className?: string }) {
  return message ? <p role={failed ? 'alert' : 'status'} aria-live="polite" className={`text-xs font-semibold text-deep-teal ${className}`}>{message}</p> : null
}

function Status({ value }: { value: string }) {
  return <select name="status" defaultValue={value} className={input}><option value="draft">مسودة</option><option value="scheduled">مجدولة</option><option value="published">منشورة</option><option value="archived">مؤرشفة</option></select>
}

export function CmsPageCreator() {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  return <form className="grid gap-3 rounded-2xl border border-antique-gold/30 bg-surface-raised p-5 sm:grid-cols-[1fr_1fr_auto]" onSubmit={async (event) => {
    event.preventDefault(); const form = event.currentTarget; setBusy(true)
    const result = await createCmsPage(new FormData(form)); setFailed(!result.ok)
    setMessage(result.ok ? 'أُنشئت الصفحة كمسودة.' : result.error); if (result.ok) form.reset(); setBusy(false)
  }}>
    <input name="title" required minLength={3} maxLength={160} placeholder="عنوان الصفحة" className={input} />
    <input name="slug" required minLength={3} maxLength={80} dir="ltr" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="page-slug" className={input} />
    <Button type="submit" size="sm" disabled={busy}>إنشاء مسودة</Button>
    <Feedback message={message} failed={failed} className="sm:col-span-3" />
  </form>
}

export function CmsPageEditor({ page }: { page: { id: string; title: string; status: string; publish_at: string | null; seo_title: string | null; seo_description: string | null; canonical_url: string | null; og_image_url: string | null; legal_review_status: string; legal_version: string | null; effective_at: string | null } }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  return <form className="grid gap-3 md:grid-cols-2" onSubmit={async (event) => {
    event.preventDefault(); setBusy(true); const result = await saveCmsPage(page.id, new FormData(event.currentTarget))
    setFailed(!result.ok); setMessage(result.ok ? 'حُفظت الصفحة ونسخة المراجعة.' : result.error); setBusy(false)
  }}>
    <input name="title" required minLength={3} maxLength={160} defaultValue={page.title} className={input} />
    <Status value={page.status} />
    <label className="text-xs font-semibold text-deep-teal">موعد النشر بتوقيت القاهرة<input name="publish_at" type="datetime-local" defaultValue={page.publish_at ? formatCairoLocalDateTime(page.publish_at) ?? '' : ''} className={input} /></label>
    <input name="canonical_url" maxLength={500} pattern="https://.*" defaultValue={page.canonical_url ?? ''} placeholder="Canonical URL (HTTPS)" dir="ltr" className={input} />
    <input name="seo_title" maxLength={70} defaultValue={page.seo_title ?? ''} placeholder="عنوان SEO" className={input} />
    <input name="seo_description" maxLength={180} defaultValue={page.seo_description ?? ''} placeholder="وصف SEO" className={input} />
    <input name="og_image_url" maxLength={500} pattern="https://.*" defaultValue={page.og_image_url ?? ''} placeholder="صورة المشاركة (HTTPS)" dir="ltr" className={`${input} md:col-span-2`} />
    <select name="legal_review_status" defaultValue={page.legal_review_status} className={input}><option value="not_applicable">ليست صفحة قانونية</option><option value="draft">مسودة قانونية</option><option value="pending">بانتظار المراجعة</option><option value="approved">معتمدة</option></select>
    <input name="legal_version" maxLength={40} defaultValue={page.legal_version ?? ''} placeholder="إصدار السياسة" className={input} />
    <label className="text-xs font-semibold text-deep-teal md:col-span-2">تاريخ السريان<input name="effective_at" type="date" defaultValue={page.effective_at ?? ''} className={input} /></label>
    <Feedback message={message} failed={failed} className="md:col-span-2" />
    <Button type="submit" size="sm" disabled={busy}>حفظ الصفحة</Button>
  </form>
}

export function CmsSectionEditor({ pageId, section }: { pageId: string; section?: { id: string; name: string; kind: string; sort: number; is_visible: boolean; content: unknown } }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  return <form className="grid gap-2 rounded-xl border border-line p-3" onSubmit={async (event) => {
    event.preventDefault(); setBusy(true); const result = await savePageSection(pageId, section?.id ?? null, new FormData(event.currentTarget))
    setFailed(!result.ok); setMessage(result.ok ? 'حُفظ القسم ونسخة المراجعة ذريًا.' : result.error); setBusy(false)
  }}>
    <div className="grid gap-2 sm:grid-cols-3">
      <input name="name" required minLength={2} maxLength={100} defaultValue={section?.name ?? ''} placeholder="اسم القسم" className={input} />
      <select name="kind" defaultValue={section?.kind ?? 'rich_text'} className={input}>{sectionKinds.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <input name="sort" type="number" min="0" max="1000" step="1" defaultValue={section?.sort ?? 0} className={input} />
    </div>
    <textarea name="content" required rows={5} maxLength={65536} defaultValue={JSON.stringify(section?.content ?? { heading: '', body: '' }, null, 2)} dir="ltr" className={`${input} font-mono text-xs`} />
    <p className="text-[11px] text-text-soft">المكوّنات ثابتة وآمنة؛ الروابط الداخلية تبدأ بـ / والخارجية تستخدم HTTPS فقط.</p>
    <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="is_visible" defaultChecked={section?.is_visible ?? true} />ظاهر</label>
    <div className="flex flex-wrap gap-2">
      <Button type="submit" size="sm" disabled={busy}>حفظ القسم</Button>
      {section && <Button type="button" size="sm" variant="burgundy" disabled={busy} onClick={async () => {
        if (!window.confirm(`حذف قسم «${section.name}»؟ ستُحفظ نسخة مراجعة قبل الحذف.`)) return
        setBusy(true); const result = await deletePageSection(pageId, section.id); setFailed(!result.ok)
        setMessage(result.ok ? 'حُذف القسم مع حفظ المراجعة والتدقيق.' : result.error); setBusy(false)
      }}>حذف</Button>}
    </div>
    <Feedback message={message} failed={failed} />
  </form>
}

export function NavigationEditor({ item }: { item?: { id: string; menu: string; label: string; href: string; sort: number; is_visible: boolean } }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  return <form className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-5" onSubmit={async (event) => {
    event.preventDefault(); setBusy(true); const result = await saveNavigationItem(item?.id ?? null, new FormData(event.currentTarget))
    setFailed(!result.ok); setMessage(result.ok ? 'حُفظ الرابط.' : result.error); setBusy(false)
  }}>
    <select name="menu" defaultValue={item?.menu ?? 'header'} className={input}><option value="header">الرأس</option><option value="footer_platform">تذييل المنصة</option><option value="footer_about">تذييل التعريف</option><option value="footer_legal">تذييل قانوني</option></select>
    <input name="label" required minLength={2} maxLength={80} defaultValue={item?.label ?? ''} placeholder="العنوان" className={input} />
    <input name="href" required maxLength={180} pattern="/(?!/).*" defaultValue={item?.href ?? ''} placeholder="/path" dir="ltr" className={input} />
    <input name="sort" type="number" min="0" max="1000" step="1" defaultValue={item?.sort ?? 0} className={input} />
    <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="is_visible" defaultChecked={item?.is_visible ?? true} />ظاهر</label>
    <div className="flex flex-wrap gap-2 sm:col-span-5">
      <Button type="submit" size="sm" disabled={busy}>حفظ</Button>
      {item && <Button type="button" size="sm" variant="burgundy" disabled={busy} onClick={async () => {
        if (!window.confirm(`حذف رابط «${item.label}» من القوائم؟`)) return
        setBusy(true); const result = await deleteNavigationItem(item.id); setFailed(!result.ok)
        setMessage(result.ok ? 'حُذف الرابط.' : result.error); setBusy(false)
      }}>حذف</Button>}
      <Feedback message={message} failed={failed} />
    </div>
  </form>
}
