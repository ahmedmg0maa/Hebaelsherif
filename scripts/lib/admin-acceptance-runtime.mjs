import {cpSync,existsSync,mkdirSync,readFileSync,mkdtempSync} from 'node:fs'
import {relative,basename,join} from 'node:path'
import {tmpdir} from 'node:os'
import {spawn,spawnSync} from 'node:child_process'
import {randomBytes} from 'node:crypto'
import {createServer} from 'node:net'
import {SUPABASE_PUBLIC_ENV_NAMES} from '../public-config.mjs'
import {ORIGIN,projectRef} from './admin-acceptance-config.mjs'
const portFree=()=>new Promise((done,reject)=>{const probe=createServer();probe.once('error',()=>reject(Error('LOCAL_ACCEPTANCE_PORT_BUSY')));probe.listen(3170,'127.0.0.1',()=>probe.close(done))})
export async function startAcceptanceApplication(config,ownerEmail,runId){
 if(config.origin!==ORIGIN||(!config.url&&(config.key||config.secret))||(config.url&&projectRef(config.url)!==config.ref))throw Error('ISOLATED_APP_CONFIGURATION_REQUIRED')
 await portFree()
 if(!/^[a-f0-9-]{36}$/.test(runId))throw Error('UNSAFE_BUILD_PATH')
 const root=process.cwd(),work=join(mkdtempSync(join(tmpdir(),'heba-admin-qa-')),'app')
 mkdirSync(work,{recursive:true})
 const sourceRoots=new Set(['src','public','patches'])
 const sourceFiles=new Set(['package.json','pnpm-lock.yaml','pnpm-workspace.yaml','next.config.ts','next-env.d.ts','tsconfig.json','postcss.config.mjs','eslint.config.mjs'])
 // Allow only application sources/assets/build configuration. In particular do
 // not mirror arbitrary local SQL exports, reports, customer backups or tools.
 const filter=path=>{const rel=relative(root,path),name=basename(path),top=rel.split(/[\\/]/)[0];return (sourceRoots.has(top)||sourceFiles.has(rel))&&!name.startsWith('.env')&&!/\.(dump|backup|zip|tgz|log|bak|bkp|sql|gz)$/i.test(name)}
 // Copy allowed entries separately: fs.cp rejects copying a root into one of
 // its own descendants even if a recursive filter excludes that descendant.
 for(const entry of [...sourceRoots,...sourceFiles])if(existsSync(join(root,entry)))cpSync(join(root,entry),join(work,entry),{recursive:true,filter})
 const basicUser='acceptance',basicPassword=randomBytes(32).toString('base64url'),env={PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,USERPROFILE:process.env.USERPROFILE,APPDATA:process.env.APPDATA,LOCALAPPDATA:process.env.LOCALAPPDATA,TEMP:process.env.TEMP,TMP:process.env.TMP,NODE_ENV:'production',HEBA_DEPLOYMENT_ENV:'staging',HEBA_COST_MODE:'free',NEXT_PUBLIC_SITE_URL:config.origin,OWNER_ADMIN_EMAIL:ownerEmail,STAGING_ACCESS_USER:basicUser,STAGING_ACCESS_PASSWORD:basicPassword,...Object.fromEntries(SUPABASE_PUBLIC_ENV_NAMES.map(name=>[name,''])),[SUPABASE_PUBLIC_ENV_NAMES[0]]:config.url,[SUPABASE_PUBLIC_ENV_NAMES[1]]:config.key,SUPABASE_SECRET_KEY:config.secret,SUPABASE_SERVICE_ROLE_KEY:'',RESEND_API_KEY:'',RESEND_FROM_EMAIL:'',PROTECTED_UPLOAD_SCAN_URL:'',PROTECTED_UPLOAD_SCAN_TOKEN:'',SENTRY_DSN:'',NEXT_PUBLIC_SENTRY_DSN:'',SENTRY_AUTH_TOKEN:'',NEXT_TELEMETRY_DISABLED:'1'}
 const cli=process.platform==='win32'?'cmd.exe':'corepack',prefix=process.platform==='win32'?['/d','/c','corepack','pnpm']:['pnpm']
 env.CI='1'
 // Use pnpm's existing package cache without inheriting application credentials
 // or linking node_modules outside Turbopack's filesystem root.
 const install=['install','--prod=false','--frozen-lockfile','--ignore-scripts','--prefer-offline']
 const invoke=args=>{const r=spawnSync(cli,[...prefix,...args],{cwd:work,env,encoding:'utf8',windowsHide:true,timeout:600000,maxBuffer:16*1024*1024});if(r.status!==0)throw Error(args[0]==='install'?'ISOLATED_APP_INSTALL_FAILED':'ISOLATED_APP_BUILD_FAILED')}
 invoke(install)
 invoke(['exec','next','build'])
 if(config.signal?.aborted)throw Error('ACCEPTANCE_INTERRUPTED')
 await portFree()
 const next=join(work,'node_modules/next/dist/bin/next'),child=spawn(process.execPath,[next,'start','--hostname','127.0.0.1','--port','3170'],{cwd:work,env,windowsHide:true,stdio:['ignore','pipe','pipe']})
 let spawnFailed=false;child.on('error',()=>{spawnFailed=true})
 child.stdout.on('data',()=>{});child.stderr.on('data',()=>{/* No raw provider/body/credential logs exported. */})
 const basic=Buffer.from(`${basicUser}:${basicPassword}`).toString('base64'),deadline=Date.now()+60000
 try{while(true){if(spawnFailed||child.exitCode!==null)throw Error('ISOLATED_APP_EXITED');let r;try{r=await fetch(config.origin+'/auth/admin',{headers:{Authorization:'Basic '+basic},signal:AbortSignal.timeout(2000)})}catch{/* startup, bounded retry */}if(r?.ok){const denied=await fetch(config.origin+'/auth/admin',{signal:AbortSignal.timeout(2000)});if(denied.status!==401)throw Error('ISOLATED_STAGING_GATE_IDENTITY_FAILED');break}if(Date.now()>deadline)throw Error('ISOLATED_APP_START_TIMEOUT');await new Promise(done=>setTimeout(done,300))}
  return {basic,manifest:JSON.parse(readFileSync(join(work,'.next/server/server-reference-manifest.json'),'utf8')),stop:async()=>{child.kill();await new Promise(done=>{if(child.exitCode!==null)return done();child.once('exit',done);setTimeout(done,5000).unref()})}}
 }catch(error){child.kill();throw error}
}
