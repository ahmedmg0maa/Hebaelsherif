import assert from 'node:assert/strict'
import {sourceLoader} from './lib/load-source.mjs'
let allowed=true,fault=false,incomplete=false,requested='',calls=[],exactCalls=[]
const savedId=n=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`
const savedRows=[{id:savedId(1),title:'كورس قديم خارج صفحة البحث',is_published:true},{id:savedId(2),title:'كتاب مؤرشف محفوظ',archived_at:'2026-10-01'},{id:savedId(3),title:'جلسة غير منشورة',is_published:false},{id:savedId(4),title:'خدمة متوقفة',is_active:false,products:{archived_at:null,is_published:true}}]
const row={id:'choice-id',title:'اختيار تجريبي',slug:'test-article',type:'course',kind:'image',alt:'وصف تجريبي',bucket:'public-media',path:'test/cover.webp',full_name:'عميلة اختبار',email:'fixture@example.invalid'}
const paged=async(table,columns,input,options)=>{calls.push({table,columns,input,options});if(fault)throw Error('provider failure including private content');return {rows:[row],total:1257,page:input.page?Number(input.page):1,pageSize:25,configured:true}}
const load=sourceLoader({
 '@/lib/auth/permissions':{requirePermission:async permission=>{requested=permission;return allowed?{userId:'actor'}:null}},
 '@/lib/data/admin-pagination':{adminPagedList:paged},
 '@/lib/data/admin-customer-pages':{adminCustomerPage:async(actor,input)=>paged('customers','',input,{actor})},
 '@/lib/supabase/server': {
  getServiceClient: () => ({rpc: async(name,args) => {
   exactCalls.push({name,args})
   return {data:{profile:{id:args.p_customer_id,fullName:'عميلة اختبار',email:'fixture@example.invalid'}},error:null}
  }}),
  getServerClient: async() => ({
   storage:{from:()=>({getPublicUrl:()=>({data:{publicUrl:'https://example.invalid/public/cover.webp'}})})},
   from:table=>({select:columns=>({
    eq:()=>({single:async()=>({data:{bucket:'protected-books',kind:'document',visibility:'private'},error:null})}),
    in:(column,ids)=>({limit:async limit=>{
     exactCalls.push({table,columns,column,ids,limit})
     return fault?{data:null,error:{message:'provider secret'}}:{data:table==='articles'?[{slug:ids[0],title:'مقال قديم',status:'draft',is_published:false}]:savedRows.filter(row=>ids.includes(row.id)),error:null,count:incomplete?999:table==='articles'?1:savedRows.filter(row=>ids.includes(row.id)).length}
    }}),
   })}),
  }),
 },
})
const {searchAdminChoices,resolveAdminChoices}=load('src/lib/actions/admin-choices.ts'),plain=x=>JSON.parse(JSON.stringify(x))
allowed=false;assert.equal((await searchAdminChoices('customer','اسم',1)).ok,false);assert.equal(calls.length,0);allowed=true
for(const kind of ['product','bundle-child','customer','media','plan','service','package','home-media','article']){const result=await searchAdminChoices(kind,'قديم',41);assert.equal(result.ok,true);assert.equal(result.total,1257);assert.equal(result.page,41);assert.equal(calls.at(-1).input.q,'قديم')}
assert(calls.find(call=>call.table==='services').columns.includes('products!inner'))
assert.deepEqual(plain(calls.find(call=>call.table==='services').options.nulls),['products.archived_at'])
assert(calls.some(call=>call.options.inValues?.rights_status?.includes('licensed')))
const replacement=await searchAdminChoices('media-replacement','قديم',2,'00000000-0000-4000-8000-000000000001');assert.equal(replacement.ok,true);assert.equal(requested,'media.manage');assert(!replacement.items[0].url);assert.deepEqual(plain(calls.at(-1).options.equals),{bucket:'protected-books',kind:'document',visibility:'private'})
fault=true;const failed=await searchAdminChoices('product','أي عنوان',1);assert.equal(failed.ok,false);assert(!failed.error.includes('provider'));assert(!failed.error.includes('private content'))
console.log('PASS actual choice action: server pagination for old customer/product/media/article/plan/service records; permission denial and sanitized failure')
console.log('PASS Home media rights/public-only filter; replacement preserves bucket/kind/privacy and exposes no protected URL')
fault=false
const ids=[savedId(1),savedId(2),savedId(3),savedId(99)],resolved=await resolveAdminChoices('bundle-child',ids)
assert.equal(resolved.ok,true);assert.deepEqual(plain(resolved.items.map(row=>row.id)),ids)
assert.deepEqual(plain(resolved.items.map(row=>row.state)),['available','archived','hidden','unavailable'])
assert.equal(resolved.items[0].label,savedRows[0].title);assert(!exactCalls.at(-1).columns.includes('path'));assert(!resolved.items.some(row=>row.url))
assert.equal((await resolveAdminChoices('service',[savedId(4)])).items[0].state,'inactive')
assert.equal((await resolveAdminChoices('article',['old-article'])).items[0].state,'hidden')
assert.equal((await resolveAdminChoices('customer',[savedId(1)])).items[0].label,'عميلة اختبار — fixture@example.invalid')
assert.equal(exactCalls.at(-1).name,'get_admin_customer_360');assert.equal(requested,'users.view')
await resolveAdminChoices('product',Array.from({length:200},(_,i)=>savedId(i+1)))
assert.equal(exactCalls.at(-1).ids.length,100);assert.equal(exactCalls.at(-2).ids.length,100)
const before=exactCalls.length;allowed=false;assert.equal((await resolveAdminChoices('product',ids)).ok,false);assert.equal(exactCalls.length,before);allowed=true
for(const [kind,bad] of [['product',['not-a-uuid']],['article',['../bad']],['product',Array(201).fill(savedId(1))],['customer',[savedId(1),savedId(2)]]])assert.equal((await resolveAdminChoices(kind,bad)).ok,false)
assert.equal(exactCalls.length,before)
fault=true;const unavailable=await resolveAdminChoices('product',ids);assert.equal(unavailable.ok,false);assert(!unavailable.error.includes('provider'));assert(!unavailable.error.includes('secret'))
fault=false;incomplete=true;assert.equal((await resolveAdminChoices('product',ids)).ok,false)
console.log('PASS exact-ID hydration: old/archived/hidden/inactive/missing references; bounded batches; scoped audited customer lookup; permission/input/provider failures preserve IDs')
