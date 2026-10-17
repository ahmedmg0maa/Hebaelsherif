 'use server'
import {getServerClient,getServiceClient} from '@/lib/supabase/server'
import {requirePermission} from '@/lib/auth/permissions'
import {adminPagedList} from '@/lib/data/admin-pagination'
import {adminCustomerPage,type CustomerDirectoryRow} from '@/lib/data/admin-customer-pages'
export type AdminChoice={id:string;label:string;url?:string;alt?:string;kind?:string;state?:'available'|'archived'|'hidden'|'inactive'|'unavailable'}
type ChoiceKind='product'|'bundle-child'|'customer'|'media'|'plan'|'service'|'package'|'home-media'|'media-replacement'|'article'
const kinds:ChoiceKind[]=['product','bundle-child','customer','media','plan','service','package','home-media','media-replacement','article']
function permission(kind:ChoiceKind){return kind==='customer'?'users.view':kind==='media-replacement'?'media.manage':['media','home-media'].includes(kind)?'media.view':kind==='article'?'content.manage':['plan','service','package'].includes(kind)?'packages.manage':'catalog.view'}

/** Read saved references independently of the current search page. Never changes their IDs. */
export async function resolveAdminChoices(kind:ChoiceKind,ids:string[]){
 try{
  if(!kinds.includes(kind)||!Array.isArray(ids)||ids.length>200||ids.some(id=>typeof id!=='string'||!(kind==='article'?/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)&&id.length<=180:/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)))||(kind==='customer'&&ids.length>1))return {ok:false as const,error:'تعذّر قراءة الأسماء: معرّف الاختيار المحفوظ غير صالح. لم يتغير الاختيار.'}
  const actor=await requirePermission(permission(kind))
  if(!actor?.userId)return {ok:false as const,error:'لا تملكين صلاحية قراءة أسماء هذه الاختيارات. المعرّفات المحفوظة لم تتغير.'}
  const unique=[...new Set(ids)],found=new Map<string,AdminChoice>()
  if(kind==='customer'&&unique.length){
   // Reuse the existing scoped, audited customer read; return only its display name.
   const {data,error}=await getServiceClient().rpc('get_admin_customer_360',{p_actor_id:actor.userId,p_customer_id:unique[0]})
   if(error&&error.code!=='P0002')throw Error('CUSTOMER_READ_UNAVAILABLE')
   if(!error){if(data?.profile?.id!==unique[0]||typeof data.profile.email!=='string')throw Error('CUSTOMER_READ_INVALID');found.set(unique[0],{id:unique[0],label:`${data.profile.fullName||'عميلة'} — ${data.profile.email}`,state:'available'})}
  }else if(unique.length){
   const media=['media','home-media','media-replacement'].includes(kind),article=kind==='article',service=kind==='service',plan=kind==='plan'
   const table=media?'media_assets':article?'articles':service?'services':plan?'subscription_plans':'products'
   const columns=media?'id,title,archived_at':article?'slug,title,status,is_published':service?'id,title,is_active,products!inner(archived_at,is_published)':plan?'id,title,is_active,archived_at':'id,title,type,is_published,archived_at'
   const db=await getServerClient()
   for(let start=0;start<unique.length;start+=100){
    const {data,error}=await db.from(table).select(columns).in(article?'slug':'id',unique.slice(start,start+100)).limit(100)
    if(error||!Array.isArray(data))throw Error('SAVED_CHOICES_READ_UNAVAILABLE')
    // Dynamic columns are server constants above. No URL/path/private content is returned.
    for(const value of data){
     const row=value as unknown as {id:string;slug:string;title:string;type?:string;archived_at?:string|null;is_published?:boolean;is_active?:boolean;status?:string;products?:{archived_at:string|null;is_published:boolean}|{archived_at:string|null;is_published:boolean}[]}
     const id=article?row.slug:row.id,parent=Array.isArray(row.products)?row.products[0]:row.products
     if(!unique.includes(id)||typeof row.title!=='string')throw Error('SAVED_CHOICES_READ_INVALID')
     const state:AdminChoice['state']=row.archived_at||parent?.archived_at?'archived':row.is_active===false?'inactive':row.is_published===false||parent?.is_published===false||(article&&row.status!=='published')?'hidden':'available'
     found.set(id,{id,label:row.title,kind:row.type,state})
    }
   }
  }
  return {ok:true as const,items:unique.map(id=>found.get(id)??{id,label:'عنصر محفوظ غير متاح',state:'unavailable' as const})}
 }catch{return {ok:false as const,error:'تعذّر تحميل أسماء الاختيارات. المعرّفات المحفوظة لم تتغير؛ أعيدي المحاولة.'}}
}
export async function searchAdminChoices(kind:'product'|'bundle-child'|'customer'|'media'|'plan'|'service'|'package'|'home-media'|'media-replacement'|'article',q:string,page:number,sourceId?:string){
 try{
  if(!['product','bundle-child','customer','media','plan','service','package','home-media','media-replacement','article'].includes(kind)||typeof q!=='string'||!Number.isSafeInteger(page)||page<1)return {ok:false as const,error:'طلب البحث غير صالح.'}
  const actor=await requirePermission(permission(kind))
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
