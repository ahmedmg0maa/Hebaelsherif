// No project creation, no production key requests, no .env.local reads.
import {spawnSync} from 'node:child_process'
import {readFileSync,writeFileSync} from 'node:fs'
import {ENV_FILE,PRODUCTION_REF,ensureAcceptanceEnv,readAcceptanceEnv,projectRef,missingAcceptanceValues} from './lib/admin-acceptance-config.mjs'
import {SUPABASE_PUBLIC_ENV_NAMES} from './public-config.mjs'
function cli(args){const r=spawnSync(process.platform==='win32'?'cmd.exe':'supabase',process.platform==='win32'?['/d','/c','supabase',...args]:args,{encoding:'utf8',timeout:30000,windowsHide:true,env:{...process.env}});if(r.status!==0)throw Error('CLI_READ_UNAVAILABLE');try{return JSON.parse(r.stdout)}catch{throw Error('CLI_RESPONSE_UNAVAILABLE')}}
const fileStatus=ensureAcceptanceEnv();let discovery='unavailable',testProjects=[]
try{
 const projects=cli(['projects','list','--output','json']);if(!Array.isArray(projects))throw Error()
 testProjects=projects.filter(row=>row.id!==PRODUCTION_REF&&/^[a-z0-9]{20}$/.test(row.id)).map(row=>row.id)
 const env=readAcceptanceEnv(),configured=env[SUPABASE_PUBLIC_ENV_NAMES[0]],ref=configured?projectRef(configured):null
 discovery=testProjects.length?'test_projects_available':'production_only'
 if(ref){
  if(!testProjects.includes(ref))throw Error('TEST_PROJECT_NOT_IN_CLI_ACCOUNT')
  const keys=cli(['projects','api-keys','--project-ref',ref,'--output','json']);if(!Array.isArray(keys))throw Error()
  const publicKey=keys.find(row=>row.type==='publishable')?.api_key||keys.find(row=>row.name==='anon')?.api_key
  const serverKey=keys.find(row=>row.type==='secret')?.api_key||keys.find(row=>row.name==='service_role')?.api_key
  const original=readFileSync(ENV_FILE,'utf8');let text=original
  const publicPresent=SUPABASE_PUBLIC_ENV_NAMES.slice(1).some(name=>env[name]?.trim()),serverPresent=env.SUPABASE_SECRET_KEY?.trim()||env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  const values={[SUPABASE_PUBLIC_ENV_NAMES[0]]:`https://${ref}.supabase.co`,[SUPABASE_PUBLIC_ENV_NAMES[1]]:publicPresent?undefined:publicKey,SUPABASE_SECRET_KEY:serverPresent?undefined:serverKey}
  for(const [name,value] of Object.entries(values)){if(!env[name]&&value&&!/[\r\n]/.test(value))text=text.replace(new RegExp(`^${name}=\\s*$`,'m'),()=>`${name}=${value}`)}
  // Preserve every existing non-empty value, comment and unrelated setting.
  if(readFileSync(ENV_FILE,'utf8')!==original)throw Error('LOCAL_ENV_CHANGED_DURING_DISCOVERY')
  if(text!==original)writeFileSync(ENV_FILE,text,{mode:0o600})
 }
}catch{discovery='unavailable_or_requires_test_project_selection'}
console.log(JSON.stringify({localFile:fileStatus,cliDiscovery:discovery,testProjectRefs:testProjects,missing:missingAcceptanceValues(),productionChanged:false,next:testProjects.length&&!readAcceptanceEnv()[SUPABASE_PUBLIC_ENV_NAMES[0]]?'ضعي رابط مشروع الاختبار المعتمد محليًا ثم أعيدي التجهيز لقراءة مفاتيحه؛ لا اختيار تلقائيًا.':testProjects.length?'شغلي فحص المراحل؛ نجاح الاتصال لا يعني جاهزية المخطط.':'أضيفي اتصال المشروع الاختباري محليًا؛ لا تستخدمي الإنتاج.'},null,2))
