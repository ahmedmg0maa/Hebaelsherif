'use client'
import Link from 'next/link'
import {AdminChoicePicker} from './AdminChoicePicker'
import {AdminField,AdminTextarea} from './AdminField'

import { HomeMediaFields } from './HomeMediaFields'
import type { MediaOption } from '@/lib/data/cms'
import { normalizeHomeMedia, mediaSlots } from '@/lib/home/media'
import { useState } from 'react'
import { createHomeSection, deletePageSection, saveHomeSection } from '@/lib/actions/cms'
import { Button } from '@/components/ui/Button'
import { HERO_FIELDS, normalizeHomeCopy } from '@/lib/home/hero'
import {
  HOME_SECTION_OPTIONS,
  isHomeSectionKind,
  normalizeHomeContent,
  type ArticlesContent,
  type CtaContent,
  type EditorialFeatureContent,
  type GuidedStartContent,
  type HomeSectionKind,
  type NewsletterContent,
  type PathwaysContent,
  type PressContent,
  type TestimonialsContent,
  type NarrativeContent,
} from '@/lib/home/sections'

type ArticleOption = { slug: string; title: string }
type SectionRow = { id: string; name: string; kind: string; sort: number; is_visible: boolean; content: unknown }
const input = 'min-h-10 w-full rounded-xl border border-line bg-surface-raised px-3 py-2 text-sm text-ink'

function Field({ label, name, value, area = false, max = 500 }: { label: string; name: string; value: string; area?: boolean; max?: number }) {
  const props={label,name,defaultValue:value,maxLength:max,required:true}
  return area?<AdminTextarea {...props} rows={3}/>:<AdminField {...props}/>
}

function PathwayFields({ data, assets, media }: { data: PathwaysContent; assets: MediaOption[]; media: ReturnType<typeof normalizeHomeMedia> }) {
  const [count, setCount] = useState(data.items.length)
  const items = [...data.items, { title: 'ورش العمل', text: 'تابعي الورش المنشورة ومواعيدها وتفاصيل المشاركة.', href: '/workshops', cta: 'استكشفي الورش' }].slice(0, count)
  return <>
    <input type="hidden" name="item_count" value={count} />
    <div className="grid gap-2 md:grid-cols-3"><Field label="السطر التعريفي" name="eyebrow" value={data.eyebrow} /><Field label="العنوان" name="heading" value={data.heading} /><Field label="الوصف" name="lead" value={data.lead} /></div>
    <div className="grid gap-3 md:grid-cols-2">{items.map((item, index) => <div key={index} className="grid gap-2 rounded-xl border border-line p-3"><Field label={`اسم المسار ${index + 1}`} name={`item_title_${index}`} value={item.title} max={70} /><Field label="الوصف" name={`item_text_${index}`} value={item.text} area max={180} /><LinkField label="الرابط الداخلي" name={`item_href_${index}`} value={item.href} /><Field label="نص الإجراء" name={`item_cta_${index}`} value={item.cta} max={60} /><HomeMediaFields slot={`portal${index}`} value={media[`portal${index}`]} assets={assets} /></div>)}</div>
    <Button type="button" variant="secondary" size="sm" onClick={() => { if (count === 4 && !window.confirm('إخفاء المسار الرابع من هذا القسم عند الحفظ؟ لن يُحذف محتوى الخدمة.')) return; setCount(count === 3 ? 4 : 3) }}>{count === 3 ? 'إضافة مسار رابع' : 'الاكتفاء بثلاثة مسارات'}</Button>
  </>
}

function LinkField({ label, name, value }: { label: string; name: string; value: string }) {
  return <AdminField label={label} name={name} defaultValue={value} dir="ltr" pattern="/(?!/).*" required />
}

