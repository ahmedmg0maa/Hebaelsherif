'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { saveStartHereExperience } from '@/lib/actions/cms'
import type { StartHereContent } from '@/lib/start-here/content'

const input = 'min-h-10 w-full rounded-xl border border-line bg-surface-raised px-3 py-2 text-sm text-ink'

function Field({ label, name, value, area = false, link = false }: { label: string; name: string; value: string; area?: boolean; link?: boolean }) {
  return <label className="grid gap-1 text-xs font-semibold text-deep-teal">{label}{area ? <textarea name={name} defaultValue={value} rows={3} required className={input} /> : <input name={name} defaultValue={value} required dir={link ? 'ltr' : undefined} pattern={link ? '/(?!/).*' : undefined} className={input} />}</label>
}

export function StartHereExperienceEditor({ content }: { content: StartHereContent }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  return <form className="space-y-6" onSubmit={async (event) => { event.preventDefault(); setBusy(true); const result = await saveStartHereExperience(new FormData(event.currentTarget)); setMessage(result.ok ? 'حُفظ غلاف صفحة البداية وبطاقاتها.' : result.error); setBusy(false) }}>
    <fieldset className="grid gap-3 rounded-xl border border-line p-4 md:grid-cols-2"><legend className="px-2 font-bold text-deep-teal">مقدمة الصفحة</legend><Field label="السطر التعريفي" name="hero_eyebrow" value={content.hero.eyebrow} /><Field label="العنوان" name="hero_title" value={content.hero.title} /><div className="md:col-span-2"><Field label="الوصف والتنبيه" name="hero_lead" value={content.hero.lead} area /></div></fieldset>
    <fieldset className="grid gap-3 rounded-xl border border-line p-4"><legend className="px-2 font-bold text-deep-teal">بطاقات الحالات</legend>{content.paths.map((path, index) => <div key={index} className="grid gap-3 rounded-xl bg-ivory/55 p-3 md:grid-cols-2"><Field label={`عنوان الحالة ${index + 1}`} name={`path_${index}_title`} value={path.title} /><Field label="نص الزر" name={`path_${index}_cta`} value={path.cta} /><div className="md:col-span-2"><Field label="التوضيح" name={`path_${index}_text`} value={path.text} area /></div><Field label="الرابط الداخلي" name={`path_${index}_href`} value={path.href} link /></div>)}</fieldset>
    <fieldset className="grid gap-3 rounded-xl border border-line p-4 md:grid-cols-2"><legend className="px-2 font-bold text-deep-teal">الدعوة الختامية</legend><Field label="العنوان" name="closing_title" value={content.closing.title} /><Field label="نص الزر" name="closing_cta_label" value={content.closing.ctaLabel} /><div className="md:col-span-2"><Field label="الوصف" name="closing_lead" value={content.closing.lead} area /></div><Field label="الرابط الداخلي" name="closing_cta_href" value={content.closing.ctaHref} link /></fieldset>
    <div className="flex flex-wrap items-center gap-3"><Button type="submit" disabled={busy}>{busy ? 'جارٍ الحفظ…' : 'حفظ غلاف صفحة البداية'}</Button>{message && <p role="status" className="text-sm font-semibold text-deep-teal">{message}</p>}</div>
  </form>
}
