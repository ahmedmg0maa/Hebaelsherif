// Produces a real configured Worker. Does not deploy or mutate providers.
import {spawnSync,execFileSync} from 'node:child_process'
import {rmSync,mkdirSync,writeFileSync} from 'node:fs'
import {validateLaunchConfig} from './launch-config.mjs'
const problems=validateLaunchConfig(process.env)
if(problems.length){console.error(problems.join('\n'));process.exit(1)}
const env={...process.env,CLOUDFLARE_ENV:'',CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV:'false'}
// The Vite plugin otherwise copies .env.local secrets into dist/server/.dev.vars,
// independently of the redacted process environment passed to the build.
rmSync('dist/server/.dev.vars',{force:true})
// Server credentials belong to runtime Worker bindings, never build output.
for(const name of ['SUPABASE_SECRET_KEY','SUPABASE_SERVICE_ROLE_KEY','RESEND_API_KEY','RESEND_FROM_EMAIL','OWNER_ADMIN_EMAIL','CLOUDFLARE_STREAM_ACCOUNT_ID','CLOUDFLARE_STREAM_API_TOKEN','CLOUDFLARE_STREAM_HOST','PROTECTED_UPLOAD_SCAN_TOKEN','STAGING_ACCESS_PASSWORD','SENTRY_AUTH_TOKEN'])env[name]=''
const cli=process.env.npm_execpath
if(!cli)throw Error('Run this command through corepack pnpm build:launch.')
const result=spawnSync(process.execPath,[cli,'exec','vinext','build'],{env,stdio:'inherit'})
if(result.error)throw result.error
if(result.status!==0)process.exit(result.status??1)
// Public provenance for verifying which source is actually on the domain.
// This contains Git/build metadata only, never provider configuration.
const git=args=>execFileSync('git',args,{encoding:'utf8'}).trim()
mkdirSync('dist/client/.well-known',{recursive:true})
writeFileSync('dist/client/.well-known/heba-release.json',JSON.stringify({
 commit:git(['rev-parse','HEAD']),branch:git(['branch','--show-current']),
 sourceDirty:Boolean(git(['status','--porcelain','--untracked-files=normal'])),
 builtAt:new Date().toISOString(),
},null,2)+'\n')
const isolation=spawnSync(process.execPath,['scripts/verify-build-secrets.mjs'],{env:process.env,stdio:'inherit'})
if(isolation.error)throw isolation.error
process.exit(isolation.status??1)
