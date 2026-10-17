import {createRequire} from 'node:module'
import {existsSync,mkdtempSync,readFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'
import {createServer} from 'node:http'
import assert from 'node:assert/strict'
import {chromium} from '@playwright/test'
const require=createRequire(import.meta.url),{build}=createRequire(require.resolve('vite'))('esbuild')
const directory=mkdtempSync(join(tmpdir(),'heba-learning-qa-'))
let server,browser
try {
 await build({stdin:{contents:`import {createRoot} from 'react-dom/client';import {LearnClient} from './src/components/learn/LearnClient';const lesson=id=>({id,title:'درس '+id,description:'شرح عملي',durationSeconds:300,hasVideo:true,completed:false});createRoot(document.getElementById('app')).render(<LearnClient data={{courseId:'course-fixture',slug:'fixture',title:'دورة اختبار',enrolled:true,percent:0,modules:[{id:'module',title:'الوحدة الأولى',lessons:[lesson('one'),lesson('two')]}],notes:[{id:'saved',lessonId:'one',content:'ملاحظة محفوظة',updatedAt:'2026-10-12'}],resources:{one:[{id:'resource',title:'ورقة عمل',kind:'pdf'}],two:[]}}}/>);`,resolveDir:process.cwd(),loader:'tsx'},outfile:join(directory,'bundle.js'),bundle:true,platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'learning-actions-fixture',setup(tool){
  tool.onResolve({filter:/^@\/lib\/actions\/learn$/},()=>({path:'actions',namespace:'fixture'}))
  tool.onResolve({filter:/^next\/link$/},()=>({path:'link',namespace:'fixture'}))
  tool.onResolve({filter:/^@\//},args=>{const base=resolve('src',args.path.slice(2));const path=['.ts','.tsx'].map(ext=>base+ext).find(existsSync);return path?{path}:null})
  tool.onLoad({filter:/.*/,namespace:'fixture'},args=>({loader:'js',contents:args.path==='link'?'export default function Link(){return null}':`
   window.learningCalls=[];window.learningMode='ok';window.deferVideo=true;window.deferNote=false;
   export async function getLessonVideoUrl(id){window.learningCalls.push(['video',id]);if(window.deferVideo)await new Promise(resolve=>window.resolveVideo=resolve);if(window.learningMode==='video-error')throw Error('fixture network');return{ok:true,data:{kind:'stream',url:'/frame?lesson='+id}}}
   export async function markLessonComplete(id,target){window.learningCalls.push(['progress',id,target]);if(window.learningMode==='progress-error')throw Error('fixture network');return{ok:true,data:{percent:50}}}
   export async function saveNote(id,content){window.learningCalls.push(['note',id,content]);if(window.deferNote)await new Promise(resolve=>window.resolveNote=resolve);if(window.learningMode==='note-error')throw Error('fixture network');return{ok:true,data:{id:'new-note'}}}
   export async function deleteNote(id){window.learningCalls.push(['delete',id]);if(window.learningMode==='delete-denied')return{ok:false,error:'تعذر حذف الملاحظة'};return{ok:true,data:null}}
   export async function getResourceUrl(id){window.learningCalls.push(['resource',id]);return{ok:true,data:{url:'/resource-fixture'}}}
  `}))
 }}]})
 server=createServer((request,response)=>{response.setHeader('Content-Type',request.url==='/bundle.js'?'text/javascript':'text/html; charset=utf-8');response.end(request.url==='/bundle.js'?readFileSync(join(directory,'bundle.js')):request.url.startsWith('/frame')?'<!doctype html><html><body>Local frame fixture</body></html>':'<!doctype html><html lang="ar" dir="rtl"><body><div id="app"></div><script src="/bundle.js"></script></body></html>')})
 await new Promise(done=>server.listen(0,'127.0.0.1',done))
 if(process.argv.includes('--serve')){
  // Same deliberately injected component fixture, exposed to the approved browser.
  // Control states are visible buttons; no hidden state injection is needed by QA.
  server.removeAllListeners('request')
  server.on('request',(request,response)=>{response.setHeader('Cache-Control','no-store');response.setHeader('Content-Type',request.url==='/bundle.js'?'text/javascript':'text/html;charset=utf-8');response.end(request.url==='/bundle.js'?readFileSync(join(directory,'bundle.js')):request.url.startsWith('/frame')?'<!doctype html><html><body>Local video fixture</body></html>':`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><aside><h1>فحص مكوّن التعلّم فقط — ليس قبول المزود</h1><p>ردود محلية مصطنعة؛ لا مصادقة أو Storage أو حق وصول حقيقي في هذا الفحص.</p><button onclick="window.deferVideo=false;window.resolveVideo?.()">إكمال رد الفيديو التجريبي</button><button onclick="window.learningMode='note-error'">تفعيل فشل الملاحظة التجريبي</button><button onclick="window.learningMode='video-error'">تفعيل فشل الفيديو التجريبي</button><button onclick="window.learningMode='ok'">إتاحة الرد المحلي مجددًا</button></aside><div id="app"></div><script src="/bundle.js"></script></body></html>` )})
  console.log('Learning component fixture: http://127.0.0.1:'+server.address().port+' (stop + Enter to close; not provider acceptance)')
  process.stdin.setEncoding('utf8');await new Promise(done=>{process.stdin.on('data',text=>{if(text.trim()==='stop')done()});process.once('SIGINT',done);process.once('SIGTERM',done)});process.stdin.removeAllListeners('data');process.stdin.pause()
 }else{
 browser=await chromium.launch({executablePath:process.env.HEBA_TEST_CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process']})
 const results=[]
 for(const width of [1440,390]) {
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message))
  await page.goto('http://127.0.0.1:'+server.address().port)
  await page.getByRole('button',{name:'بدء هذا الدرس',exact:true}).click()
  assert.equal(await page.getByRole('button',{name:'درس two',exact:false}).isDisabled(),true)
  await page.evaluate(()=>document.querySelector('button[aria-current=true]').dispatchEvent(new MouseEvent('click',{bubbles:true})))
  assert.equal((await page.evaluate(()=>window.learningCalls)).filter(x=>x[0]==='video').length,1)
  await page.evaluate(()=>{window.deferVideo=false;window.resolveVideo()})
  await page.locator('iframe[src="/frame?lesson=one"]').waitFor()
  await page.locator('#note').fill('مسودة الدرس الأول')
  await page.getByRole('button',{name:'درس two',exact:false}).click();await page.locator('iframe[src="/frame?lesson=two"]').waitFor()
  assert.equal(await page.locator('#note').inputValue(),'')
  await page.locator('#note').fill('مسودة الدرس الثاني')
  await page.getByRole('button',{name:'درس one',exact:false}).click();await page.locator('iframe[src="/frame?lesson=one"]').waitFor()
  assert.equal(await page.locator('#note').inputValue(),'مسودة الدرس الأول')
  await page.evaluate(()=>{window.learningMode='note-error';window.deferNote=true;const form=document.querySelector('form');form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))})
  assert.equal((await page.evaluate(()=>window.learningCalls)).filter(x=>x[0]==='note').length,1)
  assert.equal(await page.locator('#note').isDisabled(),true)
  await page.evaluate(()=>window.resolveNote());await page.getByRole('alert').filter({hasText:'تعذر تأكيد الحفظ'}).waitFor()
  assert.equal(await page.locator('#note').isDisabled(),false);assert.equal(await page.locator('#note').inputValue(),'مسودة الدرس الأول')
  await page.evaluate(()=>{window.learningMode='ok';window.deferNote=false})
  await page.getByRole('button',{name:'حفظ الملاحظة',exact:true}).click();await page.getByText('مسودة الدرس الأول',{exact:true}).waitFor()
  assert.equal(await page.locator('#note').inputValue(),'')
  await page.evaluate(()=>window.learningMode='progress-error')
  await page.getByRole('button',{name:'وضع علامة مكتمل',exact:true}).click();await page.getByRole('alert').filter({hasText:'تعذر تأكيد التقدم'}).waitFor()
  assert.equal(await page.getByRole('button',{name:'وضع علامة مكتمل',exact:true}).isDisabled(),false)
  await page.evaluate(()=>window.learningMode='delete-denied')
  const savedRow=page.getByText('ملاحظة محفوظة',{exact:true}).locator('..')
  await savedRow.getByRole('button',{name:'حذف الملاحظة',exact:true}).click();await page.getByRole('alert').filter({hasText:'تعذر حذف الملاحظة'}).waitFor()
  assert.equal(await page.getByText('ملاحظة محفوظة',{exact:true}).count(),1)
  await page.evaluate(()=>window.learningMode='ok');await savedRow.getByRole('button',{name:'حذف الملاحظة',exact:true}).click();await page.getByText('ملاحظة محفوظة',{exact:true}).waitFor({state:'detached'})
  await page.getByRole('tab',{name:'ملاحظاتي',exact:true}).focus();await page.keyboard.press('End')
  assert.equal(await page.getByRole('tab',{name:'الملفات (١)',exact:true}).getAttribute('aria-selected'),'true')
  await page.evaluate(()=>window.open=()=>null)
  await page.getByRole('button',{name:'ورقة عمل',exact:false}).click();await page.getByRole('link',{name:'فتح الملف',exact:false}).waitFor()
  assert.equal(await page.getByRole('link',{name:'فتح الملف',exact:false}).getAttribute('href'),'/resource-fixture')
  await page.evaluate(()=>window.open=()=>{throw Error('fixture blocked popup')})
  await page.getByRole('button',{name:'ورقة عمل',exact:false}).click();await page.getByRole('link',{name:'فتح الملف',exact:false}).waitFor()
  await page.evaluate(()=>window.learningMode='video-error');await page.getByRole('button',{name:'درس two',exact:false}).click();await page.getByText('تعذر الاتصال بالفيديو.',{exact:false}).waitFor()
  assert.equal(await page.getByRole('button',{name:'إعادة فتح الدرس',exact:true}).isDisabled(),false)
  assert.deepEqual(errors,[])
  results.push({width,admissionRequestsSerialized:true,draftsPerLesson:true,duplicateSubmitBlocked:true,failedMutationsRecover:true,keyboardTabs:true,popupFallback:true})
 }
 console.log(JSON.stringify({status:'passed',results,scope:'Actual React component; injected local Server Actions and frame. Not real protected video, database persistence or entitlement acceptance.'}))
 }
} finally {await browser?.close();await new Promise(done=>server?server.close(done):done());rmSync(directory,{recursive:true,force:true})}
