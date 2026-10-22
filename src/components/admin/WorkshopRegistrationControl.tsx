'use client'
import {useState} from 'react'
import {setWorkshopRegistrationStatus,saveWorkshopAttendance} from '@/lib/actions/workshop-admin'
import {Button} from '@/components/ui/Button'
import {AdminField,AdminSelect} from './AdminField'
import {useAdminAction} from './useAdminAction'
import {ActionFeedback} from './ActionFeedback'
export function WorkshopRegistrationControl({id,status,minutes}:{id:string;status:string;minutes:number}){
 const {busy,feedback,run}=useAdminAction(),[selected,setSelected]=useState(status)
 return <div className="space-y-4">
 <AdminSelect label="حالة التسجيل" name={`registration-${id}`} value={selected} disabled={busy} required onChange={async e=>{const next=e.target.value;if(await run(()=>setWorkshopRegistrationStatus(id,next),'حُفظت حالة التسجيل وحدّثت سعة الورشة.'))setSelected(next)}} hint="يُحفظ الاختيار فورًا بعد فحص السعة. التسجيل يحجز مقعدًا، والانتظار لا يضمن مقعدًا، والإلغاء يحرر المقعد دون استرداد مالي تلقائي." example="مسجلة بعد التأكد من الاستحقاق"><option value="registered">مسجلة</option><option value="waitlisted">انتظار</option><option value="cancelled">ملغاة</option></AdminSelect>
 <form className="space-y-3" onSubmit={async e=>{e.preventDefault();const n=Number(new FormData(e.currentTarget).get('minutes'));await run(()=>saveWorkshopAttendance(id,n),'حُفظ عدد دقائق الحضور؛ إعادة الحفظ تحدّث السجل نفسه.')}}><AdminField label="دقائق الحضور الفعلي" name="minutes" type="number" min={0} max={1440} defaultValue={minutes} required disabled={busy} hint="الوقت الذي حضرته المشاركة فعليًا؛ يُستخدم لسجل الحضور وليس للحساب المالي." example="60 دقيقة"/><Button type="submit" size="sm" disabled={busy}>حفظ الحضور</Button></form>
 <ActionFeedback feedback={feedback}/></div>
}
