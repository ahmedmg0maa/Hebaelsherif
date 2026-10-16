import { createRequire } from 'node:module'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createServer } from 'node:http'
import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'

const require=createRequire(import.meta.url),{build}=createRequire(require.resolve('vite'))('esbuild')
const directory=mkdtempSync(join(tmpdir(),'heba-identity-qa-'))
let server,browser
try{
 await build({
  stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {BookingIdentity} from './src/components/booking/BookingIdentity';window.identityReady=0;createRoot(document.getElementById('app')).render(<BookingIdentity fullName="عميلة اختبار" onReady={()=>window.identityReady++}/>);`,resolveDir:process.cwd(),loader:'tsx'},
  outfile:join(directory,'bundle.js'),bundle:true,platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},
  plugins:[{name:'isolated-auth-fixtures',setup(buildTool){
   buildTool.onResolve({filter:/^@\/lib\/supabase\/client$/},()=>({path:'auth-fixture',namespace:'fixture'}))
   buildTool.onResolve({filter:/^next\/link$/},()=>({path:'link-fixture',namespace:'fixture'}))
   buildTool.onResolve({filter:/^@\//},args=>{const base=resolve('src',args.path.slice(2));const path=['.ts','.tsx','.mjs'].map(extension=>base+extension).find(existsSync);return path?{path}:null})
   buildTool.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:args.path==='link-fixture'?'export default function Link(){return null}':`window.identityCalls=[];export const getBrowserClient=()=>({auth:{signUp:async(value)=>{window.identityCalls.push({kind:'signup',value});await new Promise(r=>setTimeout(r,300));return{data:{session:null},error:null}},resend:async(value)=>{window.identityCalls.push({kind:'resend',value});return{error:null}},signInWithPassword:async(value)=>{window.identityCalls.push({kind:'login',value});return{error:null}}}});`,loader:'js'}))
  }}],
 })
 server=createServer((request,response)=>{response.setHeader('Content-Type',request.url==='/bundle.js'?'text/javascript':'text/html; charset=utf-8');response.end(request.url==='/bundle.js'?readFileSync(join(directory,'bundle.js')):'<!doctype html><html lang="ar" dir="rtl"><body><div id="app"></div><script src="/bundle.js"></script></body></html>')})
 await new Promise(resolvePromise=>server.listen(0,'127.0.0.1',resolvePromise))
 browser=await chromium.launch({executablePath:process.env.HEBA_TEST_CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process'],headless:true})
 const page=await browser.newPage(),errors=[]
 page.on('pageerror',error=>errors.push(error.message))
 await page.goto('http://127.0.0.1:'+server.address().port)
 await page.getByRole('button',{name:'إنشاء حساب ومتابعة الحجز'}).waitFor()
 await page.getByLabel('البريد الإلكتروني').fill('fixture@example.test')
 await page.locator('input[name=password]').fill('Learning-fixture-2026!')
 await page.getByRole('button',{name:'إنشاء حساب ومتابعة الحجز'}).click()
 assert.equal(await page.getByRole('button',{name:'لديّ حساب',exact:true}).isDisabled(),true)
 await page.getByText('افتحي رابط التأكيد في بريدك',{exact:false}).waitFor()
 assert.equal((await page.evaluate(()=>window.identityCalls))[0].kind,'signup')
 assert((await page.evaluate(()=>window.identityCalls))[0].value.options.emailRedirectTo.endsWith('/auth/callback?next=/booking'))
 await page.clock.install()
 await page.clock.fastForward(61000)
 await page.getByRole('button',{name:'إعادة إرسال رابط التأكيد',exact:true}).click()
 await page.getByText('طُلب إرسال رابط التأكيد مجددًا',{exact:false}).waitFor()
 assert.equal((await page.evaluate(()=>window.identityCalls))[1].kind,'resend')
 await page.getByRole('button',{name:'لديّ حساب',exact:true}).click()
 await page.getByRole('button',{name:'دخول ومتابعة الحجز'}).click()
 await page.waitForFunction(()=>window.identityReady===1)
 assert.equal((await page.evaluate(()=>window.identityCalls))[2].kind,'login')
 assert.deepEqual(errors,[])
 console.log('PASS actual BookingIdentity registration, busy guard, preserved return URL, resend cooldown, and existing-account login. Auth injected locally; no real signup/email.')
}finally{await browser?.close();await new Promise(resolvePromise=>server?server.close(resolvePromise):resolvePromise());rmSync(directory,{recursive:true,force:true})}

