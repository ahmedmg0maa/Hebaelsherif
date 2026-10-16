import {createRequire} from 'node:module'
import {existsSync,mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import assert from 'node:assert/strict'
import {normalizePaymentSettings} from '../src/lib/payments/settings.ts'
const require=createRequire(import.meta.url),{build}=createRequire(require.resolve('vite'))('esbuild')
const directory=mkdtempSync(join(tmpdir(),'heba-readiness-'))
try {
 await build({entryPoints:['src/lib/data/cms.ts'],outfile:join(directory,'cms.mjs'),bundle:true,platform:'node',format:'esm',packages:'external',plugins:[{name:'read-only-db-fixtures',setup(tool){
  tool.onResolve({filter:/^server-only$/},()=>({path:'empty',namespace:'fixture'}))
  tool.onResolve({filter:/^@\/lib\/auth\/permissions$/},()=>({path:'permissions',namespace:'fixture'}))
  tool.onResolve({filter:/^@\/lib\/supabase\/(server|public-key)$/},args=>({path:args.path,namespace:'fixture'}))
  tool.onResolve({filter:/^\.\/booking$/},args=>args.importer.endsWith('/data/cms.ts')?{path:'booking',namespace:'fixture'}:null)
  tool.onResolve({filter:/^@\//},args=>{const base=resolve('src',args.path.slice(2));const path=['.ts','.tsx'].map(ext=>base+ext).find(existsSync);return path?{path}:null})
  tool.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:args.path==='empty'?'':args.path==='permissions'?'export const requirePermission=async()=>globalThis.readinessFixture.permission;':args.path==='booking'?'export const getBookingExperience=async()=>globalThis.readinessFixture.experience;':args.path.endsWith('/public-key')?'export const hasSupabasePublicConfig=()=>globalThis.readinessFixture.configured;':`export const getServerClient=async()=>globalThis.readinessFixture.client;export const getServiceClient=()=>{globalThis.readinessFixture.serviceReads++;return globalThis.readinessFixture.client};export const hasSupabaseServerSecret=()=>true;`,loader:'js'}))
 }}]})
 const {getContentReadiness}=await import(pathToFileURL(join(directory,'cms.mjs')))
 const valid={payment_instapay:{handle:'owner@example.test',name:'Test owner'},payment_wallet:{number:'010 1234 5678',provider:'Wallet'},payment_bank:{bank:'Bank',name:'Test owner',iban:'EG380019000500000000263180002'},order_expiry_hours:{hours:48}}
 assert.equal(normalizePaymentSettings(valid).wallet.number,'01012345678')
 assert.equal(normalizePaymentSettings(valid).expiryHours,48)
 for(const invalid of [null,[],{payment_instapay:{}},{payment_wallet:{number:'not-a-number',provider:'Wallet'}},{payment_bank:{iban:'bad',name:'Name',bank:'Bank'}},{payment_instapay:{handle:{},name:'Name'}}]) {
  const result=normalizePaymentSettings(invalid);assert.deepEqual([result.instapay,result.wallet,result.bank],[null,null,null])
 }
 assert.equal(normalizePaymentSettings({order_expiry_hours:{hours:-1}}).expiryHours,72)
 const goodRows={products:{count:1,error:null},articles:{count:1,error:null},site_settings:{data:[{key:'payment_instapay',value:valid.payment_instapay}],error:null},pages:{count:5,error:null}}
 const contract={data:{revision:'102',freeOperations:'102',calendar:'097',owner:'096'},error:null}
 const experience={runtime:{status:'ready',detail:'fixture'},services:[{availableSlots:{'2026-10-13':['10:00']}}]}
 function fixture(rows=goodRows,runtime=contract,book=experience,configured=true) {
  const methods=['select','eq','in','not','is','order','limit','maybeSingle']
  const client={rpc:async()=>runtime,from:table=>{const query={then:done=>Promise.resolve(rows[table]).then(done)};for(const name of methods)query[name]=()=>query;return query}}
  globalThis.readinessFixture={client,configured,experience:book,permission:{userId:'admin-fixture'},serviceReads:0}
 }
 const status=(items,id)=>items.find(item=>item.id===id)?.status
 fixture();let items=await getContentReadiness()
 assert.equal(status(items,'connection'),'ready');assert.equal(status(items,'booking'),'ready');assert.equal(status(items,'database-change'),'ready')
 assert.equal(status(items,'recovery'),'unknown');assert.equal(status(items,'auth-redirects'),'unknown')
 fixture(goodRows,contract,{...experience,services:[{availableSlots:{}}]});items=await getContentReadiness();assert.equal(status(items,'booking'),'blocked')
 fixture({...goodRows,site_settings:{data:[{key:'payment_instapay',value:{handle:'x'}}],error:null}});items=await getContentReadiness();assert.equal(status(items,'payments'),'needs-content')
 fixture(Object.fromEntries(Object.keys(goodRows).map(key=>[key,{data:null,count:null,error:{message:'fixture denial'}}])),{data:null,error:{message:'denied'}});items=await getContentReadiness();assert.equal(status(items,'connection'),'unknown');assert.equal(status(items,'database-change'),'unknown');assert.equal(status(items,'legal'),'unknown')
 fixture(goodRows,{data:{revision:'101'},error:null});items=await getContentReadiness();assert.equal(status(items,'database-change'),'blocked')
  fixture();globalThis.readinessFixture.permission=null;items=await getContentReadiness();assert.equal(status(items,'database-change'),'unknown');assert.equal(globalThis.readinessFixture.serviceReads,0)
 fixture(goodRows,contract,{runtime:{status:'migration-required',detail:'calendar missing'},services:[]});items=await getContentReadiness();assert.equal(status(items,'booking'),'blocked')
 fixture(goodRows,contract,experience,false);items=await getContentReadiness();assert.equal(status(items,'connection'),'unconfigured');assert.equal(status(items,'database-change'),'unconfigured')
 assert(!JSON.stringify(items).includes('043 وحدها'))
 console.log('PASS actual payment normalization and readiness: healthy, empty slots, invalid settings, failed reads, missing revision/calendar and unconfigured states. Database replies injected; no provider access.')
} finally {delete globalThis.readinessFixture;rmSync(directory,{recursive:true,force:true})}
