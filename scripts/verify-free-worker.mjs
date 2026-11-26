import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'
import { SUPABASE_PUBLIC_ENV_NAMES } from './public-config.mjs'
const child=spawn(process.execPath,[resolve('node_modules/wrangler/bin/wrangler.js'),'dev','--config','dist/server/wrangler.json','--ip','127.0.0.1','--port','3106','--local','--test-scheduled'],{
 env:{...process.env,...Object.fromEntries(SUPABASE_PUBLIC_ENV_NAMES.map(name=>[name,''])),SUPABASE_SECRET_KEY:'',SUPABASE_SERVICE_ROLE_KEY:'',RESEND_API_KEY:'',RESEND_FROM_EMAIL:'',SENTRY_DSN:'',NEXT_PUBLIC_SENTRY_DSN:'',HEBA_COST_MODE:'free',HEBA_DEPLOYMENT_ENV:'',WRANGLER_SEND_METRICS:'false'},
 stdio:['ignore','pipe','pipe']
})
let output='',browser
child.stdout.on('data',value=>output+=value);child.stderr.on('data',value=>output+=value)
try{
 const start=Date.now()
 while(!output.includes('http://127.0.0.1:3106')){
  if(child.exitCode!==null || Date.now()-start>45000)throw Error('Local Worker not ready: '+output.slice(-1000))
  await new Promise(resolvePromise=>setTimeout(resolvePromise,200))
 }
 const response=await fetch('http://127.0.0.1:3106/')
 assert.equal(response.status,200);assert(response.headers.get('Content-Security-Policy'));assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff')
 const admin=await fetch('http://127.0.0.1:3106/admin',{redirect:'manual'})
 assert([302,303,307,308].includes(admin.status));assert(admin.headers.get('Location').includes('/auth/admin'))
 browser=await chromium.launch({executablePath:process.env.HEBA_TEST_CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage','--in-process-gpu','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-zygote','--single-process'],headless:true})
 const errors=[]
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:900},locale:'ar-EG'})
  page.setDefaultTimeout(60000)
  page.setDefaultNavigationTimeout(60000)
  page.on('pageerror',error=>errors.push(error.message))
  await page.goto('http://127.0.0.1:3106/',{waitUntil:'domcontentloaded'})
  await page.getByRole('tab',{name:'ملاحظاتك'}).click()
  await page.getByRole('heading',{name:'مساحة لأفكارك'}).waitFor()
  assert.equal(await page.locator('h1').count(),1)
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
  await page.locator('.learning-hero a[href="/booking"]').click()
  await page.waitForURL('**/booking')
  assert.equal(await page.locator('h1').count(),1)
 }
 assert.deepEqual(errors,[])
 console.log(JSON.stringify({status:'passed',widths:[1440,390],headers:true,anonymousAdminGuard:true,interactiveTour:true,scope:'Local workerd compiled Worker, not a live deployment or Free CPU acceptance; no providers configured.'}))
}catch(error){console.error(output.slice(-1500));throw error}
finally{await browser?.close();child.kill('SIGTERM')}

