import {createRequire} from 'node:module'
import{existsSync,mkdtempSync,rmSync}from'node:fs'
import{tmpdir}from'node:os'
import{join,resolve}from'node:path'
import{pathToFileURL}from'node:url'
import assert from'node:assert/strict'
const require=createRequire(import.meta.url),{build}=createRequire(require.resolve('vite'))('esbuild'),directory=mkdtempSync(join(tmpdir(),'heba-overview-'))
try{
 await build({entryPoints:['src/lib/data/admin.ts'],outfile:join(directory,'admin.mjs'),bundle:true,platform:'node',format:'esm',plugins:[{name:'overview-db-fixtures',setup(tool){
  tool.onResolve({filter:/^@\/lib\/supabase\/(server|public-key)$/},args=>({path:args.path,namespace:'fixture'}))
  tool.onResolve({filter:/^@\//},args=>{const base=resolve('src',args.path.slice(2));const path=['.ts','.tsx'].map(ext=>base+ext).find(existsSync);return path?{path}:null})
  tool.onLoad({filter:/.*/,namespace:'fixture'},args=>({loader:'js',contents:args.path.endsWith('/public-key')?'export const hasSupabasePublicConfig=()=>globalThis.overviewFixture.configured;':'export const getServerClient=async()=>globalThis.overviewFixture.client;'}))
 }}]})
 const {getAdminOverviewCounts,getAdminKpis}=await import(pathToFileURL(join(directory,'admin.mjs')))
 function setup(rows,configured=true){globalThis.overviewFixture={configured,client:{from:table=>{const query={then:done=>Promise.resolve(rows[table]).then(done)};for(const method of ['select','eq','in','gte'])query[method]=()=>query;return query}}}}
 setup({booking_reschedule_requests:{count:123,error:null},system_events:{count:67,error:null}})
 assert.deepEqual(await getAdminOverviewCounts(),{reschedules:123,alerts:67})
 setup({booking_reschedule_requests:{count:null,error:{message:'fixture denied'}},system_events:{count:0,error:null}})
 assert.deepEqual(await getAdminOverviewCounts(),{reschedules:null,alerts:0})
 setup({},false);assert.deepEqual(await getAdminOverviewCounts(),{reschedules:null,alerts:null})
 setup({orders:{data:[],count:0,error:null},payments:{count:0,error:null},course_enrollments:{count:0,error:null},bookings:{data:[],count:0,error:null}})
 assert.equal((await getAdminKpis()).health,'ready')
 setup({orders:{data:[],count:1001,error:null},payments:{count:0,error:null},course_enrollments:{count:0,error:null},bookings:{data:[],count:0,error:null}})
 assert.equal((await getAdminKpis()).health,'unknown')
 setup({orders:{data:[],count:0,error:null},payments:{count:0,error:null},course_enrollments:{count:0,error:null},bookings:{data:[],count:1001,error:null}})
 assert.equal((await getAdminKpis()).health,'unknown')
 console.log('PASS actual overview counters above old 20-row boundary, real zero versus failed/unconfigured read. Provider replies injected.')
}finally{delete globalThis.overviewFixture;rmSync(directory,{recursive:true,force:true})}
