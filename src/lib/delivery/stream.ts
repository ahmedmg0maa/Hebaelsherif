import 'server-only'
import { isFreeOperation } from '@/lib/operations/cost-mode'
export function streamConfigured(){return !isFreeOperation() && Boolean(/^[0-9a-f]{32}$/.test(process.env.CLOUDFLARE_STREAM_ACCOUNT_ID ?? '') && process.env.CLOUDFLARE_STREAM_API_TOKEN && /^customer-[a-z0-9]+\.cloudflarestream\.com$/.test(process.env.CLOUDFLARE_STREAM_HOST ?? ''))}
export function streamUid(path:string|null){return /^stream\/([0-9a-f]{32})$/.exec(path??'')?.[1]??null}
export async function streamRequest(path:string,init:RequestInit={}){
 if(!streamConfigured())throw Error('stream_not_configured')
 return fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_STREAM_ACCOUNT_ID}/stream${path}`,{...init,headers:{Authorization:`Bearer ${process.env.CLOUDFLARE_STREAM_API_TOKEN}`,...init.headers},signal:AbortSignal.timeout(15000),cache:'no-store'})
}
export async function signedStreamPlayer(uid:string){
 if(!/^[0-9a-f]{32}$/.test(uid))return null
 const response=await streamRequest(`/${uid}/token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({exp:Math.floor(Date.now()/1000)+4*60*60,downloadable:false})})
 if(!response.ok)return null
 const data=await response.json() as {success?:boolean;result?:{token?:string}}
 const token=data.result?.token
 if(!data.success || !token || !/^[A-Za-z0-9_.-]+$/.test(token) || token.length>16000)return null
 return `https://${process.env.CLOUDFLARE_STREAM_HOST}/${token}/iframe`
}
