'use server'
import {revalidatePath} from 'next/cache'
import {requireFreshAdminAssurance,FRESH_ADMIN_ASSURANCE_ERROR} from '@/lib/auth/permissions'
import {defaultHomeSections} from '@/lib/home/sections'
import {defaultHomeCopy} from '@/lib/home/hero'
import {getServiceClient} from '@/lib/supabase/server'
export async function applyLearningHomeLayout(){
 const admin=await requireFreshAdminAssurance('content.manage')
 if(!admin?.userId)return {ok:false,error:FRESH_ADMIN_ASSURANCE_ERROR}
 const sections=defaultHomeSections().map(s=>({...s,content:s.kind==='hero'?defaultHomeCopy:s.content}))
 const {error}=await getServiceClient().rpc('apply_learning_home_layout',{p_actor:admin.userId,p_sections:sections})
 if(error)return {ok:false,error:'تعذر تطبيق القالب. راجعي صلاحية نشر المحتوى واكتمال الترحيلات.'}
 revalidatePath('/');revalidatePath('/admin/pages');return {ok:true}
}
