'use client'
import {useState} from 'react'
import {Button} from '@/components/ui/Button'
import {useAdminAction} from './useAdminAction'
import {ActionFeedback} from './ActionFeedback'
import {applyLearningHomeLayout} from '@/lib/actions/launch-admin'
export function LearningTemplateButton(){
 const [confirm,setConfirm]=useState(false),{busy,feedback,run}=useAdminAction()
 return <section className="space-y-3 rounded-2xl border border-line bg-ivory/50 p-5"><h2 className="font-bold text-deep-teal">قالب التعلّم الجديد</h2><p className="text-sm leading-7 text-text-soft">تطبيق ترتيب الصفحة والصور والنصوص الافتراضية للتصميم المختار. تُحفظ الأقسام السابقة مخفية ويمكن إعادة إظهارها من المحرر. إذا كانت الرئيسية منشورة، يظهر التغيير فورًا.</p>
 {confirm?<div className="flex gap-2"><Button disabled={busy} onClick={()=>run(async()=>{const result=await applyLearningHomeLayout();if(result.ok)setConfirm(false);return result},'تم تطبيق القالب. يمكنك تعديل النصوص والصور والأقسام الآن.')}>تأكيد تطبيق القالب</Button><Button variant="secondary" onClick={()=>setConfirm(false)} disabled={busy}>إلغاء</Button></div>:<Button onClick={()=>setConfirm(true)}>تطبيق التصميم المختار</Button>}
 <ActionFeedback feedback={feedback}/></section>
}
