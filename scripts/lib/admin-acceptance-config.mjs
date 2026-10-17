import {copyFileSync,constants,existsSync,readFileSync} from 'node:fs'
import {parseEnv} from 'node:util'
import {createClient} from '@supabase/supabase-js'
import {getSupabasePublicConfig,SUPABASE_PUBLIC_ENV_NAMES} from '../public-config.mjs'
export const ENV_FILE='.env.admin-acceptance.local'
export const PRODUCTION_REF='zfbwpubsnuijybxjuidc'
export const ORIGIN='http://127.0.0.1:3170'
export function ensureAcceptanceEnv(){try{copyFileSync('docs/admin-acceptance.env.example',ENV_FILE,constants.COPYFILE_EXCL);return 'created'}catch(error){if(error.code==='EEXIST')return 'preserved';throw Error('LOCAL_ENV_CREATE_FAILED')}}
export function readAcceptanceEnv(){return existsSync(ENV_FILE)?parseEnv(readFileSync(ENV_FILE,'utf8')):{}}
export function projectRef(url){try{const u=new URL(url),ref=u.hostname.match(/^([a-z0-9]{20})\.supabase\.co$/)?.[1];if(!ref||ref===PRODUCTION_REF||u.protocol!=='https:'||u.username||u.password||u.port||u.pathname!=='/'||u.search||u.hash)throw Error();return ref}catch{throw Error('ISOLATED_PROJECT_REQUIRED')}}
export function acceptanceConfig(env=readAcceptanceEnv()){
 let publicConfig;try{publicConfig=getSupabasePublicConfig(env)}catch{throw Error('ISOLATED_PUBLIC_CONFIG_REQUIRED')}
 const {url,key}=publicConfig,ref=projectRef(url),secret=env.SUPABASE_SECRET_KEY?.trim()||env.SUPABASE_SERVICE_ROLE_KEY?.trim()
 if(!secret)throw Error('ISOLATED_SERVER_KEY_REQUIRED')
 if(key===secret||key.startsWith('sb_secret_'))throw Error('PUBLIC_KEY_MUST_NOT_BE_SERVER_SECRET')
 if(key.split('.').length===3){let claims;try{claims=JSON.parse(Buffer.from(key.split('.')[1],'base64url'))}catch{}if(claims?.role&&claims.role!=='anon')throw Error('PUBLIC_KEY_ROLE_MUST_BE_ANON')}
 if(env.HEBA_COST_MODE!=='free'||env.HEBA_DEPLOYMENT_ENV!=='staging'||env.NEXT_PUBLIC_SITE_URL!==ORIGIN)throw Error('FREE_LOOPBACK_STAGING_REQUIRED')
 if(['RESEND_API_KEY','RESEND_FROM_EMAIL','PROTECTED_UPLOAD_SCAN_URL','PROTECTED_UPLOAD_SCAN_TOKEN','CLOUDFLARE_STREAM_API_TOKEN'].some(name=>env[name]))throw Error('EXTERNAL_SIDE_EFFECT_PROVIDER_FORBIDDEN')
 const database=env.HEBA_ACCEPTANCE_DATABASE_URL||''
 if(database){const db=new URL(database);if(!['postgres:','postgresql:'].includes(db.protocol)||!(db.hostname===`db.${ref}.supabase.co`||(db.hostname.endsWith('.pooler.supabase.com')&&decodeURIComponent(db.username)===`postgres.${ref}`)))throw Error('DATABASE_PROJECT_MISMATCH')}
 return {env,ref,origin:ORIGIN,url:new URL(url).origin,key,secret,database,managementToken:env.SUPABASE_ACCESS_TOKEN||process.env.SUPABASE_ACCESS_TOKEN||''}
}
export function missingAcceptanceValues(env=readAcceptanceEnv()){
 const missing=[]
 if(!env[SUPABASE_PUBLIC_ENV_NAMES[0]])missing.push(SUPABASE_PUBLIC_ENV_NAMES[0])
 if(!env[SUPABASE_PUBLIC_ENV_NAMES[1]]&&!env[SUPABASE_PUBLIC_ENV_NAMES[2]])missing.push(`${SUPABASE_PUBLIC_ENV_NAMES[1]} أو ${SUPABASE_PUBLIC_ENV_NAMES[2]}`)
 if(!env.SUPABASE_SECRET_KEY&&!env.SUPABASE_SERVICE_ROLE_KEY)missing.push('SUPABASE_SECRET_KEY أو SUPABASE_SERVICE_ROLE_KEY')
 if(!env.HEBA_ACCEPTANCE_DATABASE_URL&&!env.SUPABASE_ACCESS_TOKEN&&!process.env.SUPABASE_ACCESS_TOKEN)missing.push('HEBA_ACCEPTANCE_DATABASE_URL أو جلسة Supabase CLI للتهيئة')
 return missing
}
export function provider(config,key=config.secret){return createClient(config.url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.any([AbortSignal.timeout(120000),...(config.signal?[config.signal]:[])])})}})}
export function safeFailure(error){return /^(?:[A-Z][A-Z0-9_]+)$/.test(error?.message||'')?error.message:'ACCEPTANCE_OPERATION_FAILED'}
