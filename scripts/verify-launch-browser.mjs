import {spawn} from 'node:child_process'
import {createRequire} from 'node:module'
import {mkdirSync,writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
import {chromium} from '@playwright/test'
const require=createRequire(import.meta.url)
// Optional executable supplied by the local test runner; ordinary Playwright works too.
const executablePath=process.env.HEBA_TEST_CHROMIUM_PATH
const server=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'start','--hostname','127.0.0.1','--port','3105'],{env:{...process.env,HEBA_DEPLOYMENT_ENV:'preview',NEXT_PUBLIC_SUPABASE_URL:'',SUPABASE_SECRET_KEY:'',SUPABASE_SERVICE_ROLE_KEY:''},stdio:['ignore','pipe','pipe']})
let output='';server.stdout.on('data',b=>output+=b);server.stderr.on('data',b=>output+=b)
let browser
try{
 await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>{clearInterval(timer);reject(Error('Server not ready: '+output.slice(-1500)))},40000);const timer=setInterval(()=>{if(output.includes('Ready')){clearTimeout(timeout);clearInterval(timer);resolve()}},100)})
 browser=await chromium.launch({executablePath,args:['--no-sandbox','--disable-dev-shm-usage','--in-process-gpu','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-zygote','--single-process'],headless:true})
 const results=[],errors=[]
 mkdirSync('reports/launch',{recursive:true})
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:900},locale:'ar-EG',timezoneId:'Africa/Cairo'})
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message))
  await page.goto('http://127.0.0.1:3105/',{waitUntil:'networkidle'})
  await page.screenshot({path:`reports/launch/initial-${width}.png`,fullPage:true})
  console.log('width',width,await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>(e.getBoundingClientRect().right>innerWidth+1||e.getBoundingClientRect().left < -1)&&e.getBoundingClientRect().width>0).slice(0,8).map(e=>({tag:e.tagName,cls:e.className,width:e.getBoundingClientRect().width}))))
  assert.equal(await page.locator('h1').count(),1)
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`overflow width=${width} url=${page.url()}`)
  await page.getByRole('tab',{name:'ملاحظاتك'}).click();await page.getByRole('heading',{name:'مساحة لأفكارك'}).waitFor()
  await page.evaluate(()=>scrollTo(0,0))
  await page.screenshot({path:`reports/launch/home-${width}.png`,fullPage:true})
  await page.goto('http://127.0.0.1:3105/auth/admin',{waitUntil:'networkidle'})
  assert.equal(await page.locator('input[type=email]').count(),0)
  assert.equal(await page.locator('input[type=password]').count(),1)
  await page.goto('http://127.0.0.1:3105/auth/admin/confirm?redirect=/admin/payments',{waitUntil:'networkidle'})
  assert.equal(new URL(page.url()).pathname,'/auth/admin')
  assert.equal(await page.locator('input[type=password]').count(),1)
  await page.goto('http://127.0.0.1:3105/booking',{waitUntil:'networkidle'})
  assert.equal(await page.locator('textarea[name=notes]').count(),0)
  const proceed=()=>page.getByRole('button',{name:'متابعة',exact:true}).click()
  await proceed()
  await page.locator('button[aria-pressed=false]:not([disabled])').first().click()
  await page.getByRole('heading',{name:'اختاري وقت الجلسة'}).waitFor()
  // Select a time button within the time grid, rather than a service/date.
  await page.locator('button.tnum[aria-pressed]').first().click()
  await proceed();await page.getByLabel('الاسم الكامل').fill('عميلة اختبار');await page.getByLabel('رقم الهاتف').fill('01000000000')
  await proceed();await page.getByRole('button',{name:'تثبيت الموعد والانتقال للدفع'}).click()
  await page.locator('input[type=file]').setInputFiles({name:'proof.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aKioAAAAASUVORK5CYII=','base64')})
  await page.getByRole('button',{name:'إكمال المحاكاة بأمان'}).click()
  await page.getByRole('heading',{name:'اكتملت محاكاة الحجز بنجاح'}).waitFor()
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`overflow width=${width} url=${page.url()}`)
  results.push({width,home:true,tour:true,ownerPasswordOnly:true,bookingPreview:true})

 }
 assert.deepEqual(errors,[])
 writeFileSync('reports/launch/browser.json',JSON.stringify({results,errors,scope:'Provider-free actual browser interactions. No live Auth, payment or storage acceptance.'},null,2))
 console.log(JSON.stringify(results))
}catch(e){console.error(e.stack);console.error(output.slice(-1500));process.exitCode=1}
finally{await browser?.close();server.kill('SIGTERM')}
