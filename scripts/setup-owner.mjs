// Run locally with server environment configured. Password is never logged or saved.
import {createClient} from '@supabase/supabase-js'
import {createInterface} from 'node:readline/promises'
import {Writable} from 'node:stream'
const email=process.env.OWNER_ADMIN_EMAIL?.trim().toLowerCase()
const secret=process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
if(!email || !process.env.NEXT_PUBLIC_SUPABASE_URL || !secret) throw Error('Configure OWNER_ADMIN_EMAIL and Supabase server credentials in the local environment.')
if(!process.argv.includes('--apply')){console.log('Owner setup is ready. Review the project URL in your local environment, then run with --apply. No writes performed.');process.exit(0)}
const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,secret,{auth:{persistSession:false,autoRefreshToken:false}})
let user=null
for(let page=1;page<=100;page++){
 const {data,error}=await client.auth.admin.listUsers({page,perPage:1000});if(error)throw Error('Cannot read Auth users.')
 user=data.users.find(u=>u.email?.toLowerCase()===email)
 if(user || data.users.length<1000)break
}
if(!user){
 const {data:owners,error}=await client.from('admin_roles').select('user_id').eq('role','owner').limit(1)
 if(error || owners?.length)throw Error('Use the existing owner identity; setup will not grant a second owner.')
 if(!process.stdin.isTTY)throw Error('Run in an interactive terminal to enter the new owner password securely.')
 let muted=false
 const sink=new Writable({write(chunk,encoding,callback){if(!muted)process.stdout.write(chunk,encoding);callback()}})
 const rl=createInterface({input:process.stdin,output:sink,terminal:true})
 process.stdout.write('New owner password (hidden, at least 14 characters): ');muted=true
 const password=await rl.question('');process.stdout.write('\nConfirm password: ');const confirm=await rl.question('');muted=false;rl.close();process.stdout.write('\n')
 if(password!==confirm || password.length<14 || password.length>128)throw Error('Passwords must match and contain 14–128 characters.')
 const {data,error:createError}=await client.auth.admin.createUser({email,password,email_confirm:true})
 if(createError || !data.user)throw Error('Owner creation failed; no permission grant attempted.')
 user=data.user
}
if (!user.email_confirmed_at || (user.banned_until && Date.parse(user.banned_until)>Date.now())) throw Error('Confirm and enable the existing identity before enrollment. Setup does not bypass account restrictions.')
const {error}=await client.rpc('enroll_password_owner',{p_user:user.id})
if(error)throw Error('Owner enrollment failed. Check migration 096 and the existing owner identity; no credentials were printed.')
console.log('Owner password entry enabled. Existing password unchanged. Open /auth/admin after configuring OWNER_ADMIN_EMAIL on the Worker.')
