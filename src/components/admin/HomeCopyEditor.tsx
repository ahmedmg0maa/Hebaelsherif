'use client'

import { useState } from 'react'
import { saveHomeCopy } from '@/lib/actions/admin-control'
import type { HomeCopy } from '@/lib/data/cms'
import { Button } from '@/components/ui/Button'

export function HomeCopyEditor({ copy }: { copy: HomeCopy }) {
  const [busy,setBusy]=useState(false); const [message,setMessage]=useState<string|null>(null)
  const input='w-full rounded-xl border border-line bg-surface-raised px-4 py-2.5 text-ink focus:border-deep-teal focus:outline-2 focus:outline-deep-teal/15'
  const fields:[keyof HomeCopy,string,string][]=[
    ['eyebrow','السطر التعريفي','eyebrow'],['headlineStart','بداية العنوان','headline_start'],['headlineAccent','الكلمة الملونة الأولى','headline_accent'],
    ['headlineMiddle','منتصف العنوان','headline_middle'],['headlinePath','كلمة الطريق','headline_path'],['headlineEnd','نهاية العنوان','headline_end'],
    ['headlineAwareness','كلمة الوعي','headline_awareness'],['primaryCta','زر البداية','primary_cta'],['secondaryCta','زر البرامج','secondary_cta'],
    ['imageTitle','عنوان بطاقة الصورة','image_title'],['imageLead','وصف بطاقة الصورة','image_lead'],
  ]
  return <form className="grid gap-4 md:grid-cols-2" onSubmit={async(event)=>{event.preventDefault();setBusy(true);const result=await saveHomeCopy(new FormData(event.currentTarget));setMessage(result.ok?'تم تحديث الصفحة الرئيسية وحفظ نسخة مراجعة.':result.error);setBusy(false)}}>
    {fields.map(([key,label,name])=><label key={key} className="text-sm font-semibold text-deep-teal">{label}<input name={name} defaultValue={copy[key]} className={input} required/></label>)}
    <label className="text-sm font-semibold text-deep-teal md:col-span-2">الوصف الرئيسي<textarea name="lead" defaultValue={copy.lead} rows={3} className={input} required/></label>
    {message&&<p className="text-sm font-semibold text-deep-teal md:col-span-2" role="status">{message}</p>}
    <Button type="submit" disabled={busy} className="justify-self-start">{busy?'جاري النشر…':'حفظ ونشر النصوص'}</Button>
  </form>
}
