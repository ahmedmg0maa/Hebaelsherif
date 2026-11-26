import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
function load(path,imports={}){const code=ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const loaded={exports:{}};new Function('require','module','exports',code)(name=>{assert(name in imports,`Unmocked dependency: ${name}`);return imports[name]},loaded,loaded.exports);return loaded.exports}
let checks=0
const check=async(name,run)=>{await run();checks++;console.log('PASS '+name)}
const originalFetch=globalThis.fetch
try{
 const {uploadStreamChunks}=load('src/lib/delivery/tus-upload.ts')
 const file=new File([new Uint8Array(12*1024*1024)],'lesson.mp4',{type:'video/mp4'})
 await check('TUS resumes from server offset and never resends acknowledged bytes',async()=>{
  const requests=[],progress=[];globalThis.fetch=async(_url,init)=>{requests.push(init);if(init.method==='HEAD')return new Response(null,{headers:{'Upload-Offset':String(10*1024*1024)}});assert.equal(init.body.size,2*1024*1024);return new Response(null,{status:204,headers:{'Upload-Offset':String(file.size)}})}
  await uploadStreamChunks('https://upload.videodelivery.net/fixture',file,x=>progress.push(x));assert.equal(requests.length,2);assert.equal(requests[1].headers['Upload-Offset'],String(10*1024*1024));assert.equal(progress.at(-1),100)
 })
 await check('TUS rejects missing offsets and uncertain chunks without blind replay',async()=>{
  globalThis.fetch=async()=>new Response(null);await assert.rejects(()=>uploadStreamChunks('https://upload.videodelivery.net/fixture',file,()=>{}),/offset/)
  let requests=0;globalThis.fetch=async(_url,init)=>{requests++;return new Response(null,{headers:{'Upload-Offset':init.method==='HEAD'?'0':'1'}})}
  await assert.rejects(()=>uploadStreamChunks('https://upload.videodelivery.net/fixture',file,()=>{}),/uncertain/);assert.equal(requests,2)
  await assert.rejects(()=>uploadStreamChunks('https://attacker.invalid/fixture',file,()=>{}),/invalid_upload_url/)
 })
 const env={HEBA_DEPLOYMENT_ENV:'production',NEXT_PUBLIC_SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_SECRET_KEY:'fixture',RESEND_API_KEY:'fixture',RESEND_FROM_EMAIL:'Site <site@example.test>',NEXT_PUBLIC_SITE_URL:'https://example.test'}
 const calls=[],items=[{id:5,leaseId:'fixture',to:'client@example.test',subject:'Fixture',text:'Booking status'}]
 const {deliverBookingMail,bookingEmailHtml}=load('worker/booking-mail.ts',{'@supabase/supabase-js':{createClient:()=>({rpc:async(name,input)=>{calls.push({name,input});return {data:name==='claim_booking_emails'?items:true}}})}})
 await check('mail disabled in preview or without configuration',async()=>{await deliverBookingMail({...env,HEBA_DEPLOYMENT_ENV:'preview'});await deliverBookingMail({...env,RESEND_API_KEY:''});assert.equal(calls.length,0)})
 await check('mail uses stable idempotency and records confirmed success only',async()=>{globalThis.fetch=async(url,init)=>{assert.equal(url,'https://api.resend.com/emails');assert.equal(init.headers['Idempotency-Key'],'booking-status/5');const body=JSON.parse(init.body);assert(body.text.endsWith('https://example.test/dashboard/bookings'));return new Response('{"id":"provider-5"}',{status:200})};await deliverBookingMail(env);assert.equal(calls.at(-1).input.p_sent,true)})
 await check('mail provider rejection remains retryable and stores no raw provider body',async()=>{globalThis.fetch=async()=>new Response('private upstream failure',{status:429});await deliverBookingMail(env);assert.equal(calls.at(-1).input.p_sent,false);assert.equal(calls.at(-1).input.p_error,'provider_rate_limited');globalThis.fetch=async()=>{throw Error('private failure')};await deliverBookingMail(env);assert.equal(calls.at(-1).input.p_error,'provider_unavailable')})
 await check('mail escapes content, refuses unconfirmed success and sends one quota-reserved item',async()=>{const html=bookingEmailHtml('<script>','<img src=x>', 'https://example.test/dashboard/bookings');assert(!html.includes('<script>'));assert(!html.includes('<img src=x>'));assert(html.includes('&lt;script&gt;'));globalThis.fetch=async()=>new Response('{}',{status:200});await deliverBookingMail(env);assert.equal(calls.at(-1).input.p_sent,false);assert.equal(calls.findLast(call=>call.name==='claim_booking_emails').input.p_limit,1)})
 console.log(JSON.stringify({passed:checks,scope:'Real adapter functions with injected network replies; no live uploads or emails'}))
}finally{globalThis.fetch=originalFetch}
const {validateLaunchConfig}=await import('./launch-config.mjs')
const {SUPABASE_PUBLIC_ENV_NAMES}=await import('./public-config.mjs')
await check('production config refuses preview, private public key and partial Stream',async()=>{
 const valid={HEBA_DEPLOYMENT_ENV:'production',NEXT_PUBLIC_SITE_URL:'https://example.test',NEXT_PUBLIC_SUPABASE_URL:'https://fixture.supabase.co',[SUPABASE_PUBLIC_ENV_NAMES[1]]:'sb_publishable_fixture_only',OWNER_ADMIN_EMAIL:'owner@example.test',SUPABASE_SECRET_KEY:'fixture',RESEND_API_KEY:'fixture',RESEND_FROM_EMAIL:'site@example.test'}
 assert.deepEqual(validateLaunchConfig(valid),[]);assert(validateLaunchConfig({...valid,HEBA_COST_MODE:'free',CLOUDFLARE_STREAM_ACCOUNT_ID:'a'.repeat(32),CLOUDFLARE_STREAM_API_TOKEN:'fixture',CLOUDFLARE_STREAM_HOST:'customer-fixture.cloudflarestream.com'}).some(value=>value.includes('Free operation')));assert(validateLaunchConfig({...valid,HEBA_COST_MODE:'unexpected'}).length)
 assert(validateLaunchConfig({...valid,HEBA_DEPLOYMENT_ENV:'preview'}).length)
 assert(validateLaunchConfig({...valid,CLOUDFLARE_STREAM_ACCOUNT_ID:'a'.repeat(32)}).length)
 assert(validateLaunchConfig({...valid,[SUPABASE_PUBLIC_ENV_NAMES[1]]:`header.${Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url')}.signature`}).length)
})
console.log(`Total launch adapter/config groups: ${checks}`)
await check('sensitive confirmation chooses the enrolled method and rejects external redirects',async()=>{
 for(const [owner,userId,requested,expected] of [[true,'owner','/admin/payments','/auth/admin?'],[false,'staff','/admin/roles','/auth/admin/mfa?'],[false,null,'https://example.test','/auth/admin?']]){
  let target=''
  const page=load('src/app/(public)/auth/admin/confirm/page.tsx',{
   'next/navigation':{redirect:value=>{target=value;throw Error('redirect')}},
   '@/lib/supabase/server':{hasSupabaseServerSecret:()=>true,getServerClient:async()=>({auth:{getUser:async()=>({data:{user:userId?{id:userId}:null}})}})},
   '@/lib/supabase/public-key':{hasSupabasePublicConfig:()=>true},
   '@/lib/auth/owner-password':{isPasswordOwner:async()=>owner},
  })
  await assert.rejects(()=>page.default({searchParams:Promise.resolve({redirect:requested})}),/redirect/)
  assert(target.startsWith(expected));assert.equal(new URL(target,'https://local.test').searchParams.get('redirect'),requested.startsWith('/admin/')?requested:'/admin/overview')
 }
})
console.log(`Final launch adapter/config groups: ${checks}`)
