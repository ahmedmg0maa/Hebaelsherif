'use client'
import {AdminTextarea} from './AdminField'
import {AdminField} from './AdminField'

import { useState } from 'react'
import { saveHomeCopy } from '@/lib/actions/admin-control'
import type { HomeCopy } from '@/lib/data/cms'
import { Button } from '@/components/ui/Button'

export function HomeCopyEditor({ copy }: { copy: HomeCopy }) {
  const [busy,setBusy]=useState(false); const [message,setMessage]=useState<string|null>(null)
  const fields:[keyof HomeCopy,string,string][]=[
    ['eyebrow','السطر التعريفي','eyebrow'],['headlineStart','بداية العنوان','headline_start'],['headlineAccent','الكلمة الملونة الأولى','headline_accent'],
    ['headlineMiddle','منتصف العنوان','headline_middle'],['headlinePath','كلمة الطريق','headline_path'],['headlineEnd','نهاية العنوان','headline_end'],
    ['headlineAwareness','كلمة الوعي','headline_awareness'],['primaryCta','زر البداية','primary_cta'],['secondaryCta','زر البرامج','secondary_cta'],
    ['imageTitle','عنوان بطاقة الصورة','image_title'],['imageLead','وصف بطاقة الصورة','image_lead'],
  ]
  return <form className="grid gap-4 md:grid-cols-2" onSubmit={async(event)=>{event.preventDefault();setBusy(true);const result=await saveHomeCopy(new FormData(event.currentTarget));setMessage(result.ok?'تم تحديث الصفحة الرئيسية وحفظ نسخة مراجعة.':result.error);setBusy(false)}}>
    {fields.map(([key,label,name])=><AdminField key={key} label={label} name={name} defaultValue={copy[key]} required/>)}
    <AdminTextarea className="text-sm font-semibold text-deep-teal md:col-span-2" label="الوصف الرئيسي" name="lead" defaultValue={copy.lead} rows={3} required/>
    {message&&<p className="text-sm font-semibold text-deep-teal md:col-span-2" role="status">{message}</p>}
    <Button type="submit" disabled={busy} className="justify-self-start">{busy?'جاري النشر…':'حفظ ونشر النصوص'}</Button>
  </form>
}