function SectionFields({ kind, content, assets, articles }: { kind: HomeSectionKind; content: unknown; assets: MediaOption[]; articles: ArticleOption[] }) {
  const value = normalizeHomeContent(kind, content)
  if (kind === 'hero') {
    const data = normalizeHomeCopy(value)
    return <><p className="text-sm leading-loose text-text-soft">هذه الحقول تضبط العنوان والوصف ونص الأزرار. زر البداية يفتح «ابدئي من هنا»، وزر الحجز يفتح المواعيد. السطر التعريفي يأتي من تعريف هبة في الإعدادات.</p><div className="grid gap-3 md:grid-cols-2"><input type="hidden" name="eyebrow" value={data.eyebrow}/>{HERO_FIELDS.filter(([key])=>key!=='eyebrow').map(([key, label, name, max]) => <Field key={key} label={label} name={name} value={data[key]} max={max} area={key === 'lead'} />)}</div></>
  }
  if (kind === 'manifesto' || kind === 'quote') {
    const data = value as NarrativeContent
    return <div className="grid gap-3"><Field label="السطر التعريفي" name="eyebrow" value={data.eyebrow} max={80} /><Field label="الفكرة الرئيسية" name="heading" value={data.heading} max={160} /><Field label="النص" name="body" value={data.body} max={500} area /></div>
  }
  if (kind === 'trust') return <p className="text-sm leading-loose text-text-soft">تُعرض المؤهلات المؤكدة من ملف هبة. <Link href="/admin/settings" className="font-bold underline">تعديل التعريف والاعتمادات</Link></p>
  if (kind === 'pathways') {
    const data = value as PathwaysContent
    return <PathwayFields data={data} assets={assets} media={normalizeHomeMedia(value.media)} />
  }
  if (kind === 'guided_start') {
    const data = value as GuidedStartContent
    return <><div className="grid gap-2 md:grid-cols-3"><Field label="السطر التعريفي" name="eyebrow" value={data.eyebrow} /><Field label="العنوان" name="heading" value={data.heading} /><Field label="الوصف" name="lead" value={data.lead} /></div><div className="grid gap-3 md:grid-cols-3">{data.steps.map((item, index) => <div key={index} className="grid gap-2 rounded-xl border border-line p-3"><Field label={`الخطوة ${index + 1}`} name={`step_title_${index}`} value={item.title} /><Field label="الشرح" name={`step_text_${index}`} value={item.text} area /><LinkField label="الرابط" name={`step_href_${index}`} value={item.href} /><Field label="نص الإجراء" name={`step_cta_${index}`} value={item.cta} /></div>)}</div><p className="text-sm leading-loose text-text-soft">أسئلة الاختبار ونتائجه تُدار من صفحة الاختبارات؛ يستخدم هذا القسم الإصدار المنشور نفسه.</p><input type="hidden" name="comparison_eyebrow" value={data.comparisonEyebrow} /><input type="hidden" name="comparison_heading" value={data.comparisonHeading} /><input type="hidden" name="comparison_lead" value={data.comparisonLead} /></>
  }
  if (kind === 'editorial_feature') {
    const data = value as EditorialFeatureContent
    return <div className="grid gap-2 md:grid-cols-2"><Field label="السطر التعريفي" name="eyebrow" value={data.eyebrow} /><Field label="العنوان" name="heading" value={data.heading} /><div className="md:col-span-2"><Field label="الوصف" name="body" value={data.body} area /></div><Field label="الزر الأساسي" name="primary_label" value={data.primaryLabel} /><LinkField label="رابطه" name="primary_href" value={data.primaryHref} /><Field label="الزر الثانوي" name="secondary_label" value={data.secondaryLabel} /><LinkField label="رابطه" name="secondary_href" value={data.secondaryHref} /></div>
  }
  if (kind === 'offer') return <Field label="نص زر العرض" name="cta_label" value={(value as { ctaLabel: string }).ctaLabel} />
  if (kind === 'articles' || kind === 'resources') {
    const data = value as ArticlesContent
    return <div className="grid gap-3 md:grid-cols-2"><Field label="السطر التعريفي" name="eyebrow" value={data.eyebrow} /><Field label="العنوان" name="heading" value={data.heading} /><Field label="الوصف" name="lead" value={data.lead} /><Field label={kind === 'resources' ? 'زر كل الموارد' : 'زر كل المقالات'} name="cta_label" value={data.ctaLabel} />
      {kind === 'articles' && <fieldset className="grid gap-3 md:col-span-2"><legend className="mb-2 font-bold text-deep-teal">المقالات المميزة بالترتيب</legend><p className="text-sm leading-loose text-text-soft">اتركي الاختيارات فارغة لعرض أحدث ثلاثة مقالات منشورة. تظهر البطاقات بالترتيب المحدد داخل تبويب المقالات.</p>{[0, 1, 2].map(index => <AdminChoicePicker key={index} kind="article" name={`article_slug_${index}`} label={`المقال ${index+1} — اختياري`} defaultValue={data.selectedSlugs?.[index]??''} initialLabel={articles.find(article=>article.slug===data.selectedSlugs?.[index])?.title}/>)}</fieldset>}
    </div>
  }
  if (kind === 'testimonials') {
    const data = value as TestimonialsContent
    return <div className="grid gap-2 md:grid-cols-2"><Field label="السطر التعريفي" name="eyebrow" value={data.eyebrow} /><Field label="العنوان" name="heading" value={data.heading} /></div>
  }
  if (kind === 'press') {
    const data = value as PressContent
    return <div className="grid gap-2 md:grid-cols-2"><Field label="السطر التعريفي" name="eyebrow" value={data.eyebrow} /><Field label="العنوان" name="heading" value={data.heading} /><Field label="الوصف" name="lead" value={data.lead} /><Field label="زر كل المصادر" name="cta_label" value={data.ctaLabel} /></div>
  }
  if (kind === 'newsletter') {
    const data = value as NewsletterContent
    return <div className="grid gap-2 md:grid-cols-2"><Field label="السطر التعريفي" name="eyebrow" value={data.eyebrow} /><Field label="العنوان" name="heading" value={data.heading} /><div className="md:col-span-2"><Field label="الوصف" name="body" value={data.body} area /></div><p className="text-xs leading-loose text-text-soft md:col-span-2">صيغة الموافقة ورابط الخصوصية ثابتان لحماية سلامة الموافقة، ولا يمكن حذفهما من محرر المحتوى.</p></div>
  }
  const data = value as CtaContent
  return <div className="grid gap-2 md:grid-cols-2"><Field label="السطر التعريفي" name="eyebrow" value={data.eyebrow} /><Field label="العنوان" name="heading" value={data.heading} /><div className="md:col-span-2"><Field label="الوصف" name="body" value={data.body} area /></div><Field label="الزر الأساسي" name="primary_label" value={data.primaryLabel} /><LinkField label="رابطه" name="primary_href" value={data.primaryHref} /><Field label="الزر الثانوي" name="secondary_label" value={data.secondaryLabel} /><LinkField label="رابطه" name="secondary_href" value={data.secondaryHref} /></div>
}

