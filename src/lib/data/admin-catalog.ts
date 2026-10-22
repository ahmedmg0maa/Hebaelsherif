import { getServerClient } from '@/lib/supabase/server'
import { hasSupabasePublicConfig } from '@/lib/supabase/public-key'
import { accountPage } from '@/lib/customer-order-state'
export type CatalogQuery={q?:string;status?:string;page?:string}
export function catalogQuery(input:CatalogQuery) {
  return {q:typeof input.q==='string'?input.q.trim().slice(0,120):'',status:['published','draft','archived'].includes(input.status??'')?input.status!:'all',page:accountPage(input.page)}
}
export async function adminCatalogPage<T>(table:'courses'|'books'|'workshops'|'services',columns:string,input:CatalogQuery) {
  const filters=catalogQuery(input)
  if(!hasSupabasePublicConfig())return {...filters,rows:[] as T[],total:0,configured:false}
  const supabase=await getServerClient()
  let query=supabase.from(table).select(columns,{count:'exact'})
  if(filters.q)query=query.ilike('title',`%${filters.q.replace(/[\\%_]/g,'\\$&')}%`)
  if(filters.status==='archived')query=query.not('products.archived_at','is',null)
  if(filters.status==='published'||filters.status==='draft')query=query.is('products.archived_at',null).eq(table==='services'?'is_active':'is_published',filters.status==='published')
  const {data,error,count}=await query.order('title',{ascending:true}).order('id',{ascending:true}).range((filters.page-1)*20,filters.page*20-1)
  if(error||count===null)throw new Error('ADMIN_DATA_READ_UNAVAILABLE')
  return {...filters,rows:(data??[])as unknown as T[],total:count,configured:true}
}

export async function adminContentPage<T>(table:'articles'|'pages'|'resources'|'press_mentions',columns:string,input:CatalogQuery) {
  const filters=catalogQuery(input)
  if(input.status==='scheduled')filters.status='scheduled'
  if(!hasSupabasePublicConfig())return {...filters,rows:[] as T[],total:0,configured:false}
  const supabase=await getServerClient()
  let query=supabase.from(table).select(columns,{count:'exact'})
  if(filters.q)query=query.ilike('title',`%${filters.q.replace(/[\\%_]/g,'\\$&')}%`)
  if(filters.status!=='all')query=query.eq('status',filters.status)
  const {data,error,count}=await query.order('title',{ascending:true}).order('id',{ascending:true}).range((filters.page-1)*20,filters.page*20-1)
  if(error||count===null)throw new Error('ADMIN_DATA_READ_UNAVAILABLE')
  return {...filters,rows:(data??[])as unknown as T[],total:count,configured:true}
}
