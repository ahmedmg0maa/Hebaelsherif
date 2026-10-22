import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'
import * as cairo from '../src/lib/booking/cairo-time.ts'
import * as calendar from '../src/lib/booking/admin-calendar.ts'

const require=createRequire(import.meta.url)
const Agenda=()=>null
let bookingError=null,profileError=null,exactCount=1
const names=[]
const row={id:'booking-fixture',user_id:'customer-fixture',starts_at:'2026-10-18T08:00:00Z',ends_at:'2026-10-18T09:00:00Z',status:'confirmed',services:{title:'جلسة خاصة'},booking_events:[],booking_reschedule_requests:[],customer_notes:null,admin_notes:''}
const db={from(table){
 if(table==='profiles')return {select(){return this},async in(key,ids){names.push([key,ids]);return {data:[{id:'customer-fixture',full_name:'اسم اختبار'}],error:profileError}}}
 assert.equal(table,'bookings')
 return {select(columns){assert(!columns.includes('profiles('),'profiles is not a bookings foreign-key embed');assert(columns.includes('user_id'));return this},gte(){return this},lt(){return this},order(){return this},async limit(){return {data:[row],error:bookingError,count:exactCount}}}
}}
const sandboxModule={exports:{}}
const source=ts.transpileModule(readFileSync('src/app/admin/bookings/page.tsx','utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
vm.runInNewContext(source,{module:sandboxModule,exports:sandboxModule.exports,require:name=>{
 if(name==='@/lib/supabase/server')return {getServerClient:async()=>db}
 if(name==='@/lib/booking/cairo-time')return cairo
 if(name==='@/lib/booking/admin-calendar')return calendar
 if(name==='@/components/admin/BookingAgenda')return {BookingAgenda:Agenda}
 if(name.startsWith('@/components/'))return new Proxy({},{get:()=>()=>null})
 if(name==='next/link')return ()=>null
 return require(name)
}})
function find(node,type){if(!node||typeof node!=='object')return null;if(node.type===type)return node;for(const child of [node.props?.children].flat(Infinity)){const found=find(child,type);if(found)return found}return null}
const run=()=>sandboxModule.exports.default({searchParams:Promise.resolve({date:'2026-10-18',view:'week'})})
const rendered=await run()
assert.equal(find(rendered,Agenda).props.bookings[0].customerName,'اسم اختبار')
assert.equal(names.length,1);assert.equal(names[0][0],'id');assert.deepEqual(Array.from(names[0][1]),['customer-fixture'])
bookingError={code:'PGRST200'};await assert.rejects(run,/BOOKING_CALENDAR_READ_INCOMPLETE/)
bookingError=null;exactCount=2;await assert.rejects(run,/BOOKING_CALENDAR_READ_INCOMPLETE/)
exactCount=1;profileError={code:'42501'};await assert.rejects(run,/BOOKING_CALENDAR_PROFILE_READ_FAILED/)
console.log('PASS actual booking page resolves customer names without a nonexistent relation and rejects query errors/truncated periods')
