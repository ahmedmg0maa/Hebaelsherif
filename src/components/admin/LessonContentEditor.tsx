'use client'
import {useState} from 'react'
import {saveLessonText,previewLessonVideo} from '@/lib/actions/lesson-preview'
import {AdminTextarea} from './AdminField'
import {useAdminAction} from './useAdminAction'
import {ActionFeedback} from './ActionFeedback'
import {Button} from '@/components/ui/Button'
export function LessonContentEditor({id,courseId,description,hasVideo}:{id:string;courseId:string;description:string;hasVideo:boolean}){
 const action=useAdminAction(),[text,setText]=useState(description),[video,setVideo]=useState<string|null>(null)
 return <details className="space-y-4 rounded-xl border border-line p-4"><summary className="cursor-pointer py-2 font-bold text-deep-teal">نص الدرس ومعاينته</summary><form className="space-y-4" onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);await action.run(()=>saveLessonText(id,courseId,f),'حُفظ نص الدرس وسُجّل التعديل.')}}><fieldset disabled={action.busy}><AdminTextarea name="description" label="المحتوى المكتوب للدرس" value={text} onChange={e=>setText(e.target.value)} maxLength={30000} rows={7} hint="النص الذي تقرؤه المشتركة داخل الدرس. يمكن استخدامه وحده دون فيديو؛ للنشر يلزم محتوى فعلي لا يقل عن 24 حرفًا إذا لم يوجد فيديو." example="مقدمة الدرس، خطوات التطبيق، ثم أسئلة المراجعة"/></fieldset><Button type="submit" disabled={action.busy}>حفظ نص الدرس</Button></form>
 <section className="rounded-xl bg-ivory/50 p-4"><h4 className="font-bold text-deep-teal">معاينة النص قبل الحفظ</h4><p className="mt-3 whitespace-pre-wrap break-words text-base leading-8 text-ink">{text||'لم يُكتب محتوى بعد.'}</p></section>
 {hasVideo&&<div className="space-y-3"><Button type="button" variant="secondary" disabled={action.busy} onClick={()=>action.run(async()=>{const r=await previewLessonVideo(id);if(r.ok)setVideo(r.url);return r},'جُهّزت معاينة خاصة للفيديو المحفوظ.')}>معاينة الفيديو المحفوظ</Button>{video&&<><video src={video} controls preload="metadata" className="w-full rounded-xl" aria-label="معاينة فيديو الدرس"/><p className="text-sm text-text-soft">رابط خاص قصير الصلاحية. أعيدي المعاينة عند انتهائه.</p><Button type="button" variant="ghost" onClick={()=>setVideo(null)}>إغلاق المعاينة</Button></>}</div>}
 <ActionFeedback feedback={action.feedback}/></details>
}
