import {getSupabasePublicConfig} from './public-config.mjs'
export function validateLaunchConfig(env) {
 const problems=[]
 if(env.HEBA_COST_MODE && !['free','allow-paid'].includes(env.HEBA_COST_MODE))problems.push('HEBA_COST_MODE must be free or allow-paid.')
 const https=(value)=>{try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&!['localhost','127.0.0.1'].includes(url.hostname)}catch{return false}}
 if(env.HEBA_DEPLOYMENT_ENV!=='production')problems.push('Set HEBA_DEPLOYMENT_ENV=production.')
 if(!https(env.NEXT_PUBLIC_SITE_URL))problems.push('Set the HTTPS NEXT_PUBLIC_SITE_URL.')
 if(!https(env.NEXT_PUBLIC_SUPABASE_URL))problems.push('Set the HTTPS NEXT_PUBLIC_SUPABASE_URL.')
 let key=''
 try {key=getSupabasePublicConfig(env).key}catch{/* Validation reports below. */}
 let publicKey=key.startsWith('sb_publishable_')
 if(!publicKey)try{publicKey=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString()).role==='anon'}catch{/* Not a public key. */}
 if(!publicKey)problems.push('Provide a Supabase publishable or anon key; never a server secret in NEXT_PUBLIC_*.')
 for(const [name,value]of Object.entries(env))if(name.startsWith('NEXT_PUBLIC_')&&String(value).startsWith('sb_secret_'))problems.push(`Remove the server secret from ${name}.`)
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.OWNER_ADMIN_EMAIL||''))problems.push('Set OWNER_ADMIN_EMAIL.')
 if(!(env.SUPABASE_SECRET_KEY||env.SUPABASE_SERVICE_ROLE_KEY))problems.push('Set the Supabase server credential.')
 if(!(env.RESEND_API_KEY&&env.RESEND_FROM_EMAIL))problems.push('Configure RESEND_API_KEY and verified RESEND_FROM_EMAIL for booking messages.')
 if(env.SEED_DEMO==='true'||env.HEBA_PREVIEW_ADMIN_PASSWORD||env.HEBA_PREVIEW_ADMIN_SESSION_SECRET)problems.push('Remove demo seeding and preview login values from the production environment.')
 const stream=[env.CLOUDFLARE_STREAM_ACCOUNT_ID,env.CLOUDFLARE_STREAM_API_TOKEN,env.CLOUDFLARE_STREAM_HOST]
 if(env.HEBA_COST_MODE!=='allow-paid'&&stream.some(Boolean))problems.push('Free operation refuses paid Stream credentials. Leave all Stream values empty.')
 if(stream.some(Boolean)&&!stream.every(Boolean))problems.push('Supply all three optional Stream values, or leave all empty.')
 if(stream.every(Boolean)&&(!/^[0-9a-f]{32}$/.test(stream[0])||!/^customer-[a-z0-9]+\.cloudflarestream\.com$/.test(stream[2])))problems.push('Check the Stream account ID and customer hostname.')
 return problems
}
