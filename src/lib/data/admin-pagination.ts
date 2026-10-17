import {getServerClient} from '@/lib/supabase/server'
import {hasSupabasePublicConfig} from '@/lib/supabase/public-key'
export type AdminPageQuery=Record<string,string|undefined>
export type AdminPageOptions={searchColumn?:string;statusColumn?:string;statuses?:readonly string[];statusFilters?:Record<string,{column:string;value:string|boolean|null;not?:boolean}>;orderBy?:string;idColumn?:string;ascending?:boolean;pageSize?:number;prefix?:string;equals?:Record<string,string>;notEquals?:Record<string,string>;inValues?:Record<string,string[]>;nulls?:string[]}
export type AdminPageResult<T>={rows:T[];total:number;page:number;pageSize:number;q:string;status:string;prefix:string;configured:boolean}
export function adminPageFilters(input:AdminPageQuery,options:AdminPageOptions={}){
 const prefix=options.prefix??'',raw=typeof input[prefix+'page']==='string'?input[prefix+'page']:undefined,page=raw&&/^\d{1,7}$/.test(raw)?Math.min(1000000,Math.max(1,Number(raw))):1
 const requested=typeof input[prefix+'status']==='string'?input[prefix+'status']!:'all',valid=options.statusFilters?Object.keys(options.statusFilters):options.statuses??[]
 return {q:(typeof input[prefix+'q']==='string'?input[prefix+'q']!:'').trim().slice(0,120),status:valid.includes(requested)?requested:'all',page,pageSize:Math.min(100,Math.max(1,options.pageSize??25)),prefix}
}
// All column/table/order names are server constants supplied by the caller.
// Search is a bound ilike value, never interpolated into a PostgREST OR grammar.
export async function adminPagedList<T>(table:string,columns:string,input:AdminPageQuery,options:AdminPageOptions={}):Promise<AdminPageResult<T>>{
 const filters=adminPageFilters(input,options)
 if(!hasSupabasePublicConfig())return {...filters,rows:[],total:0,configured:false}
 const db=await getServerClient()
 async function read(page:number,head=false):Promise<{rows:T[];total:number;outOfRange?:boolean}>{
  let query=db.from(table).select(columns,{count:'exact',head})
  if(filters.q&&options.searchColumn)query=query.ilike(options.searchColumn,`%${filters.q.replace(/[\\%_]/g,'\\$&')}%`)
  if(filters.status!=='all'){
   const rule=options.statusFilters?.[filters.status]
   if(rule){if(rule.value===null)query=rule.not?query.not(rule.column,'is',null):query.is(rule.column,null);else query=query.eq(rule.column,rule.value)}
   else query=query.eq(options.statusColumn??'status',filters.status)
  }
  for(const [key,value] of Object.entries(options.equals??{}))query=query.eq(key,value)
  for(const [key,value] of Object.entries(options.notEquals??{}))query=query.neq(key,value)
  for(const [key,value] of Object.entries(options.inValues??{}))query=query.in(key,value)
  for(const key of options.nulls??[])query=query.is(key,null)
  const {data,error,count}=await query.order(options.orderBy??'created_at',{ascending:options.ascending??false}).order(options.idColumn??'id',{ascending:options.ascending??false}).range((page-1)*filters.pageSize,page*filters.pageSize-1)
  if(error?.code==='PGRST103'&&page>1&&!head)return {rows:[],total:-1,outOfRange:true}
  if(head){if(error||!Number.isSafeInteger(count)||Number(count)<0)throw Error('ADMIN_PAGED_COUNT_UNAVAILABLE');return {rows:[],total:Number(count)}}
  if(error||!Number.isSafeInteger(count)||Number(count)<0||!Array.isArray(data))throw Error('ADMIN_PAGED_READ_UNAVAILABLE')
  const expected=Math.min(filters.pageSize,Math.max(0,Number(count)-(page-1)*filters.pageSize))
  if(data.length!==expected)throw Error('ADMIN_PAGED_READ_INCOMPLETE')
  return {rows:data as unknown as T[],total:Number(count)}
 }
 let result=await read(filters.page)
 if(result.outOfRange){const counted=await read(1,true);filters.page=Math.max(1,Math.ceil(counted.total/filters.pageSize));result=await read(filters.page);if(result.outOfRange)throw Error('ADMIN_PAGED_READ_CHANGED_RETRY')}
 const last=Math.max(1,Math.ceil(result.total/filters.pageSize))
 if(filters.page>last){filters.page=last;result=await read(last)}
 return {...filters,...result,configured:true}
}

export async function adminRelatedRows<T>(table:string,columns:string,parentColumn:string|null,parentIds:string[],orderBy='id',idColumn='id'):Promise<T[]>{
 if(parentColumn&&!parentIds.length)return []
 const rows:T[]=[];let page=1
 do{const result=await adminPagedList<T>(table,columns,{page:String(page)},{...(parentColumn?{inValues:{[parentColumn]:parentIds}}:{}),orderBy,idColumn,pageSize:100,ascending:true});if(!result.configured)throw Error('ADMIN_RELATED_READ_UNAVAILABLE');rows.push(...result.rows);if(rows.length===result.total)return rows;page++;if(page>100)throw Error('ADMIN_RELATED_READ_TOO_LARGE')}while(true)
}
