'use client'
import {useState} from 'react'
import {saveCatalogSchedule,readCatalogSchedule} from '@/lib/actions/catalog-schedule'
import {AdminField,AdminSelect} from './AdminField'
import {Button} from '@/components/ui/Button'
import {useAdminAction} from './useAdminAction'
import {ActionFeedback} from './ActionFeedback'
export function CatalogScheduleControl({kind,id}:{kind:'course'|'book'|'workshop';id:string}){
 const action=useAdminAction(),[jobs,setJobs]=useState<{id:string;action:string;run_at:string;status:string}[]|null>(null)
 async function load(){const r=await readCatalogSchedule(kind,id);if(r.ok)setJobs(r.data);return r}
 return <details className="rounded-xl border border-line p-4"><summary className="cursor-pointer py-2 font-bold text-deep-teal">جدولة النشر والإخفاء</summary><p className="my-3 text-sm leading-7 text-text-soft">بتوقيت القاهرة. ينفّذ العامل الجدولة عادة خلال دقيقة من الموعد، وقد يتأخر عند التراكم. يعيد فحص صلاحية الإدارة وشروط النشر وقت التنفيذ. الإخفاء لا يسحب وصول المشتركات.</p>
 <form className="space-y-4" onSubmit={async e=>{e.preventDefault();const data=new FormData(e.currentTarget);if(await action.run(()=>saveCatalogSchedule(kind,id,data),'حُفظ موعد التنفيذ.'))await action.run(load,'حُدّثت قائمة المواعيد.')}}>
 <fieldset disabled={action.busy} className="grid gap-4 sm:grid-cols-2"><AdminSelect name="action" label="الإجراء المجدول" required options={[{value:'publish',label:'نشر'},{value:'hide',label:'إخفاء'}]} hint="النشر يتيح الطلب الجديد بعد اكتمال المتطلبات. الإخفاء يوقف الظهور والبيع مع الاحتفاظ بالحقوق." example="إخفاء عند نهاية فترة التسجيل"/><AdminField name="run_at" label="موعد التنفيذ — القاهرة" type="datetime-local" required hint="اختاري تاريخًا ووقتًا مستقبليين. إعادة جدولة الإجراء نفسه تستبدل الموعد السابق." example="تاريخ فتح التسجيل الساعة 10:00"/></fieldset>
 <div className="flex flex-wrap gap-2"><Button type="submit" disabled={action.busy}>حفظ الموعد</Button><Button type="button" variant="secondary" disabled={action.busy} onClick={()=>action.run(load,'قُرئت مواعيد هذا العنصر.')}>عرض المواعيد وحالتها</Button><Button type="button" variant="ghost" disabled={action.busy} onClick={()=>action.run(async()=>{const f=new FormData();f.set('action','cancel');const r=await saveCatalogSchedule(kind,id,f);if(r.ok)await load();return r},'أُلغيت المواعيد المعلقة؛ لم تتغير حالة المحتوى الحالية.')}>إلغاء الجدولة المعلقة</Button></div>
 </form><ActionFeedback feedback={action.feedback}/>{jobs&&<ul className="mt-4 space-y-2 text-sm">{!jobs.length&&<li>لا توجد مواعيد محفوظة.</li>}{jobs.map(j=><li key={j.id} className="rounded-lg border border-line p-3">{j.action==='publish'?'نشر':'إخفاء'} · {new Intl.DateTimeFormat('ar-EG',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Cairo'}).format(new Date(j.run_at))} · {{pending:'بانتظار الموعد',done:'تم التنفيذ',failed:'تعذّر التنفيذ؛ راجعي شروط النشر والصلاحية ثم أعيدي الجدولة',cancelled:'أُلغيت الجدولة'}[j.status]}</li>)}</ul>}</details>
}
