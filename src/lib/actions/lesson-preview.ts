'use server'
import {requirePermission} from '@/lib/auth/permissions'
import {getServiceClient} from '@/lib/supabase/server'
import {revalidatePath} from 'next/cache'
import {isUuid} from '@/lib/delivery/security'
export async function saveLessonText(lessonId:string,courseId:string,form:FormData){
 const actor=await requirePermission('learning.manage'),text=String(form.get('description')??'')
 if(!actor)return {ok:false as const,error:'لا تملكين صلاحية تعديل الدروس.'}
 if(!isUuid(lessonId)||!isUuid(courseId)||text.length>30000)return {ok:false as const,error:'نص الدرس لا يتجاوز 30000 حرف.'}
 const {error}=await getServiceClient().rpc('admin_save_lesson_text',{p_actor:actor.userId,p_lesson:lessonId,p_text:text})
 if(error)return {ok:false as const,error:error.message.includes('incomplete')?'الكورس منشور؛ لا يمكن إزالة النص الوحيد لدرس بلا فيديو. أضيفي البديل أولًا.':'تعذّر حفظ نص الدرس.'}
 revalidatePath(`/admin/courses/${courseId}/curriculum`);revalidatePath('/dashboard/courses','layout')
 return {ok:true as const}
}
export async function previewLessonVideo(id:string){
 const actor=await requirePermission('learning.manage')
 if(!actor||!isUuid(id))return {ok:false as const,error:'لا تملكين صلاحية معاينة الدرس.'}
 const db=getServiceClient(),{data:lesson,error}=await db.from('course_lessons').select('video_path').eq('id',id).maybeSingle()
 if(error||!lesson?.video_path)return {ok:false as const,error:'لا يوجد فيديو محفوظ لهذا الدرس.'}
 if(lesson.video_path.startsWith('stream:'))return {ok:false as const,error:'معاينة Stream غير متاحة في الوضع المجاني.'}
 const audit=await db.from('audit_logs').insert({actor_id:actor.userId,action:'curriculum.video_previewed',entity_type:'course_lesson',entity_id:id,meta:{}})
 if(audit.error)return {ok:false as const,error:'تعذّر تسجيل المعاينة؛ حاولي مجددًا.'}
 const {data,error:signing}=await db.storage.from('course-videos').createSignedUrl(lesson.video_path,120)
 if(signing||!data?.signedUrl)return {ok:false as const,error:'تعذّر تجهيز المعاينة الخاصة. لم يتغير الفيديو.'}
 return {ok:true as const,url:data.signedUrl}
}
