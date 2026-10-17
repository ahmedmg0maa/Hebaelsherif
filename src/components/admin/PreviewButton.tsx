'use client'

import { useState } from 'react'
import { createContentPreview } from '@/lib/actions/cms'
import { Button } from '@/components/ui/Button'
import {AdminSelect} from './AdminField'
import {useAdminAction} from './useAdminAction'
import {ActionFeedback} from './ActionFeedback'

const widths = { mobile: 390, tablet: 768, desktop: 1440 }
export function PreviewButton({ type, id }: { type: 'page' | 'article'; id: string }) {
  const {busy,feedback,run}=useAdminAction()
  const [previewUrl,setPreviewUrl]=useState<string|null>(null)
  const [viewport, setViewport] = useState<keyof typeof widths>('desktop')
  return <div className="flex flex-wrap items-center gap-2">
    <AdminSelect label="حجم المعاينة" name={`preview-${type}-${id}`} value={viewport} onChange={event=>{setViewport(event.target.value as keyof typeof widths);setPreviewUrl(null)}} required hint="اختاري المقاس المطلوب لفتح المعاينة. قد يغيّر المتصفح حجم النافذة وفق إعداداته." example="هاتف 390 بكسل"><option value="mobile">هاتف 390px</option><option value="tablet">لوحي 768px</option><option value="desktop">سطح مكتب</option></AdminSelect>
    <Button size="sm" variant="secondary" disabled={busy} onClick={()=>run(async()=>{const result=await createContentPreview(type,id);if(result.ok){const url=`${result.url}&viewport=${viewport}`;setPreviewUrl(url);window.open(url,'_blank',`noopener,noreferrer,width=${widths[viewport]},height=900`)}return result},'جُهّزت المعاينة الخاصة. إذا منع المتصفح فتحها، استخدمي الرابط الظاهر.')}>معاينة آمنة ٣٠ دقيقة</Button>
    {previewUrl&&<a href={previewUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center font-bold text-deep-teal underline">فتح المعاينة الخاصة</a>}
    <ActionFeedback feedback={feedback}/>
  </div>
}
