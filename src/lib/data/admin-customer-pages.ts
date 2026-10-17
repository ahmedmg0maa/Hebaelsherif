import {getServiceClient} from '@/lib/supabase/server'
import {adminPageFilters,type AdminPageQuery,type AdminPageResult} from './admin-pagination'
export type CustomerDirectoryRow={id:string;full_name:string;email:string;phone:string|null;created_at:string}
export async function adminCustomerPage<T>(actorId:string,input:AdminPageQuery,kind:'customers'|'deletions'='customers',prefix=''):Promise<AdminPageResult<T>>{
 const filters=adminPageFilters(input,{prefix,statuses:kind==='deletions'?['pending','in_review','awaiting_customer','approved_for_execution','completed','declined','cancelled']:[]})
 const {data,error}=await getServiceClient().rpc('admin_customer_directory_page',{p_actor_id:actorId,p_kind:kind,p_query:filters.q,p_status:filters.status,p_page:filters.page,p_page_size:filters.pageSize})
 if(error||!data||!Array.isArray(data.rows)||!Number.isSafeInteger(data.total)||!Number.isSafeInteger(data.page)||data.page<1||data.pageSize!==filters.pageSize||data.rows.length!==Math.min(filters.pageSize,Math.max(0,data.total-(data.page-1)*filters.pageSize)))throw Error('ADMIN_CUSTOMER_DIRECTORY_READ_UNAVAILABLE')
 return {...filters,rows:data.rows as T[],total:data.total,page:data.page,configured:true}
}
