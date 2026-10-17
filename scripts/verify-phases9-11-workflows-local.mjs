import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {resolve,dirname} from 'node:path'
import {createRequire} from 'node:module'
import ts from 'typescript'
const require=createRequire(import.meta.url)
let passed=0
const check=async(name,fn)=>{await fn();passed++;console.log(`PASS ${name}`)}
function load(file,imports={}) {
 const path=resolve(file),out={exports:{}}
 const js=ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText
 new Function('require','module','exports',js)(name=>{if(name in imports)return imports[name];if(name==='@/lib/uploads/limits.mjs')return require('../src/lib/uploads/limits.mjs');if(name==='@/lib/booking/cairo-time')return load('src/lib/booking/cairo-time.ts',imports);if(name==='@/lib/time/cairo-periods')return load('src/lib/time/cairo-periods.ts',imports);if(name.startsWith('.'))return load(resolve(dirname(path),name+(name.endsWith('.ts')?'':'.ts')),imports);return require(name)},out,out.exports)
 return out.exports
}
const state=load('src/lib/customer-order-state.ts'),nav=load('src/lib/admin-navigation.ts')
const now=Date.parse('2026-09-22T12:00:00Z')
await check('payment continuation denies every terminal/review/unknown/invalid deadline state',()=>{
 assert.equal(state.customerOrderState({status:'pending_payment',expiresAt:'2026-09-22T12:01:00Z'},now).canSubmit,true)
 for(const status of ['paid','awaiting_review','expired','cancelled','refunded','refund_pending','unknown'])assert.equal(state.customerOrderState({status,expiresAt:'2099-01-01'},now).canSubmit,false)
 for(const expiresAt of [null,'bad','2026-09-22T12:00:00Z','2000-01-01'])assert.equal(state.customerOrderState({status:'pending_payment',expiresAt},now).canSubmit,false)
 assert.notEqual(state.orderStates.refunded.label,state.orderStates.refund_pending.label)
})
await check('subscription eligibility excludes archived, paused, future, expired and empty balances',()=>{
 const base={status:'active',startsAt:'2026-09-01',endsAt:'2026-10-01',archivedAt:null,balance:2}
 assert.equal(state.subscriptionState(base,now).usable,true)
 for(const override of [{status:'paused'},{status:'cancelled'},{status:'pending'},{archivedAt:'2026-09-20'},{startsAt:'2099-01-01'},{endsAt:'2026-09-01'},{balance:0}])assert.equal(state.subscriptionState({...base,...override},now).usable,false)
})
await check('page parsing rejects arrays, expressions, negatives and unsafe ranges',()=>{
 for(const value of [undefined,null,{},['2'],'1e3','2 OR true','-3','Infinity'])assert.equal(state.accountPage(value),1)
 assert.equal(state.accountPage('999999'),100000);assert.equal(state.accountPage('2'),2)
})
await check('navigation filters operations by effective permission and normalizes Arabic',()=>{
 const hrefs=permissions=>nav.adminNavigation(permissions).flatMap(s=>s.items.map(i=>i.href))
 assert.deepEqual(hrefs([]),['/admin/overview'])
 assert(hrefs(['catalog.view']).includes('/admin/services'));assert(!hrefs(['catalog.view']).includes('/admin/roles'))
 assert(hrefs(['assessments.manage']).includes('/admin/assessments'));assert(!hrefs(['assessments.manage']).includes('/admin/users'))
 assert.equal(nav.normalizeNavigationQuery('إِدَارَة'),nav.normalizeNavigationQuery('ادارة'))
})
const user='10000000-0000-4000-8000-000000000001',order='20000000-0000-4000-8000-000000000001'
function account(responses,{authError=null,authenticated=true}={}) {
 const calls=[]
 const client={auth:{getUser:async()=>({data:{user:authenticated?{id:user}:null},error:authError})},from(table){const call={table,ops:[]};calls.push(call);const query=new Proxy({}, {get(_,key){if(key==='then')return(resolve,reject)=>Promise.resolve(responses.shift()).then(resolve,reject);return(...args)=>{call.ops.push([key,...args]);return query}}});return query},rpc:async(name,args)=>{calls.push({rpc:name,args});return responses.shift()}}
 const dashboard=load('src/lib/data/dashboard.ts',{'@/lib/supabase/server':{getServerClient:async()=>client},'@/lib/supabase/public-key':{hasSupabasePublicConfig:()=>true}})
 const api=load('src/lib/data/customer-account.ts',{'./dashboard':dashboard})
 return {api,calls,dashboard}
}
await check('order detail filters by both order ID and authenticated owner before reading payment history',async()=>{
 const row={id:order,status:'pending_payment',total:250,currency:'EGP',created_at:'2026-09-22',expires_at:'2099-01-01',requested_payment_method:'wallet',order_items:[{products:{id:order,title:'كتاب'}}]}
 const {api,calls}=account([{data:row,error:null},{data:[{id:order,status:'rejected',method:'wallet',created_at:'2026-09-22',reject_reason:'مراجعة'}],error:null}])
 const result=await api.getAccountOrder(order);assert.equal(result.requestedMethod,'wallet');assert.equal(result.total,250);assert.equal(result.payments[0].reason,'مراجعة')
 assert(calls[0].ops.some(op=>op[0]==='eq'&&op[1]==='user_id'&&op[2]===user));assert(calls[0].ops.some(op=>op[0]==='eq'&&op[1]==='id'&&op[2]===order));assert(calls[1].ops.some(op=>op[0]==='eq'&&op[1]==='user_id'&&op[2]===user))
})
await check('foreign/missing/invalid orders are absent and never fetch payment details',async()=>{
 const a=account([{data:null,error:null}]);assert.equal(await a.api.getAccountOrder(order),null);assert.equal(a.calls.length,1)
 const b=account([]);assert.equal(await b.api.getAccountOrder('../other'),null);assert.equal(b.calls.length,0)
 const c=account([],{authenticated:false});assert.equal(await c.api.getAccountOrder(order),null);assert.equal(c.calls.length,0)
})
await check('auth/query failures stay sanitized rather than returning fake empty records',async()=>{
 for(const scenario of [account([],{authError:{message:'PRIVATE'}}),account([{error:{message:'PRIVATE'},data:null}])])await assert.rejects(()=>scenario.api.getAccountOrder(order),error=>error.message==='CUSTOMER_DASHBOARD_READ_UNAVAILABLE')
 const a=account([{count:null,error:null,data:[]}]);await assert.rejects(()=>a.api.getOrderHistory(1),/CUSTOMER_DASHBOARD_READ_UNAVAILABLE/)
})
await check('order pages retain total above the window; exact count failures do not become zero',async()=>{
 const a=account([{data:[],error:null,count:245}]);assert.equal((await a.api.getOrderHistory(12)).total,245);assert(a.calls[0].ops.some(op=>op[0]==='range'&&op[1]===220&&op[2]===239))
 const b=account([{count:1001,error:null},{count:90,error:null},{count:75,error:null}]);assert.deepEqual(await b.api.getAccountCounts(),{courses:1001,books:90,unread:75})
 const c=account([{count:0,error:null},{count:null,error:{message:'PRIVATE'}},{count:0,error:null}]);await assert.rejects(()=>c.api.getAccountCounts(),/CUSTOMER_DASHBOARD_READ_UNAVAILABLE/)
})
await check('workshop counts exclude cancelled registrations and subscription reader requires complete result',async()=>{
 const a=account([{count:20,error:null}]);assert.equal(await a.api.getCollectionCount('workshops'),20);assert(a.calls[0].ops.some(op=>op[0]==='neq'&&op[1]==='status'&&op[2]==='cancelled'))
 const b=account([{data:{total:22,items:[]},error:null}]);assert.equal((await b.api.getMySubscriptions(2)).total,22);assert.deepEqual(b.calls[0],{rpc:'my_subscription_account',args:{p_page:2}})
 const c=account([{data:{items:[]},error:null}]);await assert.rejects(()=>c.api.getMySubscriptions(1),/CUSTOMER_DASHBOARD_READ_UNAVAILABLE/)
})