function HomeSectionEditor({ pageId, section, assets, articles }: { pageId: string; section: SectionRow; assets: MediaOption[]; articles: ArticleOption[] }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const kind = section.kind as HomeSectionKind
  const label = HOME_SECTION_OPTIONS.find((option) => option.kind === kind)?.label ?? kind
  return (
    <form className="space-y-4 rounded-2xl border border-line bg-ivory/35 p-4" onSubmit={async (event) => { event.preventDefault(); setBusy(true); const result = await saveHomeSection(pageId, section.id, new FormData(event.currentTarget)); setFailed(!result.ok); setMessage(result.ok ? 'حُفظ القسم ونسخة المراجعة.' : result.error); setBusy(false) }}>
      <input type="hidden" name="kind" value={kind} />
      <div className="grid gap-2 md:grid-cols-[1fr_8rem_auto]">
        <Field label={`${label} — اسم داخلي`} name="name" value={section.name} />
        <AdminField label="الترتيب" name="sort" type="number" min="0" max="1000" defaultValue={section.sort} />
        <label className="mt-auto flex min-h-10 items-center gap-2 text-sm font-semibold text-deep-teal"><input type="checkbox" name="is_visible" defaultChecked={section.is_visible} />ظاهر للعامة</label>
      </div>
      <SectionFields kind={kind} content={section.content} assets={assets} articles={articles} />
      {kind !== 'pathways' && mediaSlots(kind).map(slot => <HomeMediaFields key={slot} slot={slot} value={normalizeHomeContent(kind, section.content).media?.[slot]} assets={assets} />)}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" disabled={busy}>حفظ القسم</Button>
        <Button type="button" size="sm" variant="burgundy" disabled={busy} onClick={async () => { if (!window.confirm(`حذف قسم «${label}»؟ ستُحفظ نسخة مراجعة، ولا يمكن حذف قسم أساسي من صفحة منشورة.`)) return; setBusy(true); const result = await deletePageSection(pageId, section.id); setFailed(!result.ok); setMessage(result.ok ? 'حُذف القسم مع حفظ المراجعة.' : result.error); setBusy(false) }}>حذف</Button>
        {message && <span role={failed ? 'alert' : 'status'} aria-live="polite" className="text-xs font-semibold text-deep-teal">{message}</span>}
      </div>
    </form>
  )
}

export function HomeSectionManager({ pageId, sections, assets = [], articles = [] }: { pageId: string; sections: SectionRow[]; assets?: MediaOption[]; articles?: ArticleOption[] }) {
  const [kind, setKind] = useState<HomeSectionKind>('hero')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const supportedSections = sections.filter((section) => isHomeSectionKind(section.kind))
  const unsupportedCount = sections.length - supportedSections.length
  return <div className="space-y-4">
    <div className="rounded-2xl border border-antique-gold/30 bg-surface-raised p-4">
      <h3 className="font-bold text-deep-teal">إضافة قسم مضبوط</h3>
      <p className="mt-1 text-xs leading-loose text-text-soft">يمكن إضافة كل نوع مرة واحدة. حقول كل قسم ثابتة ومتحقق منها، ولا تقبل HTML أو مكونات عشوائية.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <select value={kind} onChange={(event) => setKind(event.target.value as HomeSectionKind)} className={input}>{HOME_SECTION_OPTIONS.map((option) => <option key={option.kind} value={option.kind}>{option.label}</option>)}</select>
        <Button type="button" size="sm" disabled={busy} onClick={async () => { setBusy(true); const result = await createHomeSection(pageId, kind); setFailed(!result.ok); setMessage(result.ok ? 'أُضيف القسم بقيم آمنة ويمكنك تعديله الآن.' : result.error); setBusy(false) }}>إضافة</Button>
      </div>
      {message && <p role={failed ? 'alert' : 'status'} aria-live="polite" className="mt-2 text-xs font-semibold text-deep-teal">{message}</p>}
    </div>
    {unsupportedCount > 0 && <p role="status" className="rounded-xl border border-antique-gold/35 bg-antique-gold/10 p-3 text-xs leading-loose text-deep-teal">يوجد {unsupportedCount} قسم قديم غير مدعوم في الواجهة المنظمة. لم يُحذف أو يُعدّل حفاظًا على البيانات، ويمكن مراجعته من سجل المراجعات.</p>}
    {[...supportedSections].sort((a, b) => a.sort - b.sort).map((section) => <HomeSectionEditor key={section.id} pageId={pageId} section={section} assets={assets} articles={articles} />)}
  </div>
}
