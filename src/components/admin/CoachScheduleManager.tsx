'use client'

import { useState } from 'react'
import Link from 'next/link'
import { saveCoachHours,saveCoachException,deleteCoachException } from '@/lib/actions/booking-admin'
import { AdminField,AdminSelect,AdminTextarea } from './AdminField'
import { useAdminAction } from './useAdminAction'
import { ActionFeedback } from './ActionFeedback'
import { Button } from '@/components/ui/Button'

export type CoachSchedule = {
 hours:{weekday:number;is_open:boolean;start_time:string;end_time:string}[]
 exceptions:{id:string;date:string;kind:'open'|'closed';start_time:string;end_time:string;reason:string}[]
}
const days=['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت']
export function CoachScheduleManager({schedule}:{schedule:CoachSchedule}) {
 const weekly=useAdminAction(),exception=useAdminAction(),[kind,setKind]=useState('closed'),[whole,setWhole]=useState(false)
 return <section className="space-y-6 rounded-2xl border border-antique-gold/30 bg-surface-raised p-4 shadow-card sm:p-6">
 <header><h2 className="font-heading text-2xl text-deep-teal">جدول عمل هبة</h2><p className="mt-2 text-sm leading-7 text-text-soft">جدول واحد لكل أنواع الجلسات — توقيت القاهرة (Africa/Cairo). يجب أن تقع الجلسة والراحة قبلها وبعدها كاملتين داخل الفترة المفتوحة. الإغلاق يمنع حجزًا جديدًا، ولا يلغي حجزًا قائمًا.</p></header>
 <form className="space-y-4" aria-busy={weekly.busy} onSubmit={async e=>{e.preventDefault();const data=new FormData(e.currentTarget);await weekly.run(()=>saveCoachHours(data),'حُفظت ساعات الأسبوع بعد فحص الحجوزات القائمة.')}}>
 <fieldset disabled={weekly.busy} className="space-y-3"><legend className="mb-3 font-bold text-deep-teal">ساعات الأسبوع المتكررة</legend>
 {schedule.hours.map(h=><div key={h.weekday} className="grid gap-3 rounded-xl border border-line bg-ivory/50 p-4 sm:grid-cols-[1fr_1fr_1fr]">
 <div><label className="flex min-h-12 items-center gap-3 font-bold text-deep-teal"><input name={`open_${h.weekday}`} type="checkbox" defaultChecked={h.is_open} className="h-5 w-5 accent-deep-teal"/>{days[h.weekday]} مفتوح</label><p className="text-sm leading-6 text-text-soft">اختياري · أزيلي العلامة لجعل اليوم إجازة أسبوعية. مثال: الجمعة مغلقة.</p></div>
 <AdminField label="بداية العمل" name={`start_${h.weekday}`} type="time" required defaultValue={h.start_time.slice(0,5)} hint="أول وقت متاح للجلسة والراحة السابقة لها، بتوقيت القاهرة." example="10:00 صباحًا"/>
 <AdminField label="نهاية العمل" name={`end_${h.weekday}`} type="time" required defaultValue={h.end_time.slice(0,5)} hint="آخر وقت يجب أن تنتهي فيه الجلسة والراحة التالية لها." example="20:00 تعني 8 مساءً"/>
 </div>)}
 </fieldset><ActionFeedback feedback={weekly.feedback}/><Button type="submit" disabled={weekly.busy}>{weekly.busy?'جارٍ الفحص والحفظ…':'حفظ ساعات الأسبوع'}</Button></form>
 <form className="space-y-4 border-t border-line pt-5" aria-busy={exception.busy} onSubmit={async e=>{e.preventDefault();const form=e.currentTarget,data=new FormData(form);if(await exception.run(()=>saveCoachException(data),'حُفظ الاستثناء بعد فحص الحجوزات.')){form.reset();setKind('closed');setWhole(false)}}}>
 <fieldset disabled={exception.busy} className="grid gap-4 sm:grid-cols-2"><legend className="mb-3 font-bold text-deep-teal">إغلاق أو فتح استثنائي لكل الجلسات</legend>
 <AdminField name="date" label="التاريخ" type="date" required/>
 <AdminSelect name="kind" label="الإجراء" required value={kind} onChange={e=>{setKind(e.target.value);setWhole(false)}} options={[{value:'closed',label:'إغلاق فترة'},{value:'open',label:'فتح فترة استثنائية'}]} hint="الإغلاق يوقف الإتاحة لكل الخدمات. الفتح يسمح بالمواعيد خارج الأسبوع المعتاد؛ الإغلاق القائم يظل له الأولوية." example="فتح الجمعة من 12 إلى 14 بموافقتك"/>
 {kind==='closed'&&<label className="flex min-h-12 items-center gap-3 sm:col-span-2"><input type="checkbox" name="whole_day" checked={whole} onChange={e=>setWhole(e.target.checked)} className="h-5 w-5 accent-deep-teal"/>إغلاق اليوم كاملًا <span className="text-sm text-text-soft">اختياري · من منتصف الليل حتى بداية اليوم التالي.</span></label>}
 {!whole&&<><AdminField name="start_time" label="من" type="time" required/><AdminField name="end_time" label="إلى" type="time" required/></>}
 <AdminTextarea name="reason" label="السبب الداخلي" maxLength={500} className="sm:col-span-2"/>
 </fieldset><ActionFeedback feedback={exception.feedback}/><Button type="submit" disabled={exception.busy}>{exception.busy?'جارٍ فحص التعارض…':'حفظ الفترة الاستثنائية'}</Button>
 <Link href="/admin/bookings" className="ms-4 inline-flex min-h-12 items-center font-bold text-deep-teal underline">مراجعة أجندة الحجوزات</Link></form>
 <div className="space-y-3"><h3 className="font-bold text-deep-teal">الفترات الاستثنائية القادمة</h3>{schedule.exceptions.length===0?<p className="text-sm text-text-soft">لا توجد استثناءات قادمة؛ يُطبّق الجدول الأسبوعي.</p>:schedule.exceptions.map(x=><article key={x.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-4"><div><p className="font-bold text-deep-teal">{x.date} · {x.kind==='open'?'فتح استثنائي':'إغلاق'} · <span dir="ltr">{x.start_time.slice(0,5)}–{x.end_time.slice(0,5)}</span></p><p className="mt-1 text-sm text-text-soft">{x.reason||'لم يُسجّل سبب داخلي.'}</p></div><Button type="button" variant="secondary" disabled={exception.busy} onClick={()=>exception.run(()=>deleteCoachException(x.id),'أُزيل الاستثناء واستُعيد الجدول المعتاد بعد فحص الحجوزات.')}>إزالة الاستثناء</Button></article>)}</div>
 </section>
}
