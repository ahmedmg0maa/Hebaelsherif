'use client'

import { useState } from 'react'
import { beginMediaUpload, finalizeMediaUpload, manageMediaLifecycle, updateMediaMetadata } from '@/lib/actions/admin-control'
import { Button } from '@/components/ui/Button'
import {uploadProtectedFile} from '@/lib/delivery/direct-upload'
import {useAdminAction} from './useAdminAction'
import {ActionFeedback} from './ActionFeedback'
import {AdminField,AdminSelect} from './AdminField'


export function MediaUpload() {
  const {busy,feedback,run}=useAdminAction()
  type Pending={input:Parameters<typeof finalizeMediaUpload>[0];url:string;file:File}
  const [pending,setPending]=useState<Pending|null>(null),[percent,setPercent]=useState<number|null>(null)
  async function finish(job:Pending){const result=await finalizeMediaUpload(job.input);if(result.ok)setPending(null);return result}
  async function transfer(job:Pending){
   setPercent(0)
   try{await uploadProtectedFile(job.url,job.file,setPercent)}catch{setPercent(null);return {ok:false as const,error:'توقف النقل أو لم يتأكد الرد. استخدمي التحقق من نفس المحاولة؛ يمكن إعادة نقل الملف نفسه دون إضافة عنصر جديد.'}}
   setPercent(null);return finish(job)
  }
  return <form className="grid gap-4 rounded-2xl border border-antique-gold/30 bg-surface-raised p-4 shadow-card sm:p-6" aria-busy={busy} onSubmit={async event=>{
   event.preventDefault();const element=event.currentTarget,form=new FormData(element)
   const ok=await run(async()=>{
    if(pending)return finish(pending)
    const file=form.get('file')
    if(!(file instanceof File)||!file.size)return {ok:false,error:'اختاري ملفًا غير فارغ.'}
    const bucket=String(form.get('bucket')??'')
    if(file.size>(bucket==='public-media'?10485760:50000000))return {ok:false,error:'حجم الملف أكبر من الحد الموضح؛ اضغطيه قبل الرفع.'}
    const input={bucket,name:file.name,type:file.type,size:file.size,title:String(form.get('title')??''),alt:String(form.get('alt')??''),tags:String(form.get('tags')??''),caption:String(form.get('caption')??''),credit:String(form.get('credit')??''),rightsStatus:String(form.get('rights_status')??''),rightsReference:String(form.get('rights_reference')??''),folder:String(form.get('folder')??''),focalX:Number(form.get('focal_x')??50),focalY:Number(form.get('focal_y')??50)}
    const started=await beginMediaUpload(input)
    if(!started.ok)return started
    const job={input:{...input,path:started.data.path},url:started.data.uploadUrl,file}
    setPending(job);return transfer(job)
   },'اكتمل النقل وسُجّل الملف مرة واحدة في المكتبة.')
   if(ok)element.reset()
  }}>
    <p className="text-sm leading-7 text-text-soft">وسائط عامة: صور JPG وPNG وWebP وGIF وSVG أو PDF حتى 10 ميجابايت. الملفات الخاصة حتى 50 ميجابايت بحسب النوع. لربط فيديو أو كتاب بالعميلات استخدمي أدوات الرفع داخل الكورس أو الكتاب. الرفع هنا يُضيف إلى المكتبة فقط.</p>
    <fieldset disabled={busy||Boolean(pending)} className="grid gap-4 md:grid-cols-2">
    <AdminField label="الملف" name="file" type="file" required />
    <AdminSelect label="المخزن" name="bucket" required options={[{"value": "public-media", "label": "وسائط عامة"}, {"value": "course-videos", "label": "فيديو الدورات"}, {"value": "course-resources", "label": "موارد الدورات"}, {"value": "protected-books", "label": "الكتب المحمية"}, {"value": "workshop-recordings", "label": "تسجيلات الورش"}]}/>
    <AdminField label="اسم واضح للأصل" name="title" />
    <AdminField label="وسوم مفصولة بفواصل" name="tags" />
    <AdminField label="النص البديل / الوصف" name="alt" />
    <AdminField label="المجلد التنظيمي" name="folder" defaultValue="uncategorized" dir="ltr" />
    <AdminSelect label="حقوق الاستخدام" name="rights_status" defaultValue="unverified" required options={[{"value": "unverified", "label": "غير موثقة"}, {"value": "owned", "label": "مملوك"}, {"value": "licensed", "label": "مرخّص"}, {"value": "public_domain", "label": "ملكية عامة"}]}/>
    <AdminField label="تعليق الصورة" name="caption" />
    <AdminField label="النسبة / المصوّر" name="credit" />
    <AdminField label="مرجع الحق أو الترخيص" name="rights_reference" />
    <div className="grid gap-3 md:col-span-2 sm:grid-cols-2"><AdminField label="بؤرة القص أفقيًا %" name="focal_x" type="number" min="0" max="100" defaultValue="50" /><AdminField label="بؤرة القص رأسيًا %" name="focal_y" type="number" min="0" max="100" defaultValue="50" /></div>
    <p className="text-xs text-text-soft md:col-span-2">الصور العامة تتطلب نصًا بديلًا. أنواع الملفات والحجم تُفحص حسب المخزن، والملفات الخاصة لا تحصل على رابط عام.</p>
    </fieldset>
    {percent!==null&&<div><progress max={100} value={percent} className="w-full" aria-label="تقدم نقل الوسائط"/><p role="status" className="text-sm text-text-soft">{percent.toLocaleString('ar-EG')}٪ نقل — ثم التحقق والتسجيل.</p></div>}
    <ActionFeedback feedback={feedback}/>
    <div className="flex flex-wrap gap-2"><Button type="submit" disabled={busy}>{busy?'جارٍ التنفيذ…':pending?'التحقق وتسجيل نفس المحاولة':'رفع وفهرسة الملف'}</Button>{pending&&<Button type="button" variant="secondary" disabled={busy} onClick={()=>run(()=>transfer(pending),'اكتمل النقل والتسجيل دون تكرار.')}>إعادة نقل الملف نفسه</Button>}</div>
  </form>
}

