'use server'
import {revalidatePath} from 'next/cache'
import {createHash} from 'node:crypto'
import {requirePermission} from '@/lib/auth/permissions'
import {getServiceClient} from '@/lib/supabase/server'
import {isUuid} from '@/lib/delivery/security'
import {streamConfigured,streamRequest} from '@/lib/delivery/stream'
import {isFreeOperation} from '@/lib/operations/cost-mode'
const fail=(error:string)=>({ok:false as const,error})
async function actor(lessonId:string,id:string){if(!isUuid(lessonId)||!isUuid(id))return null;return requirePermission('learning.manage')}
export async function beginStreamUpload(lessonId:string,id:string,file:{name:string;size:number;type:string;lastModified:number},maxMinutes:number){
 const admin=await actor(lessonId,id);if(!admin?.userId)return fail('ليس لديك صلاحية رفع الفيديو.')
 if(isFreeOperation())return fail('خدمة الفيديو المدفوعة متوقفة في النسخة المجانية. استخدمي مقاطع حتى 50MB من رفع فيديو الدرس.')
 if(!streamConfigured())return fail('رفع الفيديو الطويل يحتاج تفعيل Cloudflare Stream من إعدادات التشغيل.')
 if(!Number.isSafeInteger(file.size)||file.size<1||file.size>10*1024**3||!['video/mp4','video/webm','video/quicktime'].includes(file.type)||!Number.isInteger(maxMinutes)||maxMinutes<1||maxMinutes>240)return fail('اختاري فيديو MP4 أو WebM أو MOV حتى 10GB، ومدة قصوى حتى 240 دقيقة.')
 const db=getServiceClient(),fingerprint=createHash('sha256').update(JSON.stringify([file.name,file.size,file.type,file.lastModified])).digest('hex')
 const {data:job,error}=await db.rpc('manage_lesson_stream_upload',{p_actor:admin.userId,p_lesson:lessonId,p_id:id,p_action:'begin',p_payload:{bytes:file.size,fingerprint,maxSeconds:maxMinutes*60}})
 if(error||!job)return fail(error?.message.includes('in_progress')?'هناك رفع جارٍ لهذا الدرس. استكمليه أو ألغيه قبل البدء.':'تعذر تجهيز الرفع. اختاري نفس الملف عند استكمال محاولة سابقة.')
 if(job.status==='bound')return {ok:true as const,data:{status:'bound',uploadUrl:''}}
 if(job.uploadUrl)return {ok:true as const,data:{status:'uploading',uploadUrl:job.uploadUrl as string}}
 if(!job.fresh)return fail('لم يتأكد إنشاء رابط الرفع. ألغِي هذه المحاولة ثم ابدئي مجددًا؛ الرابط غير المكتمل سينتهي تلقائيًا.')
 try{
  const meta=`maxDurationSeconds ${Buffer.from(String(maxMinutes*60)).toString('base64')},requiresignedurls,expiry ${Buffer.from(new Date(Date.now()+6*3600000).toISOString()).toString('base64')}`
  const response=await streamRequest('?direct_user=true',{method:'POST',headers:{'Tus-Resumable':'1.0.0','Upload-Length':String(file.size),'Upload-Metadata':meta,'Upload-Creator':id.replaceAll('-','')}})
  const url=response.headers.get('Location')??'',uid=response.headers.get('stream-media-id')??url.match(/\/([0-9a-f]{32})(?:[/?]|$)/)?.[1]
  if(!response.ok||!uid||!/^https:\/\/upload\.videodelivery\.net\//.test(url))return fail('تعذر تجهيز خدمة الفيديو. راجعي تفعيل Stream ثم ألغِي المحاولة لإعادتها.')
  const saved=await db.rpc('manage_lesson_stream_upload',{p_actor:admin.userId,p_lesson:lessonId,p_id:id,p_action:'provision',p_payload:{uid,url}})
  if(saved.error)return fail('تعذر تأكيد تصريح الرفع. أعيدي المحاولة نفسها.')
  return {ok:true as const,data:{status:'uploading',uploadUrl:url}}
 }catch{return fail('تعذر الاتصال بخدمة الفيديو. أعيدي المحاولة نفسها للتحقق.')}
}
export async function finishStreamUpload(lessonId:string,id:string){
 const admin=await actor(lessonId,id);if(!admin?.userId)return fail('ليس لديك صلاحية إتمام الرفع.')
 const db=getServiceClient(),{data:job}=await db.from('lesson_stream_uploads').select('uid,status').eq('id',id).eq('lesson_id',lessonId).eq('actor_id',admin.userId).maybeSingle()
 if(job?.status==='bound')return {ok:true as const}
 if(!job?.uid)return fail('لم يتأكد نقل الفيديو بعد.')
 try{
  const response=await streamRequest(`/${job.uid}`);if(!response.ok)return fail('تعذر قراءة حالة الفيديو. حاولي مرة أخرى.')
  const data=await response.json() as {success?:boolean;result?:{readyToStream?:boolean;requireSignedURLs?:boolean;creator?:string;duration?:number}}
  const video=data.result
  if(!data.success||!video?.readyToStream)return fail('اكتمل النقل وقد تستغرق معالجة الفيديو دقائق. استخدمي «تحقق وربط الفيديو» بعد قليل.')
  if(!video.requireSignedURLs||video.creator!==id.replaceAll('-','')||!Number.isFinite(video.duration))return fail('تعذر التحقق من خصوصية الفيديو وهويته؛ لم يُربط بالدرس.')
  const saved=await db.rpc('manage_lesson_stream_upload',{p_actor:admin.userId,p_lesson:lessonId,p_id:id,p_action:'bind',p_payload:{duration:Math.ceil(video.duration!)}})
  if(saved.error)return fail('تغيّر الدرس أو صلاحياته. لم نستبدل الفيديو الحالي؛ راجعيه أولًا.')
  revalidatePath('/admin/courses','layout');revalidatePath('/dashboard/courses','layout');return {ok:true as const}
 }catch{return fail('تعذر التحقق الآن. الفيديو الحالي لم يتغير.')}
}
export async function abandonStreamUpload(lessonId:string,id:string){
 const admin=await actor(lessonId,id);if(!admin?.userId)return fail('ليس لديك صلاحية إلغاء الرفع.')
 const {error}=await getServiceClient().rpc('manage_lesson_stream_upload',{p_actor:admin.userId,p_lesson:lessonId,p_id:id,p_action:'abandon'})
 return error?fail('تعذر إلغاء المحاولة؛ حاولي مجددًا.'):{ok:true as const}
}
