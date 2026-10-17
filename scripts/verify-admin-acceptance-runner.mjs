// Unit/contract checks only. Controlled replies here NEVER count as integration.
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {acceptanceConfig,projectRef,PRODUCTION_REF,ORIGIN} from './lib/admin-acceptance-config.mjs'
import {acceptanceDatabase,lastCsvRecord} from './lib/admin-acceptance-db.mjs'
import {migrationPlan,sourceMigrations,transactionBody,verifyDefinitions} from './lib/admin-acceptance-schema.mjs'
import {inspectAcceptance} from './check-admin-acceptance-environment.mjs'
import {totp,decodeAction,applicationClient} from './lib/admin-acceptance-http.mjs'
import {pdfFixture,pngFixture,movFixture} from './lib/admin-acceptance-files.mjs'
import {SUPABASE_PUBLIC_ENV_NAMES} from './public-config.mjs'

const ref='abcdefghijklmnopqrst',url=`https://${ref}.supabase.co`,env={[SUPABASE_PUBLIC_ENV_NAMES[0]]:url,[SUPABASE_PUBLIC_ENV_NAMES[1]]:'unit-public-value',SUPABASE_SECRET_KEY:'unit-server-value',NEXT_PUBLIC_SITE_URL:ORIGIN,HEBA_COST_MODE:'free',HEBA_DEPLOYMENT_ENV:'staging'}
const config=acceptanceConfig(env)
assert.equal(config.origin,ORIGIN)
assert.throws(()=>acceptanceConfig({}),/ISOLATED_PUBLIC_CONFIG_REQUIRED/)
for(const value of [`https://${PRODUCTION_REF}.supabase.co`,`https://user:pass@${ref}.supabase.co`,`http://${ref}.supabase.co`,url+'/rest/v1/',url+'?other=1'])assert.throws(()=>projectRef(value),/ISOLATED_PROJECT_REQUIRED/)
assert.throws(()=>acceptanceDatabase({...config,ref:PRODUCTION_REF}),/DATABASE_PROJECT_MISMATCH/)
assert.throws(()=>acceptanceConfig({...env,HEBA_COST_MODE:'paid'}),/FREE_LOOPBACK_STAGING_REQUIRED/)
assert.throws(()=>acceptanceConfig({...env,RESEND_API_KEY:'unit-value'}),/EXTERNAL_SIDE_EFFECT_PROVIDER_FORBIDDEN/)
assert.throws(()=>acceptanceConfig({...env,[SUPABASE_PUBLIC_ENV_NAMES[1]]:env.SUPABASE_SECRET_KEY}),/PUBLIC_KEY_MUST_NOT_BE_SERVER_SECRET/)
const serverJwt=['e30',Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url'),'example'].join('.')
assert.throws(()=>acceptanceConfig({...env,[SUPABASE_PUBLIC_ENV_NAMES[1]]:serverJwt}),/PUBLIC_KEY_ROLE_MUST_BE_ANON/)
assert.throws(()=>acceptanceDatabase({...config,database:`postgres://postgres:example@db.${PRODUCTION_REF}.supabase.co/postgres`}),/DATABASE_PROJECT_MISMATCH/)
assert.throws(()=>applicationClient({config:{...config,url:`https://${PRODUCTION_REF}.supabase.co`}}),/ISOLATED_PROJECT_REQUIRED/)
assert.throws(()=>applicationClient({config:{...config,origin:'https://hebaelsherif.com'}}),/APP_ORIGIN_VIOLATION/)
console.log('PASS production/origin/paid/provider/database guards (unit)')

const source=sourceMigrations(),empty={tables:[],users:0,objects:0,functions:0,storagePolicies:0,history:false,control:false,migrations:[]}
assert.equal(migrationPlan(empty,source).missing.length,113)
const partial={...empty,control:true,migrations:source.slice(0,44).map(row=>({version:row.version,statements:[row.sql]}))}
assert.equal(migrationPlan(partial,source).missing[0],'044')
assert.throws(()=>migrationPlan({...partial,migrations:[...partial.migrations,{version:'045',statements:[source[45].sql]}]},source),/MIGRATION_HISTORY_GAP/)
assert.throws(()=>migrationPlan({...partial,migrations:[{version:'000',statements:['select 1']}]},source),/APPLIED_MIGRATION_SOURCE_DIFFERS/)
assert.throws(()=>migrationPlan({...empty,migrations:[{version:'999',statements:['select 1']}]},source),/UNKNOWN_MIGRATION_HISTORY/)
for(const field of ['users','objects','functions','storagePolicies'])assert.throws(()=>migrationPlan({...empty,[field]:1},source),/NONEMPTY_UNOWNED_TEST_PROJECT/)
assert.throws(()=>migrationPlan({...empty,tables:['pages']},source),/NONEMPTY_UNOWNED_TEST_PROJECT/)
for(const row of source)assert(!/^(begin|commit);\s*$/im.test(transactionBody(row.sql)))
console.log('PASS 000–112 empty/partial/history/source/transaction planning guards (unit)')

const client={auth:{admin:{listUsers:async()=>({data:{users:[]},error:null})}},storage:{listBuckets:async()=>({data:[],error:null})}},query=async()=>[{inventory:empty}]
const connected=await inspectAcceptance({config,client,query,request:async()=>new Response('{}',{status:200})})
assert(connected.stages.filter(row=>row.phase.endsWith('connection')||row.phase==='auth_connection_public_key'||row.phase==='server_key_authorization').every(row=>row.status==='passed'))
assert.equal(connected.stages.find(row=>row.phase==='schema').status,'empty');assert.equal(connected.acceptance,'NOT_RUN')
const failed=await inspectAcceptance({config,client,query,request:async()=>new Response('{}',{status:401})})
assert.equal(failed.stages.find(row=>row.phase==='auth_connection_public_key').status,'failed');assert.equal(failed.stages.find(row=>row.phase==='schema').status,'empty')
console.log('PASS empty schema is independent of connection/key status; no acceptance claim (unit)')

assert.deepEqual(lastCsvRecord('count\n3\n'),[{count:3}])
assert.deepEqual(lastCsvRecord('state\n"{""users"":0,""tables"":[]}"\n'),[{state:{users:0,tables:[]}}])
assert.deepEqual(lastCsvRecord('unused\n1\nfunctions\n"[{""name"":""example"",""body"":""line1\\nline2""}]"'),[{functions:[{name:'example',body:'line1\nline2'}]}])
assert.equal(totp('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ',59000),'287082')
assert.deepEqual(decodeAction('0:{"a":"$@1"}\n1:{"ok":false,"error":"denied"}\n'),{ok:false,error:'denied'})
assert.throws(()=>decodeAction('0:{"a":"$@1"}\n1:{"digest":"private"}'),/APP_ACTION_PROTOCOL_INVALID/)
for(const size of [1024,5000]){const pdf=pdfFixture(size);assert.equal(pdf.length,size);const xref=Number(pdf.toString().match(/startxref\n(\d+)\n%%EOF/)[1]);assert.equal(pdf.subarray(xref,xref+4).toString(),'xref');assert.equal(pngFixture(size).length,size);const mov=movFixture(size);assert.equal(mov.length,size);let offset=0;const atoms=[];while(offset<size){atoms.push(mov.toString('ascii',offset+4,offset+8));offset+=mov.readUInt32BE(offset)}assert.equal(offset,size);assert.deepEqual(atoms,['ftyp','mdat','moov','free']);assert(mov.includes(Buffer.from('raw ')))}
const runner=readFileSync('scripts/run-admin-acceptance.mjs','utf8'),http=readFileSync('scripts/lib/admin-acceptance-http.mjs','utf8')
assert(runner.includes('finally')&&runner.includes('cleanupFixtures'));assert(!http.includes('admin_sessions'));assert(!http.includes('owner_password_access'))
console.log('PASS real transport protocol helpers, RFC TOTP vector, CSV, original PDF/PNG/MOV fixtures; not provider acceptance')
if(process.argv.includes('--postgres')){
 const {isolatedPostgres}=await import('./lib/isolated-postgres.mjs'),{run}=isolatedPostgres()
 assert.equal(await verifyDefinitions(async sql=>[{functions:JSON.parse(run(sql))}],sourceMigrations()),13)
 console.log('PASS 13 actual isolated PostgreSQL function bodies match current source; provider integration NOT RUN')
}
