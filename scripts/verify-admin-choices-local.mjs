import assert from 'node:assert/strict'
import {sourceLoader} from './lib/load-source.mjs'
let allowed=true,fault=false,requested='',calls=[]
const row={id:'choice-id',title:'اختيار تجريبي',slug:'test-article',type:'course',kind:'image',alt:'وصف تجريبي',bucket:'public-media',path:'test/cover.webp',full_name:'عميلة اختبار',email:'fixture@example.invalid'}
const paged=async(table,columns,input,options)=>{calls.push({table,columns,input,options});if(fault)throw Error('provider failure including private content');return {rows:[row],total:1257,page:input.page?Number(input.page):1,pageSize:25,configured:true}}
const load=sourceLoader({
 '@/lib/auth/permissions':{requirePermission:async permission=>{requested=permission;return allowed?{userId:'actor'}:null}},
 '@/lib/data/admin-pagination':{adminPagedList:paged},
 '@/lib/data/admin-customer-pages':{adminCustomerPage:async(actor,input)=>paged('customers','',input,{actor})},
 '@/lib/supabase/server':{getServerClient:async()=>({storage:{from:()=>({getPublicUrl:()=>({data:{publicUrl:'https://example.invalid/public/cover.webp'}})})},from:()=>({select:()=>({eq:()=>({single:async()=>({data:{bucket:'protected-books',kind:'document',visibility:'private'},error:null})})})})})},
})
const {searchAdminChoices}=load('src/lib/actions/admin-choices.ts'),plain=x=>JSON.parse(JSON.stringify(x))
allowed=false;assert.equal((await searchAdminChoices('customer','اسم',1)).ok,false);assert.equal(calls.length,0);allowed=true
for(const kind of ['product','bundle-child','customer','media','plan','service','package','home-media','article']){const result=await searchAdminChoices(kind,'قديم',41);assert.equal(result.ok,true);assert.equal(result.total,1257);assert.equal(result.page,41);assert.equal(calls.at(-1).input.q,'قديم')}
assert(calls.find(call=>call.table==='services').columns.includes('products!inner'))
assert.deepEqual(plain(calls.find(call=>call.table==='services').options.nulls),['products.archived_at'])
assert(calls.some(call=>call.options.inValues?.rights_status?.includes('licensed')))
const replacement=await searchAdminChoices('media-replacement','قديم',2,'00000000-0000-4000-8000-000000000001');assert.equal(replacement.ok,true);assert.equal(requested,'media.manage');assert(!replacement.items[0].url);assert.deepEqual(plain(calls.at(-1).options.equals),{bucket:'protected-books',kind:'document',visibility:'private'})
fault=true;const failed=await searchAdminChoices('product','أي عنوان',1);assert.equal(failed.ok,false);assert(!failed.error.includes('provider'));assert(!failed.error.includes('private content'))
console.log('PASS actual choice action: server pagination for old customer/product/media/article/plan/service records; permission denial and sanitized failure')
console.log('PASS Home media rights/public-only filter; replacement preserves bucket/kind/privacy and exposes no protected URL')
