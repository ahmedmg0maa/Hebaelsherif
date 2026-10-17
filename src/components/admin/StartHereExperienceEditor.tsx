'use client'

import {AdminField,AdminTextarea} from './AdminField'
import {useAdminAction} from './useAdminAction'
import {ActionFeedback} from './ActionFeedback'
import { Button } from '@/components/ui/Button'
import { saveStartHereExperience } from '@/lib/actions/cms'
import type { StartHereContent } from '@/lib/start-here/content'

function Field({label,name,value,area=false,link=false}:{label:string;name:string;value:string;area?:boolean;link?:boolean}){
 const max=link?180:name.includes('eyebrow')?80:name.includes('cta')?70:name.includes('title')?120:300
 return area?<AdminTextarea label={label} name={name} defaultValue={value} maxLength={max} required rows={3}/>:<AdminField label={label} name={name} defaultValue={value} maxLength={max} required dir={link?'ltr':undefined} pattern={link?'/(?!/).*':undefined}/>
}

export function StartHereExperienceEditor({ content }: { content: StartHereContent }) {
  const {busy,feedback,run}=useAdminAction()
  return <form className="space-y-6" aria-busy={busy} onSubmit={async event=>{event.preventDefault();const data=new FormData(event.currentTarget);await run(()=>saveStartHereExperience(data),'حُفظ غلاف صفحة البداية وبطاقاتها.')}}>
    <fieldset disabled={busy} className="space-y-6">
    <fieldset className="grid gap-3 rounded-xl border border-line p-4 md:grid-cols-2"><legend className="px-2 font-bold text-deep-teal">مقدمة الصفحة</legend><Field label="السطر التعريفي" name="hero_eyebrow" value={content.hero.eyebrow} /><Field label="العنوان" name="hero_title" value={content.hero.title} /><div className="md:col-span-2"><Field label="الوصف والتنبيه" name="hero_lead" value={content.hero.lead} area /></div></fieldset>
    <fieldset className="grid gap-3 rounded-xl border border-line p-4"><legend className="px-2 font-bold text-deep-teal">بطاقات الحالات</legend>{content.paths.map((path, index) => <div key={index} className="grid gap-3 rounded-xl bg-ivory/55 p-3 md:grid-cols-2"><Field label={`عنوان الحالة ${index + 1}`} name={`path_${index}_title`} value={path.title} /><Field label="نص الزر" name={`path_${index}_cta`} value={path.cta} /><div className="md:col-span-2"><Field label="التوضيح" name={`path_${index}_text`} value={path.text} area /></div><Field label="الرابط الداخلي" name={`path_${index}_href`} value={path.href} link /></div>)}</fieldset>
    <fieldset className="grid gap-3 rounded-xl border border-line p-4 md:grid-cols-2"><legend className="px-2 font-bold text-deep-teal">الدعوة الختامية</legend><Field label="العنوان" name="closing_title" value={content.closing.title} /><Field label="نص الزر" name="closing_cta_label" value={content.closing.ctaLabel} /><div className="md:col-span-2"><Field label="الوصف" name="closing_lead" value={content.closing.lead} area /></div><Field label="الرابط الداخلي" name="closing_cta_href" value={content.closing.ctaHref} link /></fieldset>
    </fieldset><ActionFeedback feedback={feedback}/><div className="flex flex-wrap items-center gap-3"><Button type="submit" disabled={busy}>{busy ? 'جارٍ الحفظ…' : 'حفظ غلاف صفحة البداية'}</Button></div>
  </form>
}
