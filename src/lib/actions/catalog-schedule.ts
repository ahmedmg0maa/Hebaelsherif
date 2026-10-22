'use server'
import {requirePermission} from '@/lib/auth/permissions'
import {getServiceClient} from '@/lib/supabase/server'
import {parseCairoLocalDateTime} from '@/lib/booking/cairo-time'
import {revalidatePath} from 'next/cache'
export async function saveCatalogSchedule(kind:string,id:string,form:FormData){
 const actor=await requirePermission('catalog.publish')
 if(!actor)return {ok:false as const,error:'لا تملكين صلاحية جدولة النشر.'}
 const action=String(form.get('action')??''),at=parseCairoLocalDateTime(String(form.get('run_at')??''))
 if(!['course','book','workshop'].includes(kind)||!['publish','hide','cancel'].includes(action)||(action!=='cancel'&&(!at||at<=new Date())))return {ok:false as const,error:'اختاري نشرًا أو إخفاءً وموعدًا مستقبليًا صحيحًا بتوقيت القاهرة.'}
 const {error}=await getServiceClient().rpc('admin_schedule_catalog',{p_actor:actor.userId,p_kind:kind,p_item:id,p_action:action,p_at:at?.toISOString()??null})
 if(error)return {ok:false as const,error:error.message.includes('incomplete')||error.message.includes('media')?'أكملي شروط النشر والغلاف والمحتوى قبل جدولة النشر.':error.message.includes('restore')?'استعيدي العنصر المؤرشف أولًا.':'تعذّر حفظ الجدولة. راجعي المدخلات والصلاحية.'}
 revalidatePath(`/admin/${kind==='course'?'courses':kind==='book'?'books':'workshops'}`)
 return {ok:true as const}
}
export async function readCatalogSchedule(kind:string,id:string){
 const actor=await requirePermission('catalog.publish')
 if(!actor)return {ok:false as const,error:'قراءة الجدولة تتطلب صلاحية النشر.'}
 const {data,error}=await getServiceClient().from('catalog_publication_jobs').select('id,action,run_at,status').eq('kind',kind).eq('item_id',id).order('created_at',{ascending:false}).limit(10)
 return error?{ok:false as const,error:'تعذّرت قراءة مواعيد النشر.'}:{ok:true as const,data:data??[]}
}
