import {mkdirSync,writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {randomUUID} from 'node:crypto'
import {inspectAcceptance} from './check-admin-acceptance-environment.mjs'
import {acceptanceConfig,ensureAcceptanceEnv,provider,safeFailure} from './lib/admin-acceptance-config.mjs'
import {acceptanceDatabase,literal} from './lib/admin-acceptance-db.mjs'
import {initializeSchema} from './lib/admin-acceptance-schema.mjs'
import {seedFixtures,cleanupFixtures} from './lib/admin-acceptance-fixtures.mjs'
import {startAcceptanceApplication} from './lib/admin-acceptance-runtime.mjs'
import {acceptanceCases,CASE_IDS} from './lib/admin-acceptance-cases.mjs'

// No .env.local fallback. Passwords, MFA secrets, tokens and cookies stay in RAM.
ensureAcceptanceEnv()
const report={id:randomUUID(),startedAt:new Date().toISOString(),stages:[],cases:[],productionChanged:false,browserAcceptance:'NOT_RUN',workerParity:'NOT_RUN',status:'blocked'}
let config,query,service,fixture,runtime
const interruption=new AbortController()
const interrupt=()=>interruption.abort()
process.once('SIGINT',interrupt);process.once('SIGTERM',interrupt)
const cleanupId=process.argv.find(arg=>arg.startsWith('--cleanup='))?.slice(10)
const phase=(id,status,code)=>report.stages.push({id,status,...(code?{code}:{})})
try{
 config=acceptanceConfig();config.signal=interruption.signal;query=acceptanceDatabase(config);service=provider(config)
 if(cleanupId){
  if(!/^[a-f0-9-]{36}$/.test(cleanupId))throw Error('CLEANUP_RUN_INVALID')
  const rows=await query(`select manifest from heba_acceptance_control.runs where id=${literal(cleanupId)}`,{readOnly:true})
  if(!rows[0]?.manifest)throw Error('CLEANUP_RUN_NOT_FOUND')
  report.cleanup=await cleanupFixtures(config,query,service,rows[0].manifest);report.status='cleanup_completed';phase('cleanup','passed')
 }else{
  report.environment=await inspectAcceptance({config,client:service,query})
  if(report.environment.stages.some(s=>['failed','blocked'].includes(s.status)))throw Error('ENVIRONMENT_STAGE_BLOCKED')
  phase('connection','passed')
  report.schema=await initializeSchema(config,query,{apply:process.argv.includes('--prepare')})
  if(report.schema.missing.length&&!process.argv.includes('--prepare'))throw Error('TEST_SCHEMA_PREPARATION_REQUIRED')
  phase('schema_definitions','passed')
  try{fixture=await seedFixtures(config,query,service)}catch(error){if(error.fixtureManifest)fixture={manifest:error.fixtureManifest,accounts:[]};throw error}
  phase('synthetic_accounts_and_data','passed');report.fixtureRun=fixture.manifest.id
  runtime=await startAcceptanceApplication(config,fixture.accounts[0].email,fixture.manifest.id)
  phase('isolated_application','passed')
  await acceptanceCases({config,query,service,fixture,runtime,report})
  report.status='http_integration_passed_browser_pending'
 }
}catch(error){report.failure=interruption.signal.aborted?'ACCEPTANCE_INTERRUPTED':safeFailure(error);if(!config)report.environment=await inspectAcceptance();report.status=report.cases.some(row=>row.classification==='behavioral_failure')?'failed':'blocked';phase(config?'execution':'configuration',report.status,report.failure);process.exitCode=2}
finally{
 if(config)config.signal=undefined // Cleanup needs its own live transport after an interrupt.
 try{await runtime?.stop()}catch{phase('application_stop','failed','LOCAL_APP_STOP_NOT_CONFIRMED');process.exitCode=2}
 if(fixture){try{report.cleanup=await cleanupFixtures(config,query,service,fixture.manifest);phase('cleanup','passed')}catch(error){phase('cleanup','failed',safeFailure(error));report.cleanupRun=fixture.manifest.id;report.status='cleanup_required';process.exitCode=2}}
 if(!cleanupId)for(const id of CASE_IDS)if(!report.cases.some(row=>row.id===id))report.cases.push({id,status:'not_run',reason:report.failure??'PRIOR_CASE_OR_STAGE_FAILED'})
 report.finishedAt=new Date().toISOString()
 const folder=resolve('.launch-tools/admin-acceptance/reports');mkdirSync(folder,{recursive:true})
 const path=resolve(folder,report.id+'.json');writeFileSync(path,JSON.stringify(report,null,2)+'\n',{mode:0o600})
 console.log(JSON.stringify({...report,reportPath:path},null,2))
 process.removeListener('SIGINT',interrupt);process.removeListener('SIGTERM',interrupt)
}
