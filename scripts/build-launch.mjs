// Produces a real configured Worker. Does not deploy or mutate providers.
import {spawnSync} from 'node:child_process'
import {validateLaunchConfig} from './launch-config.mjs'
const problems=validateLaunchConfig(process.env)
if(problems.length){console.error(problems.join('\n'));process.exit(1)}
const env={...process.env,CLOUDFLARE_ENV:''}
// Server credentials belong to runtime Worker bindings, never build output.
for(const name of ['SUPABASE_SECRET_KEY','SUPABASE_SERVICE_ROLE_KEY','RESEND_API_KEY','RESEND_FROM_EMAIL','OWNER_ADMIN_EMAIL','CLOUDFLARE_STREAM_ACCOUNT_ID','CLOUDFLARE_STREAM_API_TOKEN','CLOUDFLARE_STREAM_HOST','PROTECTED_UPLOAD_SCAN_TOKEN','STAGING_ACCESS_PASSWORD','SENTRY_AUTH_TOKEN'])env[name]=''
const cli=process.env.npm_execpath
if(!cli)throw Error('Run this command through corepack pnpm build:launch.')
const result=spawnSync(process.execPath,[cli,'exec','vinext','build'],{env,stdio:'inherit'})
if(result.error)throw result.error
process.exit(result.status??1)