type MediaMetadataProps = { id: string; title: string; alt: string; tags: string[]; caption: string; credit: string; rightsStatus: string; rightsReference: string; folder: string; focalX: number; focalY: number }

export function MediaMetadata({ id, title, alt, tags, caption, credit, rightsStatus, rightsReference, folder, focalX, focalY }: MediaMetadataProps) {
  const {busy,feedback,run}=useAdminAction()
  return <details className="rounded-xl border border-line bg-ivory/40"><summary className="cursor-pointer list-none px-3 py-2 text-xs font-bold text-deep-teal">تعديل البيانات</summary><form className="grid gap-2 border-t border-line p-3" onSubmit={async (event) => {
    event.preventDefault();const data=new FormData(event.currentTarget);await run(()=>updateMediaMetadata(id,data),'حُفظت بيانات الوسائط.')
  }}>
    <AdminField label="الاسم" name="title" defaultValue={title} required />
    <AdminField label="النص البديل" name="alt" defaultValue={alt} />
    <AdminField label="الوسوم" name="tags" defaultValue={tags.join(', ')} />
    <AdminField label="المجلد" name="folder" defaultValue={folder} dir="ltr" />
    <AdminSelect label="حقوق الاستخدام" name="rights_status" defaultValue={rightsStatus} required options={[{"value": "unverified", "label": "غير موثقة"}, {"value": "owned", "label": "مملوك"}, {"value": "licensed", "label": "مرخّص"}, {"value": "public_domain", "label": "ملكية عامة"}]}/>
    <AdminField label="التعليق" name="caption" defaultValue={caption} />
    <AdminField label="النسبة" name="credit" defaultValue={credit} />
    <AdminField label="مرجع الحق" name="rights_reference" defaultValue={rightsReference} />
    <div className="grid grid-cols-2 gap-2"><AdminField label="بؤرة X" name="focal_x" type="number" min="0" max="100" defaultValue={focalX} /><AdminField label="بؤرة Y" name="focal_y" type="number" min="0" max="100" defaultValue={focalY} /></div>
    <ActionFeedback feedback={feedback}/>
    <Button size="sm" type="submit" disabled={busy}>{busy ? 'جاري الحفظ…' : 'حفظ البيانات'}</Button>
  </form></details>
}

export function CopyMediaUrl({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  return <Button size="sm" variant="ghost" type="button" onClick={async () => { await navigator.clipboard.writeText(url); setCopied(true) }}>{copied ? 'نُسخ' : 'نسخ الرابط'}</Button>
}

type MediaReplacementOption = { id: string; title: string }

export function MediaLifecycle({ id, archivedAt, replacedBy, usageCount = 0, replacements }: { id: string; archivedAt: string | null; replacedBy: string | null; usageCount?: number; replacements: MediaReplacementOption[] }) {
  const {busy,feedback,run:perform}=useAdminAction()
  const run=(action:'archive'|'restore'|'replace',replacementId?:string)=>perform(()=>manageMediaLifecycle(id,action,replacementId),action==='archive'?'نُقل الأصل إلى الأرشيف ويمكن استعادته.':action==='restore'?'استُعيد الأصل إلى المكتبة النشطة.':'نُقلت الاستخدامات وأُرشف الأصل القديم.')
  if (archivedAt) return <div className="space-y-2">{replacedBy ? <p className="text-xs font-semibold text-text-soft">مؤرشف بعد استبدال آمن؛ الأصل البديل هو المرجع التشغيلي.</p> : <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => run('restore')}>استعادة</Button>}<ActionFeedback feedback={feedback}/></div>
  return <div className="space-y-2">
    <p className="text-xs text-text-soft">{usageCount > 0 ? `مستخدم في ${usageCount.toLocaleString('ar-EG')} موضع؛ يلزم الاستبدال قبل الأرشفة.` : 'الأرشفة قابلة للاستعادة ولا تحذف ملف التخزين.'}</p>
    <div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant="burgundy" disabled={busy} onClick={() => run('archive')}>أرشفة</Button></div>
    {replacements.length > 0 && <form className="flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void run('replace', String(form.get('replacement_id') ?? '')) }}><AdminSelect label="الأصل البديل" name="replacement_id" required hint="اختاري ملفًا متوافقًا لنقل الاستخدامات إليه ثم أرشفة الملف الحالي. لا تُحذف ملفات التخزين تلقائيًا." example="الصورة الجديدة التي تحل محل الغلاف الحالي"><option value="">اختاري أصلًا بديلًا متوافقًا</option>{replacements.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</AdminSelect><Button type="submit" size="sm" variant="secondary" disabled={busy}>استبدال ونقل الاستخدام</Button></form>}
    <ActionFeedback feedback={feedback}/>
  </div>
}
