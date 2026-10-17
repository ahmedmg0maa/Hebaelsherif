import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
const source=ts.transpileModule(readFileSync('src/app/auth/callback/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
let configured=true, exchangeError=null, exchanges=0
const loaded={exports:{}}
const mocks={
 'next/server':{NextResponse:{redirect:url=>new Response(null,{status:307,headers:{Location:String(url)}})}},
 '@/lib/supabase/public-key':{hasSupabasePublicConfig:()=>configured},
 '@/lib/supabase/server':{getServerClient:async()=>({auth:{exchangeCodeForSession:async()=>{exchanges++;return {error:exchangeError}}}})},
}
new Function('require','module','exports',source)(name=>{if(!mocks[name])throw Error('Unexpected import '+name);return mocks[name]},loaded,loaded.exports)
async function callback(next,code='test-code'){
 const url=new URL('https://hebaelsherif.com/auth/callback')
 if(next!==null)url.searchParams.set('next',next)
 if(code)url.searchParams.set('code',code)
 return loaded.exports.GET({url:url.href,nextUrl:url})
}
for(const path of ['/booking','/dashboard','/auth/update-password','/auth/login']){
 const response=await callback(path)
 assert.equal(response.headers.get('Location'),'https://hebaelsherif.com'+path)
 assert.equal(response.headers.get('Cache-Control'),'private, no-store')
 assert.equal(response.headers.get('Referrer-Policy'),'no-referrer')
}
for(const path of ['https://attacker.invalid','//attacker.invalid','/admin/overview','/booking?next=https://attacker.invalid',null]){
 assert.equal((await callback(path)).headers.get('Location'),'https://hebaelsherif.com/auth/login')
}
exchangeError=new Error('fixture exchange denied')
assert.equal((await callback('/booking')).headers.get('Location'),'https://hebaelsherif.com/auth/login?error=callback')
const before=exchanges
await callback('/booking','')
configured=false
await callback('/booking')
assert.equal(exchanges,before)
console.log('PASS real Auth callback: booking/dashboard/recovery destinations, external and admin redirect denial, exchange failure, missing configuration/code, private response headers.')

// Execute the real proxy too: private pages and their login redirects must
// remain uncacheable before and after the session refresh path is reached.
const proxyModule={exports:{}}
const proxySource=ts.transpileModule(readFileSync('src/proxy.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
const proxyMocks={...mocks,
 'next/server':{NextResponse:{...mocks['next/server'].NextResponse,next:()=>new Response(null)}},
 '@supabase/ssr':{createServerClient:()=>({auth:{getUser:async()=>({data:{user:{id:'customer-fixture'}}})}})},
 '@/lib/supabase/public-key':{hasSupabasePublicConfig:()=>configured,getSupabasePublicKey:()=> 'public-fixture'},
}
new Function('require','module','exports',proxySource)(name=>{if(!proxyMocks[name])throw Error('Unexpected import '+name);return proxyMocks[name]},proxyModule,proxyModule.exports)
for(const [path,session] of [['/admin/overview',false],['/dashboard',false],['/dashboard',true],['/auth/admin',false],['/auth/login',false]]){
 configured=session
 const url=new URL('https://hebaelsherif.com'+path)
 const response=await proxyModule.exports.default({headers:new Headers(),cookies:{getAll:()=>[]},nextUrl:{pathname:path,clone:()=>new URL(url)}})
 assert.equal(response.headers.get('Cache-Control'),'private, no-store',path)
 assert.equal(response.headers.get('Pragma'),'no-cache',path)
 assert.equal(response.headers.get('X-Robots-Tag'),'noindex, nofollow',path)
 if(path.startsWith('/admin')||path==='/dashboard'&&!session)assert.equal(response.status,307)
}
console.log('PASS real proxy: anonymous protected redirects, authenticated dashboard and Auth pages carry private/no-store headers.')
