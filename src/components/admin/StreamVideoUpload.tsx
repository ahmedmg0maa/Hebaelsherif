'use client'
import {useRef,useState} from 'react'
import {Button} from '@/components/ui/Button'
import {beginStreamUpload,finishStreamUpload,abandonStreamUpload} from '@/lib/actions/stream-admin'
import {uploadStreamChunks} from '@/lib/delivery/tus-upload'
import {useAdminAction} from './useAdminAction'
import {ActionFeedback} from './ActionFeedback'
export function StreamVideoUpload({lessonId}:{lessonId:string}){
 const {busy,feedback,run}=useAdminAction(),[percent,setPercent]=useState<number|null>(null),[intent,setIntent]=useState<string|null>(null)
 const file=useRef<HTMLInputElement>(null),duration=useRef<HTMLInputElement>(null),key=`heba-stream-upload-${lessonId}`
 function requestId(){const id=intent||sessionStorage.getItem(key)||crypto.randomUUID();sessionStorage.setItem(key,id);setIntent(id);return id}
 function done(){sessionStorage.removeItem(key);setIntent(null);setPercent(null);if(file.current)file.current.value=''}
 return <section className="space-y-3 rounded-xl border border-line bg-ivory/40 p-4" aria-label="رفع فيديو طويل">
  <h3 className="text-sm font-bold text-deep-teal">فيديو طويل — Cloudflare Stream</h3>
  <p className="text-xs leading-6 text-text-soft">رفع مباشر قابل للاستكمال حتى 10GB. يتطلب تفعيل خدمة Stream المدفوعة. الفيديو الحالي يظل متاحًا حتى اكتمال معالجة البديل.</p>
  <label className="block text-sm">ملف الفيديو<input ref={file} type="file" accept="video/mp4,video/webm,video/quicktime" disabled={busy} className="mt-2 block w-full text-xs"/></label>
  <label className="block text-sm">المدة القصوى بالدقائق<input ref={duration} type="number" defaultValue={120} min={1} max={240} disabled={busy} className="ms-3 w-20 rounded border border-line p-2"/></label>
  <p className="text-xs leading-6 text-text-soft">اختاري حدًا قريبًا من مدة الفيديو؛ يُحجز مؤقتًا من سعة Stream حتى انتهاء المعالجة. عند استكمال الرفع اختاري الملف نفسه.</p>
  {percent!==null&&<div><progress max={100} value={percent} className="w-full" aria-label="تقدم نقل الفيديو"/><p role="status" className="text-xs">{percent}%</p></div>}
  <div className="flex flex-wrap gap-2"><Button size="sm" disabled={busy} onClick={()=>run(async()=>{
   const f=file.current?.files?.[0];if(!f)return {ok:false,error:'اختاري ملف الفيديو أولًا.'}
   const id=requestId(),start=await beginStreamUpload(lessonId,id,{name:f.name,size:f.size,type:f.type,lastModified:f.lastModified},Number(duration.current?.value))
   if(!start.ok)return start
   if(start.data.status==='bound'){done();return {ok:true}}
   try{await uploadStreamChunks(start.data.uploadUrl,f,setPercent)}catch{return {ok:false,error:'توقف النقل. اختاري نفس الملف واضغطي الرفع مجددًا؛ سنستكمل من آخر جزء وصل.'}}
   const result=await finishStreamUpload(lessonId,id);if(result.ok)done();return result
  },'الفيديو جاهز وتم ربطه بالدرس.')}>رفع / استكمال</Button>
  <Button size="sm" variant="secondary" disabled={busy} onClick={()=>run(async()=>{const id=intent||sessionStorage.getItem(key);if(!id)return {ok:false,error:'لا توجد محاولة محفوظة في هذا المتصفح.'};const result=await finishStreamUpload(lessonId,id);if(result.ok)done();return result},'تم ربط الفيديو.')}>تحقق وربط الفيديو</Button>
  <Button size="sm" variant="ghost" disabled={busy} onClick={()=>run(async()=>{const id=intent||sessionStorage.getItem(key);if(!id)return {ok:false,error:'لا توجد محاولة محفوظة.'};const result=await abandonStreamUpload(lessonId,id);if(result.ok)done();return result},'أُلغيت المحاولة. يمكن حذف أي فيديو غير مرتبط من مكتبة Stream بعد مراجعته.')}>إلغاء المحاولة</Button></div>
  <ActionFeedback feedback={feedback}/>
 </section>
}
