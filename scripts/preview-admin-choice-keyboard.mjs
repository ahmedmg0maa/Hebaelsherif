// Component/browser regression only. NOT integrated Auth/PostgREST/Storage acceptance.
// Actual choice components and resolver; explicitly injected permission in this fixture.
import {createServer} from 'node:http'
import {createRequire} from 'node:module'
import {existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {randomUUID} from 'node:crypto'
import {isolatedPostgres} from './lib/isolated-postgres.mjs'
import {sourceLoader} from './lib/load-source.mjs'
const {run}=isolatedPostgres(),require=createRequire(import.meta.url),{build}=createRequire(require.resolve('vite'))('esbuild')
if(!process.env.PGDATABASE?.startsWith('heba_test_'))throw Error('Disposable test database required')
const folder=resolve('.launch-tools/choice-keyboard'),ids=Array.from({length:4},()=>randomUUID()),schema='choice_qa_'+randomUUID().replaceAll('-',''),port=3169
const literal=value=>"'"+String(value).replaceAll("'","''")+"'"
let server,searchReads=0,nameReads=0,saveRequests=0,fault=false,closed=false
mkdirSync(folder,{recursive:true})
writeFileSync(resolve(folder,'fixture-manifest.json'),JSON.stringify({database:process.env.PGDATABASE,schema,ids}))

const state=()=>JSON.parse(run(`select row_to_json(s) from ${schema}.form_state s where id=1`))
const choices=sourceLoader({
 '@/lib/auth/permissions':{requirePermission:async()=>({userId:'component-fixture-only'})},
 '@/lib/supabase/server':{getServerClient:async()=>({from:()=>({select:()=>({in:(_column,selected)=>({limit:async()=>{
  nameReads++
  if(fault)return {data:null,error:{code:'FIXTURE_FAILURE'}}
  return {data:JSON.parse(run(`select coalesce(json_agg(t),'[]') from (select id,title,type,is_published,archived_at from public.products where id in (${selected.map(literal).join(',')})) t`)),error:null}
 }})})})})},
}).call(null,'src/lib/actions/admin-choices.ts')
await build({stdin:{contents:`
 import {createRoot} from 'react-dom/client';import {useState} from 'react';import {AdminChoicePicker,BundleChildrenPicker} from './src/components/admin/AdminChoicePicker';import {AdminField,AdminTextarea} from './src/components/admin/AdminField';import {Button} from './src/components/ui/Button';
 const call=async(op,args=[])=>fetch('/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({op,args})}).then(r=>r.json());
 function App(){const [state,setState]=useState(JSON.parse(document.getElementById('fixture-state').textContent)),[message,setMessage]=useState('');async function refresh(){setState(await call('state'))}
 return <main className="mx-auto max-w-5xl space-y-5 p-4 md:p-8"><h1 className="text-2xl font-bold text-deep-teal">اختبار اختيارات الإدارة ولوحة المفاتيح</h1><p className="text-sm text-burgundy">فحص مكوّنات معزول؛ صلاحية الاختبار محقونة هنا. هذا ليس قبول المصادقة أو PostgREST أو Storage.</p><p role="status">مرات الحفظ في قاعدة الاختبار: {state.writes}</p><p role="status">{message}</p><form id="valid-edit-form" className="space-y-5 rounded-2xl border border-line bg-surface-raised p-5" onSubmit={async event=>{event.preventDefault();const form=new FormData(event.currentTarget);await call('save',[{title:form.get('title'),selection:form.getAll('children')}]);setMessage('حُفظ النموذج في قاعدة الاختبار.');await refresh()}}><h2 className="text-xl font-bold text-deep-teal">نموذج تعديل مكتمل</h2><AdminField name="title" label="عنوان المحتوى" required minLength={4} defaultValue={state.title}/><AdminTextarea name="description" label="وصف المحتوى" required minLength={20} defaultValue="وصف عربي كامل لاختبار نموذج صالح للحفظ دون تغيير الإنتاج."/><AdminField name="price" label="السعر" type="number" min={0} required defaultValue={0}/><AdminChoicePicker kind="product" name="related_product_id" label="المنتج المرتبط" defaultValue="${ids[1]}"/><BundleChildrenPicker initial={state.selection}/><Button type="submit">حفظ التعديلات في الاختبار</Button></form><div className="flex flex-wrap gap-3"><Button type="button" variant="secondary" onClick={async()=>{await call('fault',[true]);setMessage('فشل قراءة تجريبي مفعل؛ الاختيارات تبقى محفوظة.')}}>تفعيل فشل القراءة</Button><Button type="button" variant="secondary" onClick={async()=>{await call('fault',[false]);setMessage('القراءة متاحة للمحاولة مجددًا.')}}>إتاحة القراءة مجددًا</Button><Button type="button" variant="ghost" onClick={refresh}>تحديث عداد الحفظ من القاعدة</Button></div><a className="inline-flex min-h-12 items-center underline" href="/evidence">قراءة دليل الطلبات والبيانات</a></main>};createRoot(document.getElementById('app')).render(<App/>);
 `,resolveDir:process.cwd(),loader:'tsx'},outfile:resolve(folder,'bundle.js'),bundle:true,platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'fixture-actions',setup(tool){
  tool.onResolve({filter:/^@\/lib\/actions\/admin-choices$/},()=>({path:'actions',namespace:'fixture'}))
  tool.onResolve({filter:/^next\/link$/},()=>({path:'link',namespace:'fixture'}))
  tool.onResolve({filter:/^@\//},args=>{const base=resolve('src',args.path.slice(2));return {path:[base,base+'.ts',base+'.tsx',base+'.mjs'].find(existsSync)}})
  tool.onLoad({filter:/.*/,namespace:'fixture'},args=>({resolveDir:process.cwd(),loader:'jsx',contents:args.path==='link'?`export default function Link({children,...props}){return <a {...props}>{children}</a>}`:`const call=async(op,args)=>fetch('/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({op,args})}).then(r=>r.json());export const searchAdminChoices=(...args)=>call('search',args);export const resolveAdminChoices=(...args)=>call('names',args);`}))
 }}]})
run(`begin;create schema ${schema};create table ${schema}.form_state(id int primary key,writes int not null default 0,title text not null,selection jsonb not null);insert into ${schema}.form_state values(1,0,'نموذج مكتمل وصالح للحفظ',${literal(JSON.stringify(ids.slice(0,3)))}::jsonb);${ids.slice(0,3).map((id,index)=>`insert into public.products(id,type,title,slug,price,is_published,archived_at) values('${id}','course',${literal(['كورس الفهم — سجل قديم','كتاب التمارين — نسخة مؤرشفة','جلسة وضوح — مسودة'][index])},'choice-qa-${id}',0,${index===0},${index===1?'now()':'null'});`).join('')}commit;`)
const cssRoot=resolve('dist/client/_next/static/css'),css=readFileSync(resolve(cssRoot,readdirSync(cssRoot).find(name=>name.endsWith('.css'))))
const evidence=()=>({scope:'component regression; injected permission and SQL adapter, not integrated acceptance',...state(),searchReads,nameReads,saveRequests})
server=createServer(async(req,res)=>{try{
 if(req.headers.host!==`127.0.0.1:${port}`||(req.headers.origin&&req.headers.origin!==`http://127.0.0.1:${port}`)){res.writeHead(403);res.end();return}
 res.setHeader('Cache-Control','no-store');const path=new URL(req.url,`http://127.0.0.1:${port}`).pathname
 if(path==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(readFileSync(resolve(folder,'bundle.js')));return}
 if(path==='/style.css'){res.setHeader('Content-Type','text/css');res.end(css);return}
 if(/^\/fonts\/[a-zA-Z0-9/_.-]+$/.test(path)&&!path.includes('..')){res.end(readFileSync(resolve('public',path.slice(1))));return}
 if(path==='/evidence'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(evidence(),null,2));return}
 if(path==='/api'&&req.method==='POST'){
  let body='';for await(const chunk of req){body+=chunk;if(body.length>50000)throw Error('Fixture request too large')}
  const {op,args=[]}=JSON.parse(body);let result
  if(op==='names')result=await choices.resolveAdminChoices(...args)
  else if(op==='search'){searchReads++;result=fault?{ok:false,error:'تعذّر تحميل الاختيارات. الاختيارات المحفوظة لم تتغير.'}:{ok:true,items:[{id:ids[0],label:'كورس الفهم — سجل قديم'}].filter(row=>row.label.includes(String(args[1]||''))),total:String(args[1]||'')&&!('كورس الفهم — سجل قديم'.includes(String(args[1])))?0:1,page:1,pageSize:25}}
  else if(op==='state')result=state()
  else if(op==='fault'){fault=args[0]===true;result={ok:true}}
  else if(op==='save'){saveRequests++;const input=args[0];if(typeof input?.title!=='string'||input.title.length<4||!Array.isArray(input.selection)||input.selection.some(id=>!ids.includes(id)))throw Error('Fixture save invalid');run(`update ${schema}.form_state set title=${literal(input.title)},selection=${literal(JSON.stringify(input.selection))}::jsonb,writes=writes+1 where id=1`);result={ok:true}}
  else throw Error('Unknown fixture operation')
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result));return
 }
 res.setHeader('Content-Type','text/html;charset=utf-8');res.end('<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><title>اختبار اختيارات الإدارة</title></head><body class="bg-cream text-ink"><div id="app"></div><script id="fixture-state" type="application/json">'+JSON.stringify(state()).replaceAll('<','\\u003c')+'</script><script src="/bundle.js"></script></body></html>')
}catch{res.writeHead(500);res.end('Component fixture unavailable; production untouched')}})
server.listen(port,'127.0.0.1',()=>console.log(`Component keyboard fixture: http://127.0.0.1:${port}; use stop + Enter for cleanup`))
function stop(){if(closed)return;closed=true;writeFileSync(resolve(folder,'last-evidence.json'),JSON.stringify(evidence(),null,2));server.close();run(`begin;delete from public.products where id in (${ids.slice(0,3).map(literal).join(',')});drop schema ${schema} cascade;commit;`);console.log('Scoped component fixtures removed; summary retained without credentials');process.exit(0)}
process.stdin.setEncoding('utf8');process.stdin.on('data',text=>{if(text.trim()==='stop')stop()});process.on('SIGINT',stop);process.on('SIGTERM',stop)
