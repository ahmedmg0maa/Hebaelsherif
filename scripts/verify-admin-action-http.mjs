// Real Next server/action transport, deliberately unconfigured Auth. This proves
// manifest/Flight handling and fail-closed responses, NOT provider acceptance.
import assert from 'node:assert/strict'
import {cpSync,mkdirSync,readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {spawn} from 'node:child_process'
import {randomUUID} from 'node:crypto'
import {createServer} from 'node:net'
import {applicationClient} from './lib/admin-acceptance-http.mjs'
import {SUPABASE_PUBLIC_ENV_NAMES} from './public-config.mjs'
const port=3172,origin=`http://127.0.0.1:${port}`
await new Promise((done,reject)=>{const p=createServer();p.once('error',()=>reject(Error('TRANSPORT_TEST_PORT_BUSY')));p.listen(port,'127.0.0.1',()=>p.close(done))})
const work=resolve('.launch-tools/admin-action-transport',randomUUID());mkdirSync(work,{recursive:true})
cpSync('.next',resolve(work,'.next'),{recursive:true});cpSync('package.json',resolve(work,'package.json'))
const env={PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,NODE_ENV:'production',HEBA_DEPLOYMENT_ENV:'preview',HEBA_COST_MODE:'free',NEXT_PUBLIC_SITE_URL:origin,OWNER_ADMIN_EMAIL:'',SUPABASE_SECRET_KEY:'',SUPABASE_SERVICE_ROLE_KEY:'',RESEND_API_KEY:'',RESEND_FROM_EMAIL:'',SENTRY_DSN:'',NEXT_PUBLIC_SENTRY_DSN:'',PROTECTED_UPLOAD_SCAN_URL:'',PROTECTED_UPLOAD_SCAN_TOKEN:'',...Object.fromEntries(SUPABASE_PUBLIC_ENV_NAMES.map(name=>[name,'']))}
const child=spawn(process.execPath,[resolve('node_modules/next/dist/bin/next'),'start','--hostname','127.0.0.1','--port',String(port)],{cwd:work,env,windowsHide:true,stdio:['ignore','ignore','ignore']})
let failed=false;child.on('error',()=>{failed=true})
try{
 const deadline=Date.now()+60000
 while(true){if(failed||child.exitCode!==null)throw Error('TRANSPORT_APP_EXITED');try{const r=await fetch(origin+'/auth/admin');if(r.ok)break}catch{}if(Date.now()>deadline)throw Error('TRANSPORT_START_TIMEOUT');await new Promise(done=>setTimeout(done,250))}
 const client=applicationClient({config:{url:'https://abcdefghijklmnopqrst.supabase.co',key:'transport-unit-value',origin},manifest:JSON.parse(readFileSync(resolve(work,'.next/server/server-reference-manifest.json'),'utf8')),basic:''})
 const result=await client.action('auth','ownerPasswordLogin','/auth/admin',['synthetic-invalid-input'])
 assert.equal(result.ok,false);assert.equal(typeof result.error,'string')
 assert.notEqual((await client.request('/admin/pages')).status,200)
 console.log('PASS actual Next action manifest + Flight decoding + unconfigured login/Admin denial; Auth/provider acceptance NOT RUN')
}finally{child.kill();await new Promise(done=>{if(child.exitCode!==null)return done();child.once('exit',done);setTimeout(done,5000).unref()})}
