// Read-only preflight. Never loads .env.local or prints provider keys/connection strings.
import {existsSync,readFileSync} from 'node:fs'
import {parseEnv} from 'node:util'
import {createClient} from '@supabase/supabase-js'
import {getSupabasePublicConfig} from './public-config.mjs'
const path='.env.admin-acceptance.local',production='zfbwpubsnuijybxjuidc'
if(!existsSync(path)){console.log('BLOCKED: isolated connection missing; copy docs/admin-acceptance.env.example to .env.admin-acceptance.local and fill locally. Production is unchanged.');process.exitCode=2}
else{
 try{
  const env=parseEnv(readFileSync(path,'utf8')),publicConfig=getSupabasePublicConfig(env),url=new URL(publicConfig.url),match=url.hostname.match(/^([a-z0-9]{20})\.supabase\.co$/),ref=match?.[1]
  if(!ref||ref===production||url.protocol!=='https:'||url.username||url.password||url.port||url.pathname!=='/'||url.search||url.hash)throw Error('ISOLATED_PROJECT_REQUIRED')
  const anon=publicConfig.key,secret=env.SUPABASE_SECRET_KEY||env.SUPABASE_SERVICE_ROLE_KEY
  if(!anon||!secret)throw Error('ISOLATED_KEYS_REQUIRED')
  if(env.HEBA_COST_MODE!=='free'||env.HEBA_DEPLOYMENT_ENV!=='staging'||env.NEXT_PUBLIC_SITE_URL!=='http://127.0.0.1:3170')throw Error('FREE_STAGING_LOOPBACK_REQUIRED')
  if(['RESEND_API_KEY','PROTECTED_UPLOAD_SCAN_URL','PROTECTED_UPLOAD_SCAN_TOKEN'].some(name=>env[name]))throw Error('EXTERNAL_SIDE_EFFECT_PROVIDER_FORBIDDEN')
  if(!env.HEBA_ACCEPTANCE_DATABASE_URL&&!env.SUPABASE_ACCESS_TOKEN)throw Error('SCHEMA_SETUP_CONNECTION_REQUIRED')
  if(env.HEBA_ACCEPTANCE_DATABASE_URL){const db=new URL(env.HEBA_ACCEPTANCE_DATABASE_URL);if(!['postgres:','postgresql:'].includes(db.protocol)||!((db.hostname===`db.${ref}.supabase.co`)||(db.hostname.endsWith('.pooler.supabase.com')&&decodeURIComponent(db.username)===`postgres.${ref}`)))throw Error('DATABASE_PROJECT_MISMATCH')}
  const response=await fetch(url.origin+'/auth/v1/settings',{headers:{apikey:anon},signal:AbortSignal.timeout(15000)})
  if(!response.ok)throw Error(`PROVIDER_HTTP_${response.status}`)
  const service=createClient(url.origin,secret,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(15000)})}})
  const {data:rows,error:readError}=await service.from('pages').select('id').limit(1)
  if(readError||!Array.isArray(rows))throw Error('POSTGREST_RESPONSE_INVALID')
  const {data:buckets,error:storageError}=await service.storage.listBuckets()
  if(storageError||!Array.isArray(buckets))throw Error('STORAGE_RESPONSE_INVALID')
  console.log(JSON.stringify({status:'PREFLIGHT_ONLY',isolatedProject:ref,authReachable:true,postgrestReachable:true,storageReachable:true,bucketCount:buckets.length,productionTouched:false,integratedAcceptance:'NOT_RUN'},null,2))
 }catch(error){const code=/^(?:ISOLATED_\w+|FREE_STAGING_LOOPBACK_REQUIRED|EXTERNAL_SIDE_EFFECT_PROVIDER_FORBIDDEN|SCHEMA_SETUP_CONNECTION_REQUIRED|DATABASE_PROJECT_MISMATCH|PROVIDER_HTTP_\d+|POSTGREST_RESPONSE_INVALID|STORAGE_RESPONSE_INVALID)$/.test(error.message)?error.message:'ISOLATED_PREFLIGHT_UNAVAILABLE';console.log(`BLOCKED: ${code}. No schema or data writes performed; no credentials logged.`);process.exitCode=2}
}
