 'use server'
import {getServerClient} from '@/lib/supabase/server'
import {requirePermission} from '@/lib/auth/permissions'
import {adminPagedList} from '@/lib/data/admin-pagination'
import {adminCustomerPage,type CustomerDirectoryRow} from '@/lib/data/admin-customer-pages'
export type AdminChoice={id:string;label:string;url?:string;alt?:string;kind?:string}
export async function searchAdminChoices(kind:'product'|'bundle-child'|'customer'|'media'|'plan'|'service'|'package'|'home-media'|'media-replacement'|'article',q:string,page:number,sourceId?:string){
 try{
  if(!['product','bundle-child','customer','media','plan','service','package','home-media','media-replacement','article'].includes(kind)||typeof q!=='string'||!Number.isSafeInteger(page)||page<1)return {ok:false as const,error:'طلب البحث غير صالح.'}
  const actor=await requirePermission(kind==='customer'?'users.view':kind==='media-replacement'?'media.manage':['media','home-media'].includes(kind)?'media.view':kind==='article'?'content.manage':['plan','service','package'].includes(kind)?'packages.manage':'catalog.view')
  if(!actor?.userId)return {ok:false as const,error:'لا تملكين صلاحية قراءة هذه القائمة.'}
  if(kind==='customer'){
   const result=await adminCustomerPage<CustomerDirectoryRow>(actor.userId,{q,page:String(page)})
   return {ok:true as const,total:result.total,page:result.page,pageSize:result.pageSize,items:result.rows.map(row=>({id:row.id,label:`${row.full_name||'عميلة'} — ${row.email}`})) as AdminChoice[]}
  }
  if(kind==='media-replacement'){
   if(!sourceId||!(/^[0-9a-f-]{36}$/i).test(sourceId))return {ok:false as const,error:'الأصل الحالي غير صالح.'}
   const db=await getServerClient(),{data:source,error}=await db.from('media_assets').select('bucket,kind,visibility').eq('id',sourceId).single()
   if(error||!source)throw Error('SOURCE_UNAVAILABLE')
   const result=await adminPagedList<{id:string;title:string}>('media_assets','id,title',{q,page:String(page)},{searchColumn:'title',equals:{bucket:source.bucket,kind:source.kind,visibility:source.visibility},notEquals:{id:sourceId},nulls:['archived_at']})
   if(!result.configured)throw Error('UNCONFIGURED')
   return {ok:true as const,total:result.total,page:result.page,pageSize:result.pageSize,items:result.rows.map(row=>({id:row.id,label:row.title})) as AdminChoice[]}
  }
  if(kind==='article'){
   const result=await adminPagedList<{id:string;slug:string;title:string}>('articles','id,slug,title',{q,page:String(page)},{searchColumn:'title',equals:{status:'published',is_published:'true'}})
   if(!result.configured)throw Error('UNCONFIGURED')
   return {ok:true as const,total:result.total,page:result.page,pageSize:result.pageSize,items:result.rows.map(row=>({id:row.slug,label:row.title})) as AdminChoice[]}
  }
  if(kind==='media'||kind==='home-media'){
   const result=await adminPagedList<{id:string;title:string;alt:string;kind:string;bucket:string;path:string}>('media_assets','id,title,alt,kind,bucket,path',{q,page:String(page)},{searchColumn:'title',equals:{bucket:'public-media',kind:'image',visibility:'public'},nulls:['archived_at'],...(kind==='home-media'?{inValues:{rights_status:['owned','licensed','public_domain']},notEquals:{rights_reference:''}}:{})})
   if(!result.configured)throw Error('UNCONFIGURED')
   const db=await getServerClient()
   return {ok:true as const,total:result.total,page:result.page,pageSize:result.pageSize,items:result.rows.map(row=>({id:row.id,label:row.title||row.alt||'صورة',url:db.storage.from(row.bucket).getPublicUrl(row.path).data.publicUrl,alt:row.alt,kind:row.kind})) as AdminChoice[]}
  }
  if(kind==='plan'||kind==='service'){
   const result=await adminPagedList<{id:string;title:string}>(kind==='plan'?'subscription_plans':'services',kind==='plan'?'id,title':'id,title,products!inner(archived_at)',{q,page:String(page)},{searchColumn:'title',nulls:[kind==='plan'?'archived_at':'products.archived_at'],...(kind==='plan'?{equals:{is_active:'true'}}:{})})
   if(!result.configured)throw Error('UNCONFIGURED')
   return {ok:true as const,total:result.total,page:result.page,pageSize:result.pageSize,items:result.rows.map(row=>({id:row.id,label:row.title})) as AdminChoice[]}
  }
  const result=await adminPagedList<{id:string;title:string;type:string}>('products','id,title,type',{q,page:String(page)},{searchColumn:'title',nulls:['archived_at'],...(kind==='bundle-child'?{inValues:{type:['course','book','workshop','session']}}:kind==='package'?{inValues:{type:['vip','bundle']}}:{})})
  if(!result.configured)throw Error('UNCONFIGURED')
  return {ok:true as const,total:result.total,page:result.page,pageSize:result.pageSize,items:result.rows.map(row=>({id:row.id,label:row.title,kind:row.type})) as AdminChoice[]}
 }catch{return {ok:false as const,error:'تعذّر تحميل الاختيارات. اختياراتك المحفوظة لم تتغير؛ أعيدي البحث.'}}
}
