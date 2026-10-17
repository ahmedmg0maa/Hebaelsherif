import {getServiceClient} from '@/lib/supabase/server'
import {adminPageFilters,type AdminPageQuery,type AdminPageResult} from './admin-pagination'
export const CUSTOMER_HISTORY_KINDS={orders:'الطلبات',payments:'الدفعات',bookings:'الحجوزات',subscriptions:'الاشتراكات',notes:'الملاحظات الداخلية',tags:'الوسوم',notifications:'الإشعارات'} as const
export type CustomerHistoryKind=keyof typeof CUSTOMER_HISTORY_KINDS
export type CustomerHistoryRow={id:string;created_at:string;status:string;title?:string;note?:string;archived_at?:string|null;ends_at?:string;total?:number;amount?:number;currency?:string;method?:string}
export async function adminCustomerHistory(actorId:string,customerId:string,input:AdminPageQuery):Promise<AdminPageResult<CustomerHistoryRow>&{kind:CustomerHistoryKind}>{
 const kind=typeof input.kind==='string'&&Object.hasOwn(CUSTOMER_HISTORY_KINDS,input.kind)?input.kind as CustomerHistoryKind:'orders'
 const filters=adminPageFilters(input,{statuses:kind==='notes'?['active','archived']:[]})
 const {data,error}=await getServiceClient().rpc('admin_customer_history_page',{p_actor_id:actorId,p_customer_id:customerId,p_kind:kind,p_query:filters.q,p_status:filters.status,p_page:filters.page,p_page_size:filters.pageSize})
 if(error?.code==='P0002')throw Error('ADMIN_CUSTOMER_MISSING')
 if(error||!data||!Array.isArray(data.rows)||!Number.isSafeInteger(data.total)||!Number.isSafeInteger(data.page)||data.page<1||data.pageSize!==filters.pageSize||data.rows.length!==Math.min(filters.pageSize,Math.max(0,data.total-(data.page-1)*filters.pageSize)))throw Error('ADMIN_CUSTOMER_HISTORY_READ_UNAVAILABLE')
 return {...filters,rows:data.rows,total:data.total,page:data.page,kind,configured:true}
}
