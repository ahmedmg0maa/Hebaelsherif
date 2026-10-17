'use client'
import Link from 'next/link'
import {useState} from 'react'
import {initializeHomeDraft} from '@/lib/actions/home-draft'
import {Button} from '@/components/ui/Button'
import {ActionFeedback} from './ActionFeedback'
import {useAdminAction} from './useAdminAction'
export function HomeDraftControl(){
 const {busy,feedback,run}=useAdminAction(),[prepared,setPrepared]=useState(false)
 return <section className="space-y-3 rounded-2xl border border-antique-gold/40 bg-surface-raised p-5">
  <h2 className="text-xl font-bold text-deep-teal">مسودة الرئيسية الحالية</h2>
  <p className="text-sm leading-7 text-text-soft">انسخي النصوص والأقسام وترتيبها وروابطها كما تظهر الآن إلى مسودة قابلة للمراجعة. تبقى صور التصميم الحالية ومصادر المنتجات كما هي. التجهيز لا ينشر شيئًا ولا يستبدل محتوى محفوظًا.</p>
  <div className="flex flex-wrap gap-3"><Button type="button" disabled={busy} onClick={()=>run(async()=>{const result=await initializeHomeDraft();if(result.ok)setPrepared(true);return result},'المسودة جاهزة للمقارنة والمعاينة؛ لم تُنشر الرئيسية.')}>{busy?'جارٍ تجهيز المسودة…':'تجهيز مسودة من الرئيسية الحالية'}</Button><Link className="inline-flex min-h-12 items-center px-3 font-bold text-deep-teal underline" href="/admin/pages/home/compare">مقارنة المسودة بالرئيسية</Link></div>
  {prepared&&<p role="status" className="text-sm text-deep-teal">افتحي المقارنة ثم حدّثي قائمة الصفحات لتحرير الأقسام المحفوظة.</p>}
  <ActionFeedback feedback={feedback}/>
 </section>
}
