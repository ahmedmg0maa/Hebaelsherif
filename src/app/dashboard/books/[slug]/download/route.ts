import { getServerClient, getServiceClient } from '@/lib/supabase/server'
import { privateJson, privateRedirect, requestFingerprint } from '@/lib/delivery/security'

export async function GET(_request:Request,{params}:{params:Promise<{slug:string}>}){
  const {slug}=await params,supabase=await getServerClient(),{data:{user}}=await supabase.auth.getUser()
  if(!user)return privateRedirect(new URL('/auth/login',_request.url).toString())
  const {data:access}=await supabase.from('book_access').select('book_id,books!inner(slug)').eq('user_id',user.id).eq('books.slug',slug).maybeSingle()
  if(!access)return privateJson('ليس لديك وصول لهذا الكتاب.',403)
  const service=getServiceClient(),{data:file}=await service.from('book_files').select('id,storage_path,format').eq('book_id',access.book_id).is('archived_at',null).order('created_at',{ascending:false}).limit(1).maybeSingle()
  if(!file)return privateJson('ملف الكتاب غير متاح بعد.',404)
  const {data:admission,error:admissionError}=await service.rpc('authorize_book_download',{p_user_id:user.id,p_book_file_id:file.id,p_request_fingerprint:requestFingerprint(_request)})
  const result=Array.isArray(admission)?admission[0]:admission
  if(admissionError||!result)return privateJson('تعذّر التحقق من صلاحية التحميل.',500)
  if(result.status==='rate_limited')return privateJson('وصلتِ إلى حد التحميل اليومي لهذا الكتاب. حاولي بعد 24 ساعة.',429)
  if(result.status!=='allowed')return privateJson('ليس لديك وصول لهذا الكتاب.',403)
  const {data:signed,error}=await service.storage.from('protected-books').createSignedUrl(file.storage_path,60,{download:`${slug}.${file.format}`})
  if(error||!signed?.signedUrl)return privateJson('تعذّر تجهيز رابط التحميل.',500)
  return privateRedirect(signed.signedUrl)
}
