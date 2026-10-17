// Read-only. Never applies migrations, grants a role, uploads files or sends mail.
import {createClient} from '@supabase/supabase-js'
import {validateLaunchConfig} from './launch-config.mjs'
const issues=validateLaunchConfig(process.env)
if(issues.length){console.error(issues.join('\n'));process.exit(1)}
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
const {data:contract,error}=await db.rpc('booking_runtime_contract')
if(error||contract?.coachWorkingHours!=='103'||contract?.coachCalendar!=='097'||contract?.customerJourney!=='093')throw Error('Booking database contract is not current. Apply the missing migrations in order.')
const {data:launch,error:launchError}=await db.rpc('launch_runtime_contract')
if(launchError||launch?.revision!=='102'||launch?.freeOperations!=='102')throw Error('Launch database revision 102 is missing. Apply missing migrations only, in order.')
let owner=null
for(let page=1;page<=100;page++){
 const {data,error}=await db.auth.admin.listUsers({page,perPage:1000});if(error)throw Error('Cannot verify owner identity.')
 owner=data.users.find(u=>u.email?.toLowerCase()===process.env.OWNER_ADMIN_EMAIL.trim().toLowerCase());if(owner||data.users.length<1000)break
}
if(!owner)throw Error('Run launch:owner once to prepare the owner identity.')
const [{data:enrollment,error:ownerError},{data:roles,error:roleError}]=await Promise.all([db.from('owner_password_access').select('enabled').eq('user_id',owner.id).maybeSingle(),db.from('admin_roles').select('role').eq('user_id',owner.id).eq('role','owner')])
if(ownerError||roleError||!enrollment?.enabled||!roles?.length)throw Error('Owner password entry is not enrolled.')
console.log('Read-only launch check passed: configured production, booking revision and enrolled owner. Still verify SMTP, mail sender, uploads, a real booking and optional Stream on the connected deployment.')