await check('payment amounts retain the recorded order currency',async()=>{
 const a=account([{data:[{id:order,order_id:order,method:'bank_transfer',amount:20,status:'approved',created_at:'2026-09-22'}],error:null},{data:[{id:order,status:'paid',expires_at:null,currency:'USD'}],error:null},{data:[],error:null}])
 assert.equal((await a.dashboard.getMyPayments(1))[0].currency,'USD')
})
function lifecycle({allowed=true,result={data:{id:order,slug:'fixture'}}}={}) {
 const calls=[],invalidations=[]
 const api=load('src/lib/actions/admin-control.ts',{
  'next/cache':{revalidatePath:()=>{}},'@/lib/supabase/server':{hasSupabaseServerSecret:()=>true,getServiceClient:()=>({rpc:async(name,args)=>{calls.push({name,args});return result}})},
  '@/lib/auth/permissions':{requirePermission:async()=>allowed?{userId:user,role:'owner'}:null},
  '@/lib/booking/cairo-time':{},'@/lib/catalog/editor':{},'@/lib/catalog/publication-readiness':{},'@/lib/admin/commerce-editor':{},
  '@/lib/catalog/mutation':{catalogMutationError:()=> 'نتيجة غير مؤكدة',revalidateCatalogMutation:(...args)=>invalidations.push(args)},
 })
 return {api,calls,invalidations}
}
await check('catalog action denies unauthorized or malformed calls without a service mutation',async()=>{
 const denied=lifecycle({allowed:false});assert.equal((await denied.api.changeCatalogLifecycle('book',order,'archive',null)).ok,false);assert.equal(denied.calls.length,0)
 const a=lifecycle();for(const args of [['x',order,'archive',null],['book','bad','archive',null],['book',order,'publish',null],['book',order,'restore','bad']])assert.equal((await a.api.changeCatalogLifecycle(...args)).ok,false);assert.equal(a.calls.length,0)
})
await check('catalog action binds server actor and exact archive version; failed writes do not revalidate',async()=>{
 const a=lifecycle();assert.equal((await a.api.changeCatalogLifecycle('book',order,'restore','2026-09-22T12:00:00.123456Z')).ok,true)
 assert.deepEqual(a.calls[0],{name:'manage_catalog_lifecycle',args:{p_actor_id:user,p_kind:'book',p_id:order,p_action:'restore',p_expected_archived_at:'2026-09-22T12:00:00.123456Z'}});assert.equal(a.invalidations.length,1)
 const b=lifecycle({result:{data:null,error:{code:'40001',message:'PRIVATE'}}});const r=await b.api.changeCatalogLifecycle('book',order,'archive',null);assert.equal(r.ok,false);assert(!r.error.includes('PRIVATE'));assert.equal(b.invalidations.length,0)
})
console.log(JSON.stringify({passed,scope:'Actual TypeScript with injected provider responses; no Auth/Storage/browser acceptance implied'}))
