import { withUser } from './dashboard'
const unavailable=()=>{throw new Error('CUSTOMER_DASHBOARD_READ_UNAVAILABLE')}
export type AccountOrder={id:string;status:string;total:number;currency:string;createdAt:string;expiresAt:string|null;requestedMethod:string|null;products:{id:string;title:string}[]}
export type OrderDetail=AccountOrder & {payments:{id:string;status:string;method:string;createdAt:string;reason:string|null}[]}
const orderFields='id,status,total,currency,created_at,expires_at,requested_payment_method,order_items(products(id,title))'
function mapOrder(row:Record<string,unknown>):AccountOrder {
  const items=(row.order_items ?? []) as {products:{id:string;title:string}|{id:string;title:string}[]|null}[]
  return {id:String(row.id),status:String(row.status),total:Number(row.total),currency:String(row.currency),createdAt:String(row.created_at),expiresAt:row.expires_at as string|null,requestedMethod:row.requested_payment_method as string|null,products:items.flatMap(item=>{const product=Array.isArray(item.products)?item.products[0]:item.products;return product?[product]:[]})}
}
export async function getOrderHistory(page:number) {
  return withUser({items:[] as AccountOrder[],total:0},async(supabase,userId)=>{
    const {data,error,count}=await supabase.from('orders').select(orderFields,{count:'exact'}).eq('user_id',userId).order('created_at',{ascending:false}).order('id',{ascending:false}).range((page-1)*20,page*20-1)
    if(error || count===null) unavailable()
    return {items:(data??[]).map(row=>mapOrder(row)),total:count!}
  })
}
export async function getAccountOrder(id:string):Promise<OrderDetail|null> {
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return null
  return withUser<OrderDetail|null>(null,async(supabase,userId)=>{
    const {data,error}=await supabase.from('orders').select(orderFields).eq('id',id).eq('user_id',userId).maybeSingle()
    if(error) unavailable()
    if(!data) return null
    const result=await supabase.from('payments').select('id,status,method,created_at,reject_reason').eq('order_id',id).eq('user_id',userId).order('created_at',{ascending:false}).limit(50)
    if(result.error) unavailable()
    return {...mapOrder(data),payments:(result.data??[]).map(p=>({id:p.id,status:p.status,method:p.method,createdAt:p.created_at,reason:p.reject_reason}))}
  })
}
export type MySubscription={id:string;status:string;startsAt:string;endsAt:string;archivedAt:string|null;orderId:string|null;title:string;sessionsIncluded:number;balance:number;eligibleServices:{id:string;title:string}[]}
export async function getMySubscriptions(page:number) {
  return withUser({total:0,items:[] as MySubscription[]},async supabase=>{
    const {data,error}=await supabase.rpc('my_subscription_account',{p_page:page})
    if(error || !data || !Number.isSafeInteger(data.total) || !Array.isArray(data.items)) unavailable()
    return data as {total:number;items:MySubscription[]}
  })
}
export async function getAccountCounts() {
  return withUser({courses:0,books:0,unread:0},async(supabase,userId)=>{
    const results=await Promise.all([
      supabase.from('course_enrollments').select('course_id',{count:'exact',head:true}).eq('user_id',userId),
      supabase.from('book_access').select('book_id',{count:'exact',head:true}).eq('user_id',userId),
      supabase.from('notifications').select('id',{count:'exact',head:true}).eq('user_id',userId).is('read_at',null),
    ])
    if(results.some(r=>r.error || r.count===null)) unavailable()
    return {courses:results[0].count!,books:results[1].count!,unread:results[2].count!}
  })
}

const collectionTables={courses:'course_enrollments',books:'book_access',workshops:'workshop_registrations',bookings:'bookings',payments:'payments',notifications:'notifications'} as const
export async function getCollectionCount(collection:keyof typeof collectionTables) {
  return withUser(0,async(supabase,userId)=>{
    let query=supabase.from(collectionTables[collection]).select('*',{count:'exact',head:true}).eq('user_id',userId)
    if(collection==='workshops')query=query.neq('status','cancelled')
    const {count,error}=await query
    if(error||count===null)unavailable()
    return count!
  })
}
