import {encodeReply} from 'react-server-dom-webpack/client'
import {createServerClient} from '@supabase/ssr'
import {createHmac} from 'node:crypto'
import {projectRef} from './admin-acceptance-config.mjs'
export function totp(secret,time=Date.now()){
 let bits='';for(const char of secret.toUpperCase().replaceAll('=','')){const n='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(char);if(n<0)throw Error('TOTP_SECRET_INVALID');bits+=n.toString(2).padStart(5,'0')}
 const key=Buffer.from(bits.match(/.{8}/g).map(byte=>parseInt(byte,2))),counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(time/30000)))
 const digest=createHmac('sha1',key).update(counter).digest(),offset=digest.at(-1)&15
 return String((digest.readUInt32BE(offset)&0x7fffffff)%1000000).padStart(6,'0')
}
export function decodeAction(text){
 const rows=new Map();for(const line of text.split('\n')){const m=line.match(/^([a-f0-9]+):(.*)$/);if(m){try{rows.set(m[1],JSON.parse(m[2]))}catch{/* Flight module/text rows are not action results. */}}}
 let value=rows.get('0')?.a
 for(let n=0;typeof value==='string'&&/^\$@?[a-f0-9]+$/.test(value)&&n<8;n++)value=rows.get(value.replace(/^\$@?/,''))
 if(!value||typeof value!=='object'||value.digest)throw Error('APP_ACTION_PROTOCOL_INVALID')
 return value
}
export function applicationClient({config,manifest,basic}){
 projectRef(config.url)
 const appUrl=new URL(config.origin);if(appUrl.protocol!=='http:'||appUrl.hostname!=='127.0.0.1'||!['3170','3172'].includes(appUrl.port)||appUrl.username||appUrl.password||appUrl.pathname!=='/'||appUrl.search||appUrl.hash)throw Error('APP_ORIGIN_VIOLATION')
 const jar=new Map(),cookieFlags=[]
 function capture(response){for(const cookie of response.headers.getSetCookie()){const pair=cookie.split(';')[0],i=pair.indexOf('='),name=pair.slice(0,i),value=pair.slice(i+1);if(/max-age=0(?:;|$)/i.test(cookie)||!value)jar.delete(name);else jar.set(name,value);if(name==='heba_admin_session_v2')cookieFlags.push(cookie.toLowerCase().split(';').slice(1).map(x=>x.trim()))}}
 const auth=createServerClient(config.url,config.key,{global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.any([AbortSignal.timeout(120000),...(config.signal?[config.signal]:[])])})},cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:values=>values.forEach(({name,value})=>value?jar.set(name,value):jar.delete(name))}})
 async function request(path,options={}){
  if(!path.startsWith('/')||path.startsWith('//')||new URL(path,config.origin).origin!==config.origin)throw Error('APP_ORIGIN_VIOLATION')
  let response;try{response=await fetch(config.origin+path,{...options,redirect:'manual',headers:{Authorization:'Basic '+basic,Origin:config.origin,Cookie:[...jar].map(([name,value])=>`${name}=${value}`).join('; '),'User-Agent':'Heba isolated acceptance',...options.headers},signal:AbortSignal.any([AbortSignal.timeout(90000),...(config.signal?[config.signal]:[])])})}catch{throw Error('APP_NETWORK_UNAVAILABLE')}capture(response);return response
 }
 async function action(file,name,path,args=[]){
  const found=Object.entries(manifest.node).filter(([,row])=>row.filename?.replaceAll('\\','/')===`src/lib/actions/${file}.ts`&&row.exportedName===name)
  if(found.length!==1)throw Error('APP_ACTION_NOT_IN_BUILD')
  const body=await encodeReply(args),response=await request(path,{method:'POST',body,headers:{'Next-Action':found[0][0],Accept:'text/x-component',...(typeof body==='string'?{'Content-Type':'text/plain;charset=UTF-8'}:{})}})
  if(!response.ok)throw Error('APP_ACTION_HTTP_'+response.status)
  return decodeAction(await response.text())
 }
 async function login(account){
  const result=await action('auth',account.role==='owner'?'ownerPasswordLogin':'adminPasswordLogin','/auth/admin',account.role==='owner'?[account.password]:[account.email,account.password])
  if(!result.ok)throw Error('APPLICATION_LOGIN_REJECTED')
  if(account.role!=='owner'){
   if(!result.needsMfa)throw Error('STAFF_MFA_NOT_REQUIRED')
   const before=await request('/admin/overview');if(before.status===200)throw Error('STAFF_AAL1_ADMIN_ACCESS')
   // Real GoTrue enrollment/verification, two distinct factors, same Auth session.
   for(let n=0;n<2;n++){
    const enrolled=await auth.auth.mfa.enroll({factorType:'totp',friendlyName:`QA factor ${n+1}`});if(enrolled.error)throw Error('REAL_MFA_ENROLL_FAILED')
    const challenge=await auth.auth.mfa.challenge({factorId:enrolled.data.id});if(challenge.error)throw Error('REAL_MFA_CHALLENGE_FAILED')
    const verified=await auth.auth.mfa.verify({factorId:enrolled.data.id,challengeId:challenge.data.id,code:totp(enrolled.data.totp.secret)});if(verified.error)throw Error('REAL_MFA_VERIFY_FAILED')
   }
   await auth.auth.refreshSession()
   const session=await action('admin-auth-session','establishAdminSession','/auth/admin/mfa');if(!session.ok)throw Error('APPLICATION_MFA_SESSION_FAILED')
  }else if(result.needsMfa)throw Error('OWNER_PASSWORD_ASSURANCE_FAILED')
  if(!jar.has('heba_admin_session_v2'))throw Error('APPLICATION_SESSION_COOKIE_MISSING')
  const flags=cookieFlags.at(-1);if(!flags?.includes('httponly')||!flags.includes('samesite=lax')||!flags.includes('secure'))throw Error('ADMIN_COOKIE_FLAGS_INVALID')
  return result
 }
 return {auth,request,action,login,cookieFlags}
}
