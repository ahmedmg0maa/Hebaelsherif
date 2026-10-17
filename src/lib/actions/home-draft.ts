'use server'
import {revalidatePath} from 'next/cache'
import {requirePermission} from '@/lib/auth/permissions'
import {loadHomeDraftSource} from '@/lib/data/home-draft'
import {getServiceClient} from '@/lib/supabase/server'
export async function initializeHomeDraft() {
 const actor=await requirePermission('content.manage')
 if(!actor?.userId)return {ok:false as const,error:'لا تملكين صلاحية تجهيز مسودة الرئيسية.'}
 let snapshot
 try {snapshot=(await loadHomeDraftSource()).snapshot}
 catch {return {ok:false as const,error:'تعذّرت قراءة الرئيسية الحالية؛ لم تُنشأ مسودة من بيانات ناقصة. حاولي القراءة مجددًا.'}}
 const {data,error}=await getServiceClient().rpc('initialize_home_draft',{p_actor_id:actor.userId,p_snapshot:snapshot})
 if(error||!data?.id)return {ok:false as const,error:error?.message?.includes('home_existing_content_preserved')?'يوجد محتوى محفوظ للرئيسية؛ احتفظنا به دون استبدال. افتحي محرره للمراجعة.':'لم تتأكد تهيئة المسودة. هذه النسخة تحتاج تحديث قاعدة البيانات المعتمد؛ لم تتغير الرئيسية العامة.'}
 revalidatePath('/admin/pages')
 return {ok:true as const,created:data.created===true}
}
